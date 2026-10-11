// Plays piano-like notes with the Web Audio API (react-native-audio-api). Needs a development build:
// in Expo Go the native module is missing, so everything below silently does nothing.
// ponytail: synthesized tone (triangle + octave sine, decaying); swap for sampled piano once chosen.
let ctx: any = null;
let unavailable = false;

function context() {
  if (ctx || unavailable) return ctx;
  try {
    const { AudioContext } = require('react-native-audio-api');
    ctx = new AudioContext();
  } catch {
    unavailable = true;
  }
  return ctx;
}

export function playNote(midi: number, seconds: number) {
  const c = context();
  if (!c) return;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const t = c.currentTime;
  const hold = Math.min(Math.max(seconds, 0.25), 2.5);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.3);
  gain.connect(c.destination);
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
