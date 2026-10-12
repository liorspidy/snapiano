// Audio proof of concept (dev only): engine A = production synth.ts, untouched; engine A′ = the same library
// (react-native-audio-api) with the fixes under test. Both play the same decoded Salamander files with the same
// sample choice, envelope and gains, so only the fixes differ.
import {
    AudioBufferSourceNode,
    AudioContext,
    BiquadFilterNode,
    ConstantSourceNode,
    ConvolverNode,
    decodeAudioData,
    GainNode,
    OfflineAudioContext,
} from "react-native-audio-api";
import { SAMPLES } from "../../../assets/piano/samples";
import * as synth from "../synth";
import { blocksAtFullScale, db, dense, maxAbsDiff, Mix, peak, PocNote, rms, roomImpulse } from "./poc";

export type Engine = {
    name: "A" | "A′";
    ready: () => Promise<void>;
    now: () => number;
    play: (n: PocNote, t: number, bpm: number) => void;
    setMix: (mix: Mix) => void;
    cancelAfter?: (t: number) => void;
    state: () => string;
    sampleRate: () => number;
    close: () => Promise<void>;
};

// Engine A is the production module itself. It keeps its AudioContext open for the whole app session (synth.ts has
// no close), so once A has run, A′ shares the device with a second, idle-but-running stream: results are flagged.
export let aUsedThisSession = false;
export function engineA(): Engine {
    aUsedThisSession = true;
    synth.warmUp();
    return {
        name: "A",
        // synth.ts decodes in the background and plays a triangle wave until then; that is part of what A is.
        ready: async () => {},
        now: synth.audioTime,
        play: (n, t, bpm) => synth.playNote(n.m, (n.d * 60) / bpm, t),
        setMix: (mix) => synth.setMix(mix),
        state: () => "unknown (synth.ts keeps it private)",
        sampleRate: () => NaN,
        close: async () => {},
    };
}

// Same constants as synth.ts, so a note at volume 50 is exactly as loud in A and A′.
const NOTE_GAIN = 0.5;
const FADER = 0.9;
const SEND = 1.4;
const RETURN = 0.5;
const MAX_VOICES = 64;
const FADE_S = 0.015; // fader and send smoothing (time constant)

const stereo = { channelCount: 2, channelCountMode: "explicit" as const };
const mono = { channelCount: 1, channelCountMode: "explicit" as const };

export type Ctx = AudioContext | OfflineAudioContext;
type Buffers = Record<number, any>;

// All 30 files or nothing: A′ never plays a fallback tone.
export async function loadSamples(rate: number) {
    const started = Date.now();
    const entries = await Promise.all(
        Object.entries(SAMPLES).map(async ([midi, asset]) => {
            try {
                return [+midi, await decodeAudioData(asset, rate)] as const;
            } catch {
                return [+midi, null] as const;
            }
        }),
    );
    const failed = entries.filter(([, b]) => !b).map(([m]) => m);
    if (failed.length) throw new Error(`samples failed to decode: ${failed.join(", ")}`);
    return { buffers: Object.fromEntries(entries) as Buffers, decodeMs: Date.now() - started };
}

// Nearest sample root, ties to the lower root: the same pick as synth.ts.
export function rootFor(buffers: Buffers, midi: number) {
    return Object.keys(buffers)
        .map(Number)
        .reduce((best, m) => (Math.abs(m - midi) < Math.abs(best - midi) ? m : best), -999);
}

// The A′ mixer. Every node sums into its own buffer ("explicit" channel mode): with the library's default "max" mode a
// node may process inside its input's buffer, and a node feeding two others (the fader feeds the dry bus and the
// reverb send) can then hand the second one a stale buffer. The graph check below measures this on the device.
//   voices -> fader -+-> dry -> master -> output                 (no waveshaper: linear, headroom by gain)
//                    +-> send (mono) -> high-pass -> reverb (mono) -> return -> master
export function buildMixer(ctx: Ctx, mix: Mix, paths = { dry: true, wet: true }) {
    const fader = new GainNode(ctx, { ...stereo, gain: mix.volume * FADER });
    const dry = new GainNode(ctx, { ...stereo, gain: paths.dry ? 1 : 0 });
    const master = new GainNode(ctx, stereo);
    const send = new GainNode(ctx, { ...mono, gain: mix.reverb * SEND });
    const lowCut = new BiquadFilterNode(ctx, { ...mono, type: "highpass", frequency: 200 });
    const verb = new ConvolverNode(ctx, { ...mono, disableNormalization: true });
    const irData = roomImpulse(ctx.sampleRate);
    const ir = ctx.createBuffer(1, irData.length, ctx.sampleRate);
    ir.copyToChannel(irData, 0);
    verb.buffer = ir;
    const ret = new GainNode(ctx, { ...stereo, gain: paths.wet ? RETURN : 0 });
    fader.connect(dry);
    dry.connect(master);
    fader.connect(send);
    send.connect(lowCut);
    lowCut.connect(verb);
    verb.connect(ret);
    ret.connect(master);
    master.connect(ctx.destination);
    // Library workaround kept from synth.ts: the convolver switches itself off once its inputs go idle.
    const keepAlive = new ConstantSourceNode(ctx, { offset: 0 });
    keepAlive.connect(send);
    keepAlive.start();
    const setMix = (m: Mix) => {
        const t = ctx.currentTime;
        fader.gain.cancelAndHoldAtTime(t);
        fader.gain.setTargetAtTime(m.volume * FADER, t, FADE_S);
        send.gain.cancelAndHoldAtTime(t);
        send.gain.setTargetAtTime(m.reverb * SEND, t, FADE_S);
    };
    return { fader, setMix };
}

