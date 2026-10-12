// Finds staves (groups of 5 evenly spaced horizontal lines) in a small grayscale picture, so the camera can show
// boxes around them before the photo is taken. Pure code (no React Native), tuned for a picture about 640 px wide.
//
// Steps: mark ink with a local threshold -> try small page tilts and keep the one where ink piles up in the sharpest rows
// -> rows with lots of ink are staff-line candidates -> five evenly spaced lines make a staff -> measure where it starts and ends.

export type Point = { x: number; y: number };
/** Four corners, clockwise from top-left, in the picture's pixel coordinates (rotated with the page). */
export type StaffBox = { corners: [Point, Point, Point, Point]; spacing: number };
export type Detection = { staves: StaffBox[]; angle: number; spacing: number; brightness: number; width: number; height: number };

const LINE_TO_SPACE = 1.5;
const ANGLES = (() => { const a: number[] = []; for (let d = -8; d <= 8; d += 1) a.push(d); return a; })();

function darkPixels(gray: Uint8Array, w: number, h: number): { xs: Int16Array; ys: Int16Array; n: number } {
    'worklet';
    // Local mean with an integral image: a pixel is ink when it is clearly darker than its surroundings.
    const stride = w + 1;
    const integral = new Float64Array(stride * (h + 1));
    for (let y = 0; y < h; y++) {
        let row = 0;
        for (let x = 0; x < w; x++) {
            row += gray[y * w + x];
            integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
        }
    }
    const rx = Math.max(8, Math.round(w / 20));
    const ry = 6;
    const xs = new Int16Array(w * h);
    const ys = new Int16Array(w * h);
    let n = 0;
    for (let y = 0; y < h; y++) {
        const y0 = Math.max(0, y - ry), y1 = Math.min(h, y + ry + 1);
        for (let x = 0; x < w; x++) {
            const x0 = Math.max(0, x - rx), x1 = Math.min(w, x + rx + 1);
            const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
            const mean = sum / ((x1 - x0) * (y1 - y0));
            const g = gray[y * w + x];
            if (g < mean * 0.88 && g < 205) { xs[n] = x; ys[n] = y; n++; }
        }
    }
    return { xs, ys, n };
}

function rowProfile(xs: Int16Array, ys: Int16Array, n: number, w: number, h: number, angleDeg: number) {
    'worklet';
    const t = Math.tan((angleDeg * Math.PI) / 180);
    const pad = Math.ceil((w / 2) * Math.abs(t)) + 2;
    const sums = new Float32Array(h + 2 * pad);
    for (let i = 0; i < n; i++) {
        const y2 = Math.round(ys[i] - (xs[i] - w / 2) * t) + pad;
        sums[y2]++;
    }
    return { sums, pad, t };
}

type Band = { staves: StaffBox[]; angle: number; spacing: number };

