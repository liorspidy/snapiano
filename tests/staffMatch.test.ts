import assert from "node:assert/strict";
import { test } from "node:test";
import { matchStaves, type Track } from "../src/lib/staffMatch.ts";
import type { Detection } from "../src/lib/staffDetect.ts";

const staff = (cy: number, x0 = 40, x1 = 600, h = 40) => ({
    spacing: 6,
    corners: [{ x: x0, y: cy - h / 2 }, { x: x1, y: cy - h / 2 }, { x: x1, y: cy + h / 2 }, { x: x0, y: cy + h / 2 }] as Detection["staves"][number]["corners"],
});
const det = (...cys: number[]): Detection => ({ staves: cys.map((c) => staff(c)), angle: 0, spacing: 6, brightness: 200, width: 640, height: 800 });

test("first detection gets ids 0..n-1 in the order given", () => {
    const r = matchStaves([], det(100, 200, 300), 0);
    assert.deepEqual(r.tracks.map((t) => t.id), [0, 1, 2]);
    assert.equal(r.nextId, 3);
});

test("the same staves a little moved keep their ids (colours stay put)", () => {
    const first = matchStaves([], det(100, 200, 300), 0);
    const moved = matchStaves(first.tracks, det(108, 211, 304), first.nextId);
    assert.deepEqual(moved.tracks.map((t) => t.id), [0, 1, 2]);
    assert.equal(moved.nextId, 3);
});

test("a new staff appearing gets a new id; the others keep theirs", () => {
    const first = matchStaves([], det(100, 300), 0);
    const next = matchStaves(first.tracks, det(100, 200, 300), first.nextId);
    assert.deepEqual(next.tracks.map((t) => t.id), [0, 2, 1]);
});

test("a staff that disappears and returns later is new (ids are never reused)", () => {
    const a = matchStaves([], det(100, 200), 0);
    const b = matchStaves(a.tracks, det(100), a.nextId);
    const c = matchStaves(b.tracks, det(100, 200), b.nextId);
    assert.deepEqual(c.tracks.map((t) => t.id), [0, 2]);
});

test("a jump far beyond a staff's height is a different staff", () => {
    const a = matchStaves([], det(100), 0);
    const b = matchStaves(a.tracks, det(500), a.nextId);
    assert.deepEqual(b.tracks.map((t) => t.id), [1]);
});

test("two staves never share one old id", () => {
    const a = matchStaves([], det(100), 0);
    const b = matchStaves(a.tracks, det(95, 110), a.nextId);
    assert.equal(new Set(b.tracks.map((t) => t.id)).size, 2);
});

test("the track holds the centre, size and tilt of the box", () => {
    const tilted: Detection = { ...det(100), staves: [{ spacing: 6, corners: [{ x: 40, y: 70 }, { x: 140, y: 80 }, { x: 140, y: 120 }, { x: 40, y: 110 }] }] };
    const [t] = matchStaves([] as Track[], tilted, 0).tracks;
    assert.ok(Math.abs(t.cx - 90) < 0.01 && Math.abs(t.cy - 95) < 0.01);
    assert.ok(Math.abs(t.angle - Math.atan2(10, 100)) < 1e-9);
});
