import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import jpeg from "jpeg-js";
import { estimateShift, rgbToGray } from "../src/lib/motionShift.ts";
import { detectStaves } from "../src/lib/staffDetect.ts";
import { applyShift, emptyTracker, updateWithDetection } from "../src/lib/staffTracker.ts";

const load = (name: string) => {
    const img = jpeg.decode(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)), { useTArray: true });
    return { w: img.width, h: img.height, gray: rgbToGray(img.data.filter((_, i) => i % 4 !== 3), img.width, img.height, false, false) };
};

// Crops a window out of a bigger picture: moving the window by (dx, dy) looks like the camera moved the other way.
const crop = (src: { w: number; gray: Uint8Array }, x0: number, y0: number, w: number, h: number) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = src.gray[(y0 + y) * src.w + x0 + x];
    return out;
};
let seed = 7;
const noise = (g: Uint8Array, amount: number) => g.map((v) => Math.max(0, Math.min(255, v + Math.round(((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5) * amount))));

const W = 300, H = 380;
for (const name of ["bach_640.jpg", "harry_640.jpg", "allegretto_640.jpg"]) {
    const page = load(name);
    const x0 = 120, y0 = 90;
    const base = crop(page, x0, y0, W, H);

    test(`${name}: known shifts are measured within half a pixel`, () => {
        for (const [dx, dy] of [[0, 0], [3, 0], [0, -4], [5, 6], [-7, 2], [8, -8], [-2, -1]]) {
            // the content moved by (dx, dy): the window sees what was at (x0 - dx, y0 - dy)
            const moved = crop(page, x0 - dx, y0 - dy, W, H);
            const s = estimateShift(base, moved, W, H, 10);
            assert.ok(s.quality > 0, `no answer for ${dx},${dy}`);
            assert.ok(Math.abs(s.dx - dx) <= 0.5 && Math.abs(s.dy - dy) <= 0.5, `moved ${dx},${dy} measured ${s.dx.toFixed(2)},${s.dy.toFixed(2)}`);
        }
    });

    test(`${name}: still right with sensor noise`, () => {
        const moved = noise(crop(page, x0 - 4, y0 - 3, W, H), 24);
        const s = estimateShift(noise(base, 24), moved, W, H, 10);
        assert.ok(s.quality > 0 && Math.abs(s.dx - 4) <= 0.8 && Math.abs(s.dy - 3) <= 0.8, `measured ${s.dx.toFixed(2)},${s.dy.toFixed(2)}`);
    });
}

test("a blank frame gives no answer instead of a guess", () => {
    const blank = new Uint8Array(W * H).fill(200);
    assert.equal(estimateShift(blank, blank, W, H, 10).quality, 0);
});

test("a very different frame is not trusted", () => {
    const a = crop(load("bach_640.jpg"), 100, 100, W, H), b = crop(load("harry_640.jpg"), 200, 300, W, H);
    assert.equal(estimateShift(a, b, W, H, 10).quality, 0);
});

test("rgbToGray handles interleaved, planar and swapped channel order", () => {
    const red = new Uint8Array([255, 0, 0, 255, 0, 0]);          // two red pixels, RGB interleaved
    assert.deepEqual([...rgbToGray(red, 2, 1, false, false)], [76, 76]);
    assert.deepEqual([...rgbToGray(red, 2, 1, false, true)], [28, 28]);   // the same bytes read as BGR are blue
    const planar = new Uint8Array([255, 255, 0, 0, 0, 0]);       // R plane, G plane, B plane for 2 pixels
    assert.deepEqual([...rgbToGray(planar, 2, 1, true, false)], [76, 76]);
});

// ---- tracker: follows the picture between detections and is pulled to the truth by each detection
test("boxes follow measured shifts and a later detection corrects the drift", () => {
    const page = load("bach_640.jpg");
    const frame = (dx: number, dy: number) => crop(page, 120 - dx, 90 - dy, W, H);
    let state = updateWithDetection(emptyTracker(), detectStaves(frame(0, 0), W, H), 1);
    const startIds = state.tracks.map((t) => t.id);
    assert.ok(startIds.length >= 2, `found ${startIds.length} staves`);
    const first = state.tracks.map((t) => ({ id: t.id, cx: t.cx, cy: t.cy }));

    // the camera moves 3 px right and 2 px down per frame for 3 frames (the content moves with it)
    let truth = [0, 0], prev = frame(0, 0);
    for (let i = 1; i <= 3; i++) {
        truth = [3 * i, 2 * i];
        const cur = frame(truth[0], truth[1]);
        const s = estimateShift(prev, cur, W, H, 10);
        state = applyShift(state, s.dx, s.dy);
        prev = cur;
    }
    for (const f of first) {
        const t = state.tracks.find((x) => x.id === f.id)!;
        assert.ok(Math.abs(t.cx - (f.cx + truth[0])) <= 1.5 && Math.abs(t.cy - (f.cy + truth[1])) <= 1.5, `box ${f.id} off by ${(t.cx - f.cx - truth[0]).toFixed(1)}, ${(t.cy - f.cy - truth[1]).toFixed(1)}`);
    }
    // a real detection arrives: the boxes land where the detector sees the staves, with the same ids
    const det = detectStaves(frame(truth[0], truth[1]), W, H);
    const after = updateWithDetection(state, det, 1);
    assert.deepEqual(after.tracks.filter((t) => startIds.includes(t.id)).map((t) => t.id), startIds.filter((id) => after.tracks.some((t) => t.id === id)));
});

test("a staff missed once is kept for a few detections and then dropped", () => {
    const page = load("bach_640.jpg");
    const full = detectStaves(crop(page, 120, 90, W, H), W, H);
    let state = updateWithDetection(emptyTracker(), full, 1);
    const n = state.tracks.length;
    assert.ok(n >= 2);
    const without = { ...full, staves: full.staves.slice(1) };
    state = updateWithDetection(state, without, 1);
    assert.equal(state.tracks.length, n, "kept after one miss");
    for (let i = 0; i < 3; i++) state = updateWithDetection(state, without, 1);
    assert.equal(state.tracks.length, n - 1, "dropped after repeated misses");
});

test("a small detection error does not make the boxes jump (pulled only part of the way)", () => {
    const page = load("bach_640.jpg");
    let state = updateWithDetection(emptyTracker(), detectStaves(crop(page, 120, 90, W, H), W, H), 1);
    const before = state.tracks[0].cy;
    const shifted = detectStaves(crop(page, 120, 90 - 4, W, H), W, H); // staves appear 4 px lower
    state = updateWithDetection(state, shifted, 0.5);
    assert.ok(Math.abs(state.tracks.find((t) => t.misses === 0)!.cy - before) < 4, "moved less than the full 4 px");
});