// Looks for staves among the ink pixels whose row is in [y0, y1). Each band gets its own tilt, so a curved page or one
// photographed at an angle (tilt changing down the page) is still followed.
function detectInBand(xs: Int16Array, ys: Int16Array, n: number, w: number, h: number, y0: number, y1: number): Band {
    'worklet';
    const bx: number[] = [], by: number[] = [];
    for (let i = 0; i < n; i++) if (ys[i] >= y0 && ys[i] < y1) { bx.push(xs[i]); by.push(ys[i]); }
    const m = bx.length;
    const empty: Band = { staves: [], angle: 0, spacing: 0 };
    if (m < 100) return empty;
    const bxs = Int16Array.from(bx), bys = Int16Array.from(by);

    // 1. tilt: the angle whose row profile is the most peaked
    let best = 0, bestScore = -1;
    const score = (a: number) => {
        const { sums } = rowProfile(bxs, bys, m, w, h, a);
        let sc = 0;
        for (let i = 0; i < sums.length; i++) sc += sums[i] * sums[i];
        return sc;
    };
    for (const a of ANGLES) { const sc = score(a); if (sc > bestScore) { bestScore = sc; best = a; } }
    for (const a of [best - 0.5, best + 0.5]) { const sc = score(a); if (sc > bestScore) { bestScore = sc; best = a; } }
    const { sums, pad, t } = rowProfile(bxs, bys, m, w, h, best);

    // 2. line candidates: strong local maxima in the row profile
    let max = 0;
    for (let i = 0; i < sums.length; i++) if (sums[i] > max) max = sums[i];
    const threshold = Math.max(0.1 * w, 0.28 * max);
    const lines: number[] = [];
    for (let y = 1; y < sums.length - 1; y++) {
        const v = sums[y];
        if (v >= threshold && v >= sums[y - 1] && v > sums[y + 1]) {
            const wgt = sums[y - 1] + v + sums[y + 1];
            lines.push((y - 1) * (sums[y - 1] / wgt) + y * (v / wgt) + (y + 1) * (sums[y + 1] / wgt));
        }
    }
    if (lines.length < 5) return { ...empty, angle: best };

    // 3. a staff is five evenly spaced lines. Among the next few peaks, pick five whose gaps agree closely (this skips
    //    stray peaks from beams and stems), then continue below that staff.
    const staffRows: { first: number; last: number }[] = [];
    const pick5 = (start: number): { idx: number[]; spread: number } | null => {
        const pool = lines.slice(start, start + 8);
        let best5: { idx: number[]; spread: number } | null = null;
        const rec = (chosen: number[], from: number) => {
            if (chosen.length === 5) {
                const g = [1, 2, 3, 4].map((k) => pool[chosen[k]] - pool[chosen[k - 1]]);
                const lo = Math.min(...g), hi = Math.max(...g);
                if (lo >= 3 && hi <= w / 14 && hi <= lo * 1.22 && (!best5 || hi / lo < best5.spread)) best5 = { idx: chosen.map((c) => c + start), spread: hi / lo };
                return;
            }
            for (let c = from; c < pool.length; c++) {
                if (chosen.length && pool[c] - pool[chosen[chosen.length - 1]] > w / 14) break;
                rec([...chosen, c], c + 1);
            }
        };
        rec([], 0);
        return best5;
    };
    for (let i = 0; i + 4 < lines.length; ) {
        const fit = pick5(i);
        if (fit && fit.idx[0] === i) { staffRows.push({ first: lines[fit.idx[0]], last: lines[fit.idx[4]] }); i = fit.idx[4] + 1; }
        else i++;
    }
    // In a real staff the five line rows hold clearly more ink than the rows in the spaces between them. In speckle or texture
    // lines and spaces look alike, so groups that fail this are not staves.
    const rowAt = (y: number) => sums[Math.min(sums.length - 1, Math.max(0, Math.round(y)))];
    for (let k = staffRows.length - 1; k >= 0; k--) {
        const { first, last } = staffRows[k];
        const gap = (last - first) / 4;
        let onLine = 0, inSpace = 0;
        for (let q = 0; q < 5; q++) onLine += Math.max(rowAt(first + q * gap - 1), rowAt(first + q * gap), rowAt(first + q * gap + 1));
        for (let q = 0; q < 4; q++) inSpace += rowAt(first + (q + 0.5) * gap);
        if (onLine / 5 < LINE_TO_SPACE * Math.max(1, inSpace / 4)) staffRows.splice(k, 1);
    }
    // staves on one page are about the same size: drop ones that do not match the rest (false finds)
    if (staffRows.length > 2) {
        const sp = staffRows.map((r) => (r.last - r.first) / 4).sort((a, b) => a - b);
        const med = sp[Math.floor(sp.length / 2)];
        for (let k = staffRows.length - 1; k >= 0; k--) { const q = (staffRows[k].last - staffRows[k].first) / 4; if (q < med * 0.7 || q > med * 1.4) staffRows.splice(k, 1); }
    }
    if (!staffRows.length) return { ...empty, angle: best };

    // 4. where each staff starts and ends: columns where ink sits on its lines
    const rowToStaff = new Int16Array(sums.length).fill(-1);
    staffRows.forEach((s, k) => { for (let y = Math.floor(s.first) - 1; y <= Math.ceil(s.last) + 1; y++) if (y >= 0 && y < rowToStaff.length) rowToStaff[y] = k; });
    const cols = staffRows.map(() => new Uint16Array(w));
    for (let i = 0; i < m; i++) {
        const k = rowToStaff[Math.round(bys[i] - (bxs[i] - w / 2) * t) + pad];
        if (k >= 0) cols[k][bxs[i]]++;
    }
    const staves: StaffBox[] = [];
    let spacing = 0;
    staffRows.forEach((s, k) => {
        const c = cols[k];
        let left = -1, right = -1;
        for (let x = 0; x + 8 < w; x++) { let ok = 0; for (let j = 0; j < 8; j++) if (c[x + j] >= 2) ok++; if (ok >= 7) { left = x; break; } }
        for (let x = w - 1; x - 8 >= 0; x--) { let ok = 0; for (let j = 0; j < 8; j++) if (c[x - j] >= 2) ok++; if (ok >= 7) { right = x; break; } }
        if (left < 0 || right - left < w * 0.15) return;
        const d = (s.last - s.first) / 4;
        const top = s.first - pad - d * 0.9, bottom = s.last - pad + d * 0.9;
        const at = (x: number, y2: number): Point => ({ x, y: y2 + (x - w / 2) * t });
        staves.push({ corners: [at(left, top), at(right, top), at(right, bottom), at(left, bottom)], spacing: d });
        spacing += d;
    });
    return { staves, angle: best, spacing: staves.length ? spacing / staves.length : 0 };
}

