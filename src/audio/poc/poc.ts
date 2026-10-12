// Audio proof of concept (dev only, not used by the app): test sequences, the scheduler and the measurements shared by
// engine A (production synth.ts) and A′ (same library, fixed usage). No React Native imports, so it runs in Node tests.

export type PocNote = { m: number; s: number; d: number }; // midi, start and length in beats
export type Mix = { volume: number; reverb: number }; // 0..1, the same meaning as synth.ts `mix`
export type TempoStep = { atS: number; bpm: number }; // seconds after start
export type Preset = {
    id: string;
    label: string;
    notes: PocNote[];
    bpm: number;
    mix: Mix;
    jsLoad?: boolean; // blocks the JS thread for 150 ms every second
    tempo?: TempoStep[];
};

// Deterministic noise, so A′ and the later engine B get the exact same reverb impulse.
export function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Same room as synth.ts roomImpulse (0.7 s, 15 ms pre-delay, darkening tail, unit energy), but seeded.
export function roomImpulse(rate: number, seed = 1) {
    const rnd = mulberry32(seed);
    const data = new Float32Array(Math.floor(rate * 0.7));
    const delay = Math.floor(rate * 0.015);
    let smooth = 0;
    let energy = 0;
    for (let i = delay; i < data.length; i++) {
        const t = (i - delay) / (data.length - delay);
        const cutoff = 8000 * Math.pow(1500 / 8000, t);
        const k = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
        smooth += k * (rnd() * 2 - 1 - smooth);
        data[i] = smooth * Math.pow(1 - t, 3);
        energy += data[i] * data[i];
    }
    const scale = 1 / Math.sqrt(energy || 1);
    for (let i = 0; i < data.length; i++) data[i] *= scale;
    return data;
}

// Two hands, ten notes, spread over the whole keyboard (A0..C8) so every sample root is used.
export const DENSE_CHORDS = [
    [36, 43, 48, 52, 55, 60, 64, 67, 72, 76],
    [29, 36, 41, 45, 48, 65, 69, 72, 77, 81],
    [31, 38, 43, 47, 50, 67, 71, 74, 79, 83],
    [24, 31, 36, 40, 43, 72, 76, 79, 84, 88],
    [21, 28, 33, 36, 40, 69, 72, 76, 81, 84],
    [26, 33, 38, 41, 45, 74, 77, 81, 86, 89],
    [28, 35, 40, 44, 47, 76, 80, 83, 88, 92],
    [33, 40, 45, 48, 52, 93, 96, 100, 105, 108],
];
export const dense = (): PocNote[] =>
    Array.from({ length: 32 }, (_, i) => DENSE_CHORDS[i % 8].map((m) => ({ m, s: i * 0.5, d: 1 }))).flat();
// One note every `step` beats for `beats` beats (C4 by default): one clear onset per note for the loopback analysis.
export const pulse = (beats: number, step: number, m = 60): PocNote[] =>
    Array.from({ length: Math.round(beats / step) }, (_, i) => ({ m, s: i * step, d: step }));

const V50 = 0.5;
export const PRESETS: Preset[] = [
    { id: "single", label: "Single C4, volume 50, reverb 0", notes: [{ m: 60, s: 0, d: 2 }], bpm: 60, mix: { volume: V50, reverb: 0 } },
    { id: "dense50", label: "Dense chords, volume 50, reverb 50", notes: dense(), bpm: 160, mix: { volume: V50, reverb: 0.5 } },
    { id: "dense100", label: "Dense chords, volume 100, reverb 100", notes: dense(), bpm: 160, mix: { volume: 1, reverb: 1 } },
    { id: "steady60", label: "60 s of sixteenths at 120 BPM", notes: pulse(120, 0.25), bpm: 120, mix: { volume: V50, reverb: 0 } },
    {
        id: "tempo",
        label: "Tempo changes 90 → 150 → 60 → 120",
        notes: pulse(64, 0.5),
        bpm: 90,
        mix: { volume: V50, reverb: 0 },
        tempo: [
            { atS: 8, bpm: 150 },
            { atS: 16, bpm: 60 },
            { atS: 24, bpm: 120 },
        ],
    },
    { id: "rev0", label: "Chords, reverb 0 (compare with reverb 100)", notes: dense().slice(0, 80), bpm: 80, mix: { volume: V50, reverb: 0 } },
    { id: "rev100", label: "Chords, reverb 100 (dry level must not change)", notes: dense().slice(0, 80), bpm: 80, mix: { volume: V50, reverb: 1 } },
    { id: "load", label: "60 s sixteenths under JS load (150 ms block every 1 s)", notes: pulse(120, 0.25), bpm: 120, mix: { volume: V50, reverb: 0 }, jsLoad: true },
];

