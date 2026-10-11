// Plays piano-like notes with the Web Audio API (react-native-audio-api). Needs a development build:
// in Expo Go the native module is missing, so everything below silently does nothing.
// Sampled piano (assets/piano, one file per note); the synthesized tone below plays until the samples are
// decoded or if decoding fails. Every note goes through one master gain + soft clipper so chords don't clip.
import { SAMPLES } from '../../assets/piano/samples';

// Mixer levels, 0..1. Every note goes into `out` (the piano channel), which feeds two parallel paths:
// the dry fader (volume) and a pre-fader reverb send (reverb), so each can be turned up or down on its own.
export const mix = { volume: 0.5, reverb: 0.5 };
let dry: any = null;
let send: any = null;
const applyMix = () => {
  if (dry) dry.gain.value = mix.volume * 0.9;
  if (send) send.gain.value = mix.reverb * 1.4;
};
export function setMix(part: Partial<typeof mix>) {
  Object.assign(mix, part);
  applyMix();
}

let ctx: any = null;
let out: any = null;
const buffers: Record<number, any> = {};
let unavailable = false;

function context() {
  if (ctx || unavailable) return ctx;
  try {
    const { AudioContext } = require('react-native-audio-api');
    ctx = new AudioContext();
    out = ctx.createGain();
    dry = ctx.createGain();
    send = ctx.createGain();
    const clip = ctx.createWaveShaper();
    clip.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh(((i / 1023) * 2 - 1) * 1.5));
    clip.connect(ctx.destination);
    out.connect(dry);
    dry.connect(clip);
    // Small-room reverb: decaying noise as the impulse response. The 1.6 s tail is fixed; the level is the reverb slider.
    const rate = ctx.sampleRate;
    const impulse = ctx.createBuffer(2, Math.floor(rate * 1.6), rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const verb = ctx.createConvolver();
    verb.buffer = impulse;
    out.connect(send);
    send.connect(verb);
    const ret = ctx.createGain();
    ret.gain.value = 0.25;
    verb.connect(ret);
    ret.connect(clip);
    applyMix();
    for (const [midi, asset] of Object.entries(SAMPLES))
      ctx.decodeAudioData(asset).then((b: any) => (buffers[+midi] = b)).catch(() => {});
  } catch {
    unavailable = true;
  }
  return ctx;
}

export function playNote(midi: number, seconds: number) {
  const c = context();
  if (!c) return;
  const root = Object.keys(buffers).map(Number).reduce((best, m) => (Math.abs(m - midi) < Math.abs(best - midi) ? m : best), -999);
  if (buffers[root]) return playSample(c, buffers[root], root, midi, seconds);
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const t = c.currentTime;
  const hold = Math.min(Math.max(seconds, 0.25), 2.5);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.3);
  gain.connect(out);
  for (const [type, mult, level] of [['triangle', 1, 1], ['sine', 2, 0.3]] as const) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    const g = c.createGain();
    g.gain.value = level;
    osc.connect(g);
    g.connect(gain);
    osc.start(t);
    osc.stop(t + hold + 0.35);
  }
}

function playSample(c: any, buffer: any, root: number, midi: number, seconds: number) {
  const t = c.currentTime;
  const hold = Math.min(Math.max(seconds, 0.25), 2.5);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.pow(2, (midi - root) / 12);
  const gain = c.createGain();
  gain.gain.setValueAtTime(1, t);
  gain.gain.setValueAtTime(1, t + hold);
  gain.gain.linearRampToValueAtTime(0.0001, t + hold + 0.25);
  src.connect(gain);
  gain.connect(out);
  src.start(t);
  src.stop(t + hold + 0.3);
}