const centreY = (s: StaffBox) => {
    'worklet';
    return (s.corners[0].y + s.corners[2].y) / 2;
};

export function detectStaves(gray: Uint8Array, w: number, h: number): Detection {
    'worklet';
    let total = 0;
    for (let i = 0; i < gray.length; i += 7) total += gray[i];
    const brightness = total / Math.ceil(gray.length / 7);
    const empty: Detection = { staves: [], angle: 0, spacing: 0, brightness, width: w, height: h };

    const { xs, ys, n } = darkPixels(gray, w, h);
    if (n < 200) return empty;

    // Overlapping bands (a staff cut by one band's edge is whole in the next); duplicates are merged below.
    const bands = 4, size = h / bands, overlap = size * 0.35;
    const found: StaffBox[] = [];
    const angles: number[] = [];
    for (let b = 0; b < bands; b++) {
        const r = detectInBand(xs, ys, n, w, h, Math.max(0, b * size - overlap), Math.min(h, (b + 1) * size + overlap));
        if (r.staves.length) angles.push(r.angle);
        for (const s of r.staves) if (!found.some((f) => Math.abs(centreY(f) - centreY(s)) < Math.max(f.spacing, s.spacing) * 3)) found.push(s);
    }
    found.sort((a, b) => centreY(a) - centreY(b));
    const spacings = found.map((s) => s.spacing).sort((a, b) => a - b);
    angles.sort((a, b) => a - b);
    return { staves: found, angle: angles.length ? angles[Math.floor(angles.length / 2)] : 0, spacing: spacings.length ? spacings[Math.floor(spacings.length / 2)] : 0, brightness, width: w, height: h };
}

export type LiveHint = "none" | "dark" | "closer" | "edge" | "ready" | "partial";

/** What to tell the user about the current picture. Thresholds are a starting point, to be calibrated on real photos. */
export function liveHint(det: Detection): LiveHint {
    'worklet';
    if (det.brightness < 70) return "dark";
    if (!det.staves.length) return "none";
    if (det.spacing < 3) return "closer";
    // a staff whose middle is close to the top or bottom edge is probably cut off
    const cut = det.staves.some((s) => {
        const cy = (s.corners[0].y + s.corners[2].y) / 2;
        return cy < s.spacing * 2.5 || cy > det.height - s.spacing * 2.5;
    });
    if (cut) return "edge";
    return det.staves.length >= 2 ? "ready" : "partial";
}