type Voice = { midi: number; start: number; end: number; src: AudioBufferSourceNode; gain: GainNode };

// Voices with the synth.ts envelope; notes are only played from decoded samples.
export function voicePlayer(ctx: Ctx, buffers: Buffers, out: GainNode) {
    let voices: Voice[] = [];
    const damp = (v: Voice, when: number) => {
        v.gain.gain.cancelAndHoldAtTime(when);
        v.gain.gain.setTargetAtTime(0, when, 0.01);
        v.src.stop(when + 0.06);
        v.end = when + 0.06;
    };
    const play = (midi: number, seconds: number, when: number) => {
        const t = Math.max(when, ctx.currentTime);
        const hold = Math.min(Math.max(seconds, 0.25), 2.5);
        voices = voices.filter((v) => v.end > ctx.currentTime);
        for (const v of voices) if (v.midi === midi && v.end > t && v.start <= t) damp(v, t);
        if (voices.length >= MAX_VOICES) damp(voices[0], t);
        const root = rootFor(buffers, midi);
        const level = NOTE_GAIN;
        const gain = new GainNode(ctx, { ...stereo, gain: 0 });
        gain.connect(out);
        const src = new AudioBufferSourceNode(ctx);
        src.buffer = buffers[root];
        src.playbackRate.value = Math.pow(2, (midi - root) / 12);
        gain.gain.setValueAtTime(level, t);
        gain.gain.setValueAtTime(level, t + hold);
        gain.gain.linearRampToValueAtTime(0.0001, t + hold + 0.25);
        src.connect(gain);
        src.start(t);
        src.stop(t + hold + 0.3);
        voices.push({ midi, start: t, end: t + hold + 0.3, src, gain });
    };
    // Takes back notes that have not started yet (tempo change, stop).
    const cancelAfter = (t: number) => {
        voices = voices.filter((v) => {
            if (v.start <= t) return true;
            v.gain.disconnect();
            return false;
        });
    };
    return { play, cancelAfter };
}

export async function engineAPrime(mix: Mix): Promise<Engine & { decodeMs: number }> {
    const ctx = new AudioContext();
    const { buffers, decodeMs } = await loadSamples(ctx.sampleRate);
    const mixer = buildMixer(ctx, mix);
    const voices = voicePlayer(ctx, buffers, mixer.fader);
    return {
        name: "A′",
        decodeMs,
        ready: async () => {
            if (ctx.state !== "running") await ctx.resume();
        },
        now: () => ctx.currentTime,
        play: (n, t, bpm) => voices.play(n.m, (n.d * 60) / bpm, t),
        setMix: mixer.setMix,
        cancelAfter: voices.cancelAfter,
        state: () => ctx.state,
        sampleRate: () => ctx.sampleRate,
        close: () => ctx.close(),
    };
}

// Renders notes through the A′ graph faster than real time, for exact signal checks (no device timing involved).
export async function renderAPrime(
    buffers: Buffers,
    rate: number,
    notes: PocNote[],
    bpm: number,
    mix: Mix,
    paths = { dry: true, wet: true },
    tail = 2,
) {
    const end = Math.max(...notes.map((n) => n.s + n.d));
    const length = Math.ceil(((end * 60) / bpm + tail) * rate);
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: rate });
    const mixer = buildMixer(ctx, mix, paths);
    const voices = voicePlayer(ctx, buffers, mixer.fader);
    const lead = 0.05;
    for (const n of notes) voices.play(n.m, (n.d * 60) / bpm, lead + (n.s * 60) / bpm);
    const out = await ctx.startRendering();
    return { left: out.getChannelData(0), right: out.getChannelData(1), lead };
}

