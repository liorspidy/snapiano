/*
 * Real-time input for play-along. Everything runs on the device; no audio leaves it.
 *
 *  - MIDI: note-on messages from a digital piano (Web MIDI here; Android MIDI API in the app).
 *    Notes struck within 120 ms count as one chord.
 *  - Microphone: "score-informed" checking. We already know which notes should sound now, so
 *    after each attack we ask, for each expected note, whether its harmonics rose clearly and
 *    more than those of the neighbouring notes. Same algorithm and thresholds as
 *    listening/listen_check.py, which was evaluated on real piano samples with room echo and
 *    noise (about 89% of correct notes accepted, 93% of wrong notes caught, decision ~190 ms
 *    after the key is struck).
 *
 * Pure Web Audio API: the same code runs in the React Native app on react-native-audio-api
 * (MIT, Web Audio compatible, microphone supported).
 */
(function (global) {
  const N = 8192, HARM = 8;
  const T = { minDb: 4.0, near: 1.5, far: 0.5, odd: 0.45, lower: 0.6 };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const median = (a) => { const b = Array.from(a).sort((x, y) => x - y); return b[b.length >> 1]; };

  function harmonicBins(notes, sr) {
    const s = new Set();
    notes.forEach((m) => {
      for (let h = 1; h <= HARM; h++) {
        const b = Math.round(hz(m) * h * N / sr);
        for (let k = b - 2; k <= b + 2; k++) s.add(k);
      }
    });
    return s;
  }

  function gain(s0, s1, sr, floor, broad, m, oddOnly, skip) {
    let total = 0, weight = 0;
    for (let h = 1; h <= HARM; h++) {
      if (oddOnly && h % 2 === 0) continue;
      const f = hz(m) * h; if (f > 6000) break;
      const i = Math.round(f * N / sr); if (i >= s1.length - 8 || i < 8) continue;
      if (skip && skip.has(i)) continue;
      let j = i - 1; for (let k = i; k <= i + 1; k++) if (s1[k] > s1[j]) j = k;
      const after = s1[j], before = Math.max(s0[i - 1], s0[i], s0[i + 1]);
      let side = 0; for (let k = 4; k <= 7; k++) side += s1[j - k] + s1[j + k]; side /= 8;
      const w = 1 / Math.sqrt(h); weight += w;
      if (after > floor + 12 && after - side > 6) total += w * Math.min(30, Math.max(0, after - before - broad));
    }
    return weight ? total / weight : 0;
  }

  /** before/after: dB spectra (N/2 bins) just before and just after an attack. */
  function checkNotes(s0, s1, sr, expected) {
    const lo = Math.round(80 * N / sr), hi = Math.round(5000 * N / sr);
    const floor = median(s1.subarray(lo, hi));
    const rise = new Float32Array(hi - lo);
    for (let k = lo; k < hi; k++) rise[k - lo] = Math.max(0, s1[k] - s0[k]);
    const broad = median(rise);
    const g = (m, odd = false, skip = null) => gain(s0, s1, sr, floor, broad, m, odd, skip);
    const shared = harmonicBins(expected, sr), found = [];
    for (const m of expected) {
      const d = g(m);
      const near = [m - 1, m + 1].filter((n) => !expected.includes(n)).map((n) => g(n, false, shared));
      const far = [m - 2, m + 2].filter((n) => !expected.includes(n)).map((n) => g(n, false, shared));
      const lower = expected.includes(m - 12) ? 0 : g(m - 12, true, shared);
      if (d > T.minDb && near.every((r) => d > r + T.near) && far.every((r) => d > r + T.far)
          && g(m, true) > T.odd * d && lower < T.lower * d) found.push(m);
    }
    let guess = null;
    if (found.length < expected.length) {
      let best = -1;
      for (let m = 36; m <= 96; m++) { const sc = g(m) + g(m, true); if (sc > best) { best = sc; guess = m; } }
    }
    return { ok: found.length === expected.length, found, guess };
  }

  class Listener {
    constructor({ onNote, onLevel } = {}) {
      this.onNote = onNote || (() => {});   // (midi, source) => void
      this.onLevel = onLevel || (() => {});
      this.expected = [];
    }

    expect(midis) { this.expected = midis.slice(); }

    async connectMidi() {
      if (!navigator.requestMIDIAccess) throw new Error('MIDI is not supported in this browser');
      const access = await navigator.requestMIDIAccess();
      const bind = (input) => {
        input.onmidimessage = (e) => {
          const [status, note, vel] = e.data;
          if ((status & 0xf0) === 0x90 && vel > 0) this.onNote(note, 'midi');
        };
      };
      access.inputs.forEach(bind);
      access.onstatechange = (e) => { if (e.port.type === 'input' && e.port.state === 'connected') bind(e.port); };
      return [...access.inputs.values()].map((i) => i.name);
    }

    async connectMic() {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.sr = this.ctx.sampleRate;
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.big = this.ctx.createAnalyser(); this.big.fftSize = N; this.big.smoothingTimeConstant = 0;
      this.small = this.ctx.createAnalyser(); this.small.fftSize = 2048; this.small.smoothingTimeConstant = 0;
      src.connect(this.big); src.connect(this.small);
      this.bigBuf = new Float32Array(this.big.frequencyBinCount);
      this.smallBuf = new Float32Array(this.small.frequencyBinCount);
      this.prevSmall = null; this.fluxHist = []; this.history = []; this.pending = null;
      this._timer = setInterval(() => this._tick(), 10);
    }

    stop() {
      clearInterval(this._timer);
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      if (this.ctx) this.ctx.close();
    }

    _tick() {
      this.big.getFloatFrequencyData(this.bigBuf);
      const snap = Float32Array.from(this.bigBuf, (v) => Math.max(-160, v));
      this.history.push(snap); if (this.history.length > 60) this.history.shift();

      this.small.getFloatFrequencyData(this.smallBuf);
      let flux = 0, level = -160;
      if (this.prevSmall) {
        for (let k = 5; k < 700; k++) {
          const v = Math.max(-140, this.smallBuf[k]);
          flux += Math.max(0, v - this.prevSmall[k]); level = Math.max(level, v);
        }
      }
      this.prevSmall = Float32Array.from(this.smallBuf, (v) => Math.max(-140, v));
      this.onLevel(Math.max(0, Math.min(1, (level + 100) / 70)));
      const thr = this.fluxHist.length > 10 ? median(this.fluxHist.slice(-40)) * 2.5 + 40 : 1e9;
      this.fluxHist.push(flux); if (this.fluxHist.length > 200) this.fluxHist.shift();

      if (!this.pending && flux > thr) {
        // attack: keep the spectrum from just before it; decide once the window holds the new sound
        const before = this.history.length > 4 ? this.history[this.history.length - 4] : snap;
        this.pending = { before, at: this.ctx.currentTime + N / this.sr + 0.02 };
      }
      if (this.pending && this.ctx.currentTime >= this.pending.at) {
        const want = this.expected.slice();
        const r = want.length ? checkNotes(this.pending.before, snap, this.sr, want) : { found: [], guess: null };
        this.pending = null;
        r.found.forEach((m) => this.onNote(m, 'mic'));
        if (r.found.length < want.length && r.guess != null && !want.includes(r.guess)) this.onNote(r.guess, 'mic');
      }
    }
  }

  global.PlayAlongListener = Listener;
  global.checkNotes = checkNotes;
})(typeof window !== 'undefined' ? window : globalThis);
