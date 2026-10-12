// How far the picture moved between two frames, from a few small patches (block matching). Pure code that also runs inside a
// camera frame processor (hence the 'worklet' marks). Positive dx / dy = the content moved right / down from `prev` to `cur`.

export type Shift = { dx: number; dy: number; quality: number };

const PATCH = 32;       // patch size in pixels
const STEP = 2;         // compare every second pixel
const GRID = [0.25, 0.5, 0.75];
const MIN_TEXTURE = 9;  // a patch must have this much contrast (standard deviation) to be trusted

/** Convert interleaved or planar RGB/BGR bytes to one gray byte per pixel. */
export function rgbToGray(src: Uint8Array, w: number, h: number, planar: boolean, bgr: boolean): Uint8Array {
    'worklet';
    const n = w * h, out = new Uint8Array(n);
    const r = bgr ? 2 : 0, b = bgr ? 0 : 2;
    if (planar) {
        for (let i = 0; i < n; i++) out[i] = (src[r * n + i] * 77 + src[n + i] * 150 + src[b * n + i] * 29) >> 8;
    } else {
        for (let i = 0, j = 0; i < n; i++, j += 3) out[i] = (src[j + r] * 77 + src[j + 1] * 150 + src[j + b] * 29) >> 8;
    }
    return out;
}

function patchStats(g: Uint8Array, w: number, x0: number, y0: number) {
    'worklet';
    let sum = 0, sq = 0, n = 0;
    for (let y = y0; y < y0 + PATCH; y += STEP) for (let x = x0; x < x0 + PATCH; x += STEP) { const v = g[y * w + x]; sum += v; sq += v * v; n++; }
    const mean = sum / n;
    return Math.sqrt(Math.max(0, sq / n - mean * mean));
}

function median(values: number[]) {
    'worklet';
    const s = values.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
}

/**
 * Estimates one global shift. Several patches vote; the answer is their median, and `quality` (0..1) is how many patches
 * agreed. Quality 0 means "do not trust this" (blank page, too little texture, or the patches disagree).
 * `maxShift` is the largest movement searched, in pixels.
 */
export function estimateShift(prev: Uint8Array, cur: Uint8Array, w: number, h: number, maxShift = 8): Shift {
    'worklet';
    const votesX: number[] = [], votesY: number[] = [];
    let tried = 0;
    for (const gy of GRID) {
        for (const gx of GRID) {
            const x0 = Math.round(w * gx - PATCH / 2), y0 = Math.round(h * gy - PATCH / 2);
            if (x0 - maxShift < 0 || y0 - maxShift < 0 || x0 + PATCH + maxShift > w || y0 + PATCH + maxShift > h) continue;
            if (patchStats(prev, w, x0, y0) < MIN_TEXTURE) continue;
            tried++;
            const side = 2 * maxShift + 1;
            const sad = new Float32Array(side * side);
            let best = Infinity, bi = 0, second = Infinity;
            for (let dy = -maxShift; dy <= maxShift; dy++) {
                for (let dx = -maxShift; dx <= maxShift; dx++) {
                    let s = 0;
                    for (let y = 0; y < PATCH; y += STEP) {
                        const p = (y0 + y) * w + x0, c = (y0 + y + dy) * w + x0 + dx;
                        for (let x = 0; x < PATCH; x += STEP) s += Math.abs(prev[p + x] - cur[c + x]);
                    }
                    const i = (dy + maxShift) * side + dx + maxShift;
                    sad[i] = s;
                    if (s < best) { second = best; best = s; bi = i; } else if (s < second) second = s;
                }
            }
            if (!(best < second * 0.9)) continue; // the best offset is not clearly better than the rest (repeating pattern)
            const bx = (bi % side) - maxShift, by = Math.floor(bi / side) - maxShift;
            const at = (x: number, y: number) => sad[(y + maxShift) * side + x + maxShift];
            let fx = bx, fy = by; // sub-pixel refinement along each axis
            if (bx > -maxShift && bx < maxShift) { const l = at(bx - 1, by), c = at(bx, by), r = at(bx + 1, by); const d = l - 2 * c + r; if (d > 0) fx = bx + (l - r) / (2 * d); }
            if (by > -maxShift && by < maxShift) { const u = at(bx, by - 1), c = at(bx, by), d2 = at(bx, by + 1); const d = u - 2 * c + d2; if (d > 0) fy = by + (u - d2) / (2 * d); }
            votesX.push(fx); votesY.push(fy);
        }
    }
    if (votesX.length < 2) return { dx: 0, dy: 0, quality: 0 };
    const mx = median(votesX), my = median(votesY);
    const agree = votesX.filter((v, i) => Math.abs(v - mx) <= 1.2 && Math.abs(votesY[i] - my) <= 1.2).length;
    if (agree < 2 || agree < votesX.length / 2) return { dx: 0, dy: 0, quality: 0 };
    return { dx: mx, dy: my, quality: agree / Math.max(tried, 1) };
}
