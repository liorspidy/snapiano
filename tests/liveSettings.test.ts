import assert from "node:assert/strict";
import { test } from "node:test";
import { createSnapshotLoop } from "../src/lib/snapshotLoop.ts";

// liveSettings imports AsyncStorage (native), so its pure helpers are checked through a tiny copy of the same rules.
const MIN = 0, MAX = 5000, DEFAULT = 100;
const clamp = (ms: number) => (Number.isFinite(ms) ? Math.min(MAX, Math.max(MIN, Math.round(ms))) : DEFAULT);
const next = (ms: number, d: 1 | -1) => clamp(ms + d * (ms < 500 || (ms === 500 && d < 0) ? 50 : 250));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("the interval is kept inside its limits and bad values fall back to the default", () => {
    assert.equal(clamp(-5), 0);
    assert.equal(clamp(99999), 5000);
    assert.equal(clamp(NaN), 100);
    assert.equal(clamp(120.6), 121);
});

test("the - and + steps are fine below half a second and coarser above, and stop at the ends", () => {
    assert.equal(next(100, 1), 150);
    assert.equal(next(100, -1), 50);
    assert.equal(next(0, -1), 0);
    assert.equal(next(450, 1), 500);
    assert.equal(next(500, 1), 750);
    assert.equal(next(500, -1), 450);
    assert.equal(next(5000, 1), 5000);
});

test("the loop reads a changed interval on the next cycle, without being restarted", async () => {
    let interval = 400;
    let starts = 0;
    const loop = createSnapshotLoop({ run: async () => { starts++; await sleep(1); }, minIntervalMs: () => interval });
    loop.start();
    await sleep(900);
    const slow = starts;
    interval = 20;
    await sleep(900);
    await loop.stop();
    assert.ok(slow <= 4, `slow phase started ${slow} jobs`);
    assert.ok(starts - slow >= 10, `fast phase started ${starts - slow} jobs`);
});
