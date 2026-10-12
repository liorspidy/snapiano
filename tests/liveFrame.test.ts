import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import jpeg from "jpeg-js";
import { DETECT_EVERY, MIN_FRAME_GAP_MS, newLiveState, processFrame, tooSoon } from "../src/lib/liveFrame.ts";

const W = 300, H = 400;
const page = (() => { const i = jpeg.decode(readFileSync(new URL("./fixtures/bach_640.jpg", import.meta.url)), { useTArray: true }); return { w: i.width, rgb: i.data.filter((_, k) => k % 4 !== 3) }; })();
// RGB bytes of a W x H window of the page at (x0, y0): a camera frame as the resizer would deliver it.
const frame = (x0: number, y0: number) => { const o = new Uint8Array(W * H * 3); for (let y = 0; y < H; y++) o.set(page.rgb.subarray(((y0 + y) * page.w + x0) * 3, ((y0 + y) * page.w + x0 + W) * 3), y * W * 3); return o; };

test("the first frame already reports the staves, with their numbers", () => {
    const s = newLiveState();
    const r = processFrame(s, frame(120, 90), W, H, 1000);
    assert.ok(r.tracks.length >= 2 && r.count === r.tracks.length, `${r.tracks.length} tracks, count ${r.count}`);
    assert.equal(r.width, W);
    assert.ok(r.hint !== undefined);
});

test("boxes follow the page frame after frame between detections, and keep their ids", () => {
    const s = newLiveState();
    const start = processFrame(s, frame(120, 90), W, H, 1000);
    const ids = start.tracks.map((t) => t.id);
    const y0 = start.tracks[0].cy;
    // the camera pans: the page moves 2 px right and 3 px down per frame, over frames 2 and 3 (no new detection yet)
    let last = start;
    for (let i = 1; i < DETECT_EVERY; i++) last = processFrame(s, frame(120 - 2 * i, 90 - 3 * i), W, H, 1000 + i * 70);
    const moved = last.tracks.find((t) => t.id === ids[0])!;
    const expected = y0 + 3 * (DETECT_EVERY - 1);
    assert.ok(Math.abs(moved.cy - expected) <= 1.5, `moved ${(moved.cy - y0).toFixed(1)} px, expected ${3 * (DETECT_EVERY - 1)}`);
    assert.deepEqual(last.tracks.map((t) => t.id).filter((id) => ids.includes(id)), ids.filter((id) => last.tracks.some((t) => t.id === id)));
});

test("a long steady pan keeps the boxes on the staves (drift stays small)", () => {
    const s = newLiveState();
    let r = processFrame(s, frame(150, 130), W, H, 0), now = 0;
    const first = { id: r.tracks[0].id, cy: r.tracks[0].cy };
    // 12 frames: the camera moves up and left by 2 px per frame (the page content moves down and right)
    for (let i = 1; i <= 12; i++) { now += 70; r = processFrame(s, frame(150 - 2 * i, 130 - 2 * i), W, H, now); }
    const same = r.tracks.find((t) => t.id === first.id);
    assert.ok(same, "the first staff kept its id the whole way");
    const moved = same.cy - first.cy;
    assert.ok(moved > 21 && moved < 27, `the box moved ${moved.toFixed(1)} px (the page moved 24)`);
});

test("frames that arrive too soon are skipped", () => {
    const s = newLiveState();
    processFrame(s, frame(120, 90), W, H, 1000);
    assert.equal(tooSoon(s, 1000 + MIN_FRAME_GAP_MS - 1), true);
    assert.equal(tooSoon(s, 1000 + MIN_FRAME_GAP_MS), false);
});

test("a blank frame reports no staves and does not crash the loop", () => {
    const s = newLiveState();
    processFrame(s, frame(120, 90), W, H, 0);
    const blank = new Uint8Array(W * H * 3).fill(210);
    let r = processFrame(s, blank, W, H, 70);
    for (let i = 2; i < 16; i++) r = processFrame(s, blank, W, H, i * 70); // four detections in a row find nothing
    assert.equal(r.count, 0);
    assert.equal(r.tracks.length, 0, "old boxes are dropped after repeated misses");
});