export type Scheduled = { m: number; s: number; t: number; slack: number; cancelled?: boolean };
export type Retime = { t: number; beat: number; bpm: number };
export type SchedulerOptions = {
    lookahead: number; // seconds scheduled ahead of the audio clock
    now: () => number; // audio clock, seconds
    play: (n: PocNote, t: number, bpm: number) => void;
    // A′: notes already scheduled after `t` are taken back and scheduled again at the new tempo.
    // A (production): undefined, the notes inside the lookahead keep the old tempo, as in practice.tsx.
    cancelAfter?: (t: number) => void;
    // Production re-anchors at the beat of the last tick but the time of now (practice.tsx effect restart).
    anchorAtLastTick?: boolean;
};

// Lookahead scheduler on the audio clock. Every note is scheduled once: windows are half-open (done, horizon] in beats.
export class Scheduler {
    log: Scheduled[] = [];
    retimes: Retime[] = [];
    tickTimes: number[] = [];
    private tr: Retime = { t: 0, beat: 0, bpm: 120 };
    private done = -Infinity;
    private lastTick = 0;
    private notes: PocNote[];
    private o: SchedulerOptions;

    constructor(notes: PocNote[], o: SchedulerOptions) {
        this.notes = [...notes].sort((a, b) => a.s - b.s);
        this.o = o;
    }
    timeOf = (beat: number) => this.tr.t + ((beat - this.tr.beat) * 60) / this.tr.bpm;
    beatAt = (t: number) => this.tr.beat + ((t - this.tr.t) * this.tr.bpm) / 60;
    get bpm() {
        return this.tr.bpm;
    }
    // Last sounding moment of the sequence on the audio clock (for the "finished" check).
    get endTime() {
        const last = Math.max(...this.notes.map((n) => n.s + n.d));
        return this.timeOf(last);
    }

    start(bpm: number, lead = 0.05) {
        const t = this.o.now() + lead;
        const beat = this.notes[0]?.s ?? 0;
        this.tr = { t, beat, bpm };
        this.retimes.push(this.tr);
        this.done = beat - 1e-9;
        this.tick();
    }

    tick() {
        const now = this.o.now();
        this.tickTimes.push(now);
        this.lastTick = now;
        const horizon = this.beatAt(now + this.o.lookahead);
        for (const n of this.notes) {
            if (n.s <= this.done) continue;
            if (n.s > horizon) break;
            const t = this.timeOf(n.s);
            this.log.push({ m: n.m, s: n.s, t, slack: t - now });
            this.o.play(n, t, this.tr.bpm);
        }
        this.done = Math.max(this.done, horizon);
    }

    setTempo(bpm: number, lead = 0.03) {
        const now = this.o.now();
        if (this.o.cancelAfter) {
            const t = now + lead;
            const beat = this.beatAt(t);
            this.o.cancelAfter(t);
            for (const e of this.log) if (e.t > t && !e.cancelled) e.cancelled = true;
            this.tr = { t, beat, bpm };
            this.done = beat;
        } else {
            const beat = this.beatAt(this.o.anchorAtLastTick ? this.lastTick : now);
            this.tr = { t: now, beat, bpm };
        }
        this.retimes.push(this.tr);
        this.tick();
    }
}

export function stats(values: number[]) {
    if (!values.length) return { n: 0, min: NaN, p50: NaN, p99: NaN, max: NaN };
    const v = [...values].sort((a, b) => a - b);
    const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
    return { n: v.length, min: v[0], p50: q(0.5), p99: q(0.99), max: v[v.length - 1] };
}

export const peak = (x: ArrayLike<number>) => {
    let p = 0;
    for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
    return p;
};
export const rms = (x: ArrayLike<number>, from = 0, to = x.length) => {
    let e = 0;
    for (let i = from; i < to; i++) e += x[i] * x[i];
    return Math.sqrt(e / Math.max(1, to - from));
};
export const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));
export const maxAbsDiff = (a: ArrayLike<number>, b: ArrayLike<number>, scaleB = 1) => {
    let d = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) d = Math.max(d, Math.abs(a[i] - b[i] * scaleB));
    return d;
};
// 128-frame blocks whose peak sits at 1.0: the library divides louder blocks down to exactly 1.0 (or they clip).
export function blocksAtFullScale(x: ArrayLike<number>, quantum = 128) {
    let n = 0;
    for (let i = 0; i < x.length; i += quantum) {
        let p = 0;
        for (let j = i; j < Math.min(i + quantum, x.length); j++) p = Math.max(p, Math.abs(x[j]));
        if (p >= 0.999) n++;
    }
    return n;
}

export function busyWait(ms: number) {
    const end = Date.now() + ms;
    while (Date.now() < end);
}
