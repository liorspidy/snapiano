import assert from "node:assert/strict";
import { test } from "node:test";
import { detectStaves, liveHint, type Detection } from "../src/lib/staffDetect.ts";

// Draws a paper-coloured picture with `count` staves (5 thin dark lines, 6 px apart) tilted by `tiltDeg`, plus some "notes".
function page(w: number, h: number, count: number, tiltDeg = 0, paper = 225, ink = 40) {
    const g = new Uint8Array(w * h).fill(paper);
    const t = Math.tan((tiltDeg * Math.PI) / 180);
    const gap = Math.floor((h - 80) / count);
    for (let s = 0; s < count; s++) {
        const top = 40 + s * gap;
        for (let l = 0; l < 5; l++) {
            for (let x = 40; x < w - 40; x++) {
                const y = Math.round(top + l * 6 + (x - w / 2) * t);
                if (y >= 0 && y < h) g[y * w + x] = ink;
            }
        }
        for (let x = 70; x < w - 70; x += 38) { // note heads and stems
            const y = Math.round(top + 9 + (x - w / 2) * t);
            for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (y + dy >= 0 && y + dy < h) g[(y + dy) * w + x + dx] = ink;
            for (let dy = -22; dy <= 0; dy++) if (y + dy >= 0) g[(y + dy) * w + x + 3] = ink;
        }
    }
    return g;
}

test("finds every staff on a flat synthetic page", () => {
    const d = detectStaves(page(640, 800, 6), 640, 800);
    assert.equal(d.staves.length, 6);
    assert.ok(Math.abs(d.spacing - 6) < 1, `spacing ${d.spacing}`);
});

test("finds the staves and the tilt of a tilted page", () => {
    for (const tilt of [-5, -2, 3, 6]) {
        const d = detectStaves(page(640, 800, 5, tilt), 640, 800);
        assert.equal(d.staves.length, 5, `tilt ${tilt}`);
        assert.ok(Math.abs(d.angle - tilt) <= 1.5, `tilt ${tilt} measured as ${d.angle}`);
    }
});

test("a blank page has no staves", () => {
    const d = detectStaves(new Uint8Array(640 * 800).fill(230), 640, 800);
    assert.equal(d.staves.length, 0);
    assert.equal(liveHint(d), "none");
});

test("random noise does not produce staves", () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const g = new Uint8Array(640 * 800).map(() => 120 + Math.floor(rnd() * 100));
    assert.equal(detectStaves(g, 640, 800).staves.length, 0);
});

test("a dark picture is reported as dark", () => {
    assert.equal(liveHint(detectStaves(page(640, 800, 4, 0, 40, 12), 640, 800)), "dark");
});

const box = (cy: number, spacing = 6): Detection["staves"][number] => ({ spacing, corners: [{ x: 50, y: cy - 20 }, { x: 590, y: cy - 20 }, { x: 590, y: cy + 20 }, { x: 50, y: cy + 20 }] });
const det = (staves: Detection["staves"], spacing = 6, brightness = 200): Detection => ({ staves, angle: 0, spacing, brightness, width: 640, height: 800 });

test("hints follow the detection", () => {
    assert.equal(liveHint(det([box(200), box(400)])), "ready");
    assert.equal(liveHint(det([box(400)])), "partial");
    assert.equal(liveHint(det([box(400), box(500)], 2.5)), "closer");
    assert.equal(liveHint(det([box(8), box(400)])), "edge");   // top staff cut off
    assert.equal(liveHint(det([box(400), box(795)])), "edge"); // bottom staff cut off
    assert.equal(liveHint(det([box(400), box(500)], 6, 50)), "dark");
});
