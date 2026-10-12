// Pure helpers for synth.ts and the practice play loop (no React Native imports, so they run in Node tests).

// Master limiter: linear up to KNEE, then rounded off so the output never reaches CEILING. The library scales any
// 128-frame block whose peak is above 1.0 down by 1/peak (audible as crunch), so the bus must stay below 1.0.
export const KNEE = 0.6;
export const CEILING = 0.95;
export function limit(x: number) {
  const a = Math.abs(x);
  if (a <= KNEE) return x;
  return Math.sign(x) * (KNEE + (CEILING - KNEE) * Math.tanh((a - KNEE) / (CEILING - KNEE)));
}

// WaveShaper curve covering inputs -range..range (inputs reach it pre-scaled by 1/range).
export function limiterCurve(range = 2, points = 2049) {
  return Float32Array.from({ length: points }, (_, i) => limit(((i / (points - 1)) * 2 - 1) * range));
}

// Lookahead scheduling: the notes starting in (from, to] beats. The play loop passes the end of the previous window
// as `from`, so every note is scheduled exactly once.
export function notesInWindow<N extends { s: number }>(notes: N[], from: number, to: number) {
  return notes.filter((n) => n.s > from && n.s <= to);
}
