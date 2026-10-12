// Plays the piano with the Web Audio API (react-native-audio-api). Needs a development build:
// in Expo Go the native module is missing, so everything below silently does nothing.
// Sampled piano (assets/piano, Salamander, one file per minor third, pitch-shifted between them); a synthesized tone
// plays until the samples are decoded or if decoding fails.
//
// Graph, like a mixer channel with a post-fader aux send:
//   notes -> volume fader -+-> master -> limiter -> output
//                          +-> reverb send -> high-pass -> reverb -> return -> master
// Volume 0 silences both; the reverb slider only scales the wet signal, never the piano's own level.
import { SAMPLES } from '../../assets/piano/samples';
import { limiterCurve } from './audioMath';

export const mix = { volume: 0.5, reverb: 0.5 };
let fader: any = null;
let send: any = null;
const applyMix = () => {
  if (fader) fader.gain.value = mix.volume * 0.9;
  if (send) send.gain.value = mix.reverb * 1.4;
};
export function setMix(part: Partial<typeof mix>) {
  Object.assign(mix, part);
  applyMix();
}

const NOTE_GAIN = 0.5; // headroom: chords add up, and the output must stay below 1.0 (see audioMath.ts)
const MAX_VOICES = 32;
type Voice = { midi: number; src: any; gain: any; end: number };
let voices: Voice[] = [];

let ctx: any = null;
const buffers: Record<number, any> = {};
let unavailable = false;

function context() {
  if (ctx || unavailable) return ctx;
  try {
    const { AudioContext } = require('react-native-audio-api');
    ctx = new AudioContext();
    fader = ctx.createGain();
    const master = ctx.createGain();
    const pre = ctx.createGain();
    pre.gain.value = 0.5; // the curve covers -2..2, so peaks up to twice full scale are rounded off, not cut
    const limiter = ctx.createWaveShaper();
    limiter.curve = limiterCurve(2);
    fader.connect(master);
    master.connect(pre);
    pre.connect(limiter);
    limiter.connect(ctx.destination);

    send = ctx.createGain();
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 200; // keeps the bass out of the reverb so it doesn't get muddy
    const verb = ctx.createConvolver();
    verb.normalize = false;
    verb.buffer = roomImpulse(ctx);
    const ret = ctx.createGain();
    ret.gain.value = 0.5;
    fader.connect(send);
    send.connect(lowCut);
    lowCut.connect(verb);
    verb.connect(ret);
    ret.connect(master);
    // ponytail: workaround for react-native-audio-api 0.13 ConvolverNode: once all its inputs go idle it schedules a
    // self-stop that a new note doesn't cancel, so the reverb dropped out "sometimes". A silent source that never stops
    // keeps one input enabled forever. Remove when the library fixes ConvolverNode.onInputDisabled.
    const keepAlive = ctx.createConstantSource();
    keepAlive.offset.value = 0;
    keepAlive.connect(send);
    keepAlive.start();
    applyMix();
    for (const [midi, asset] of Object.entries(SAMPLES))
      ctx.decodeAudioData(asset).then((b: any) => (buffers[+midi] = b)).catch(() => {});
  } catch {
    unavailable = true;
  }
  return ctx;
}

// Small room, mono, 0.7 s: decaying noise whose highs die faster than its lows (a one-pole low-pass that closes
// from ~8 kHz to ~1.5 kHz), after 15 ms of pre-delay. Scaled to unit energy, so the level is exactly send * return.
function roomImpulse(c: any) {
  const rate = c.sampleRate;
  const impulse = c.createBuffer(1, Math.floor(rate * 0.7), rate);
  const data = impulse.getChannelData(0);
  const delay = Math.floor(rate * 0.015);
  let smooth = 0;
  let energy = 0;
  for (let i = delay; i < data.length; i++) {
    const t = (i - delay) / (data.length - delay);
    const cutoff = 8000 * Math.pow(1500 / 8000, t);
    const k = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
    smooth += k * (Math.random() * 2 - 1 - smooth);
    data[i] = smooth * Math.pow(1 - t, 3);
    energy += data[i] * data[i];
  }
  const scale = 1 / Math.sqrt(energy || 1);
  for (let i = 0; i < data.length; i++) data[i] *= scale;
  return impulse;
}

// Builds the audio graph and decodes the samples ahead of the first note (called when the practice screen opens).
export const warmUp = () => void context();

// The audio clock in seconds, for scheduling notes ahead of time (practice play loop). Falls back to the system clock
// when there is no audio (Expo Go), so the cursor still moves.
export const audioTime = (): number => context()?.currentTime ?? performance.now() / 1000;

// Fades a voice out quickly, like a piano damper.
function damp(v: Voice, when: number) {
  v.gain.gain.cancelAndHoldAtTime(when);
  v.gain.gain.setTargetAtTime(0, when, 0.01);
  v.src.stop(when + 0.06);
  v.end = when + 0.06;
}

// Plays `midi` for `seconds`, starting at audio time `when` (default: now).
export function playNote(midi: number, seconds: number, when?: number) {
  const c = context();
  if (!c) return;
  const t = Math.max(when ?? 0, c.currentTime);
  const hold = Math.min(Math.max(seconds, 0.25), 2.5);
  voices = voices.filter((v) => v.end > c.currentTime);
  for (const v of voices) if (v.midi === midi && v.end > t) damp(v, t);
  if (voices.length >= MAX_VOICES) damp(voices[0], t);

  const root = Object.keys(buffers).map(Number).reduce((best, m) => (Math.abs(m - midi) < Math.abs(best - midi) ? m : best), -999);
  const gain = c.createGain();
  gain.connect(fader);
  const src = buffers[root] ? c.createBufferSource() : c.createOscillator();
  const level = buffers[root] ? NOTE_GAIN : NOTE_GAIN * 0.5;
  if (buffers[root]) {
    src.buffer = buffers[root];
    src.playbackRate.value = Math.pow(2, (midi - root) / 12);
    gain.gain.setValueAtTime(level, t);
  } else {
    src.type = 'triangle';
    src.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.01);
  }
  gain.gain.setValueAtTime(level, t + hold);
  gain.gain.linearRampToValueAtTime(0.0001, t + hold + 0.25);
  src.connect(gain);
  src.start(t);
  src.stop(t + hold + 0.3);
  voices.push({ midi, src, gain, end: t + hold + 0.3 });
}