// Library check: a constant 0.25 through a gain that feeds the output directly and through a second gain.
// The right answer is 0.5. Run with the default channel mode (as in synth.ts) and with "explicit" (as in A′).
export async function fanOutCheck(rate: number, explicit: boolean) {
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 4096, sampleRate: rate });
    const opts = explicit ? stereo : {};
    const src = new ConstantSourceNode(ctx, { offset: 0.25 });
    const a = new GainNode(ctx, opts);
    const b = new GainNode(ctx, opts);
    src.connect(a);
    a.connect(ctx.destination);
    a.connect(b);
    b.connect(ctx.destination);
    src.start();
    const out = await ctx.startRendering();
    return out.getChannelData(0)[2048];
}

export type Check = { name: string; pass: boolean; detail: string; values: Record<string, number> };

// Offline signal checks of A′ (exact numbers, no real-time effects) plus the library fan-out check.
export async function signalChecks(buffers: Buffers, rate: number): Promise<Check[]> {
    const checks: Check[] = [];
    const add = (name: string, pass: boolean, detail: string, values: Record<string, number>) =>
        checks.push({ name, pass, detail, values });

    const fan = { max: [] as number[], explicit: [] as number[] };
    for (let i = 0; i < 5; i++) {
        fan.max.push(await fanOutCheck(rate, false));
        fan.explicit.push(await fanOutCheck(rate, true));
    }
    const ok = (v: number[]) => v.every((x) => Math.abs(x - 0.5) < 1e-4);
    add("library fan-out, default channel mode (synth.ts)", ok(fan.max), `expected 0.5, got ${fan.max.map((x) => x.toFixed(3)).join(" ")}`, { first: fan.max[0] });
    add("library fan-out, explicit channel mode (A′)", ok(fan.explicit), `expected 0.5, got ${fan.explicit.map((x) => x.toFixed(3)).join(" ")}`, { first: fan.explicit[0] });

    const single = await renderAPrime(buffers, rate, [{ m: 60, s: 0, d: 2 }], 60, { volume: 0.5, reverb: 0 });
    const expected = peak(buffers[60].getChannelData(0)) * NOTE_GAIN * 0.5 * FADER;
    const got = peak(single.left);
    add("single C4 at volume 50, reverb 0: level as designed", Math.abs(db(got / expected)) < 0.1,
        `peak ${got.toFixed(4)}, expected ${expected.toFixed(4)} (${db(got / expected).toFixed(2)} dB)`, { peak: got, expected });

    const notes = dense();
    const d50 = await renderAPrime(buffers, rate, notes, 160, { volume: 0.5, reverb: 0.5 });
    const d100 = await renderAPrime(buffers, rate, notes, 160, { volume: 1, reverb: 0.5 });
    const d100r = await renderAPrime(buffers, rate, notes, 160, { volume: 1, reverb: 1 });
    for (const [label, r] of [["volume 50, reverb 50", d50], ["volume 100, reverb 50", d100], ["volume 100, reverb 100", d100r]] as const) {
        const p = Math.max(peak(r.left), peak(r.right));
        const full = blocksAtFullScale(r.left) + blocksAtFullScale(r.right);
        add(`dense chords, ${label}: below full scale`, p < 0.95 && full === 0, `peak ${p.toFixed(3)} (${db(p).toFixed(1)} dBFS), blocks at 1.0: ${full}`, { peak: p, full });
    }
    const lin = maxAbsDiff(d100.left, d50.left, 2) / Math.max(peak(d100.left), 1e-9);
    add("dense chords: doubling the volume doubles every sample (no distortion, no auto-gain)", lin < 1e-3,
        `largest deviation ${(lin * 100).toFixed(4)} % of peak`, { deviation: lin });

    const chords = notes.slice(0, 80);
    const r0 = await renderAPrime(buffers, rate, chords, 80, { volume: 0.5, reverb: 0 });
    const r1 = await renderAPrime(buffers, rate, chords, 80, { volume: 0.5, reverb: 1 });
    const wet = await renderAPrime(buffers, rate, chords, 80, { volume: 0.5, reverb: 1 }, { dry: false, wet: true });
    let residue = 0;
    for (let i = 0; i < r1.left.length; i++) residue = Math.max(residue, Math.abs(r1.left[i] - r0.left[i] - wet.left[i]));
    const rel = residue / Math.max(peak(r0.left), 1e-9);
    add("reverb 0 → 100 leaves the dry piano unchanged (rev100 = rev0 + wet only)", rel < 1e-3,
        `residue ${(rel * 100).toFixed(4)} % of dry peak; wet level ${db(rms(wet.left) / rms(r0.left)).toFixed(1)} dB re dry`,
        { residue: rel, wetDb: db(rms(wet.left) / rms(r0.left)) });
    const p1 = Math.max(peak(r1.left), peak(r1.right));
    add("chords at reverb 100: below full scale", p1 < 0.95, `peak ${p1.toFixed(3)}`, { peak: p1 });
    return checks;
}
