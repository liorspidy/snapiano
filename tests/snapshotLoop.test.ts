// Run: cd FE && node --experimental-strip-types --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { createSnapshotLoop } from "../src/lib/snapshotLoop.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A fake job: counts concurrent runs, starts, finishes and cleanups (the `finally`), and can fail on demand.
function fakeJob(durationMs: number, failEvery = 0) {
    const s = { running: 0, maxRunning: 0, started: 0, cleaned: 0, cancelledSeen: 0 };
    const run = async (isCancelled: () => boolean) => {
        s.started++; s.running++; s.maxRunning = Math.max(s.maxRunning, s.running);
        try {
            await sleep(durationMs);
            if (isCancelled()) s.cancelledSeen++;
            if (failEvery && s.started % failEvery === 0) throw new Error("camera busy");
        } finally { s.running--; s.cleaned++; }
    };
    return { s, run };
}

test("never runs two jobs at once", async () => {
    const { s, run } = fakeJob(60);
    const loop = createSnapshotLoop({ run, minIntervalMs: 10 });
    loop.start();
    await sleep(500);
    await loop.stop();
    assert.equal(s.maxRunning, 1);
    assert.ok(s.started >= 3);
});

test("keeps the minimum interval between starts", async () => {
    const { s, run } = fakeJob(1);
    const loop = createSnapshotLoop({ run, minIntervalMs: 100 });
    loop.start();
    await sleep(450);
    await loop.stop();
    assert.ok(s.started <= 5, `started ${s.started} jobs in 450 ms`);
    assert.ok(s.started >= 3);
});

test("stop waits for the job in progress and nothing starts afterwards", async () => {
    const { s, run } = fakeJob(120);
    const loop = createSnapshotLoop({ run, minIntervalMs: 10 });
    loop.start();
    await sleep(50);
    assert.equal(s.running, 1);
    await loop.stop();
    assert.equal(s.running, 0, "stop() resolved while a job was still running");
    const started = s.started;
    await sleep(300);
    assert.equal(s.started, started);
});

test("toggling off and on while a job runs does not create a second loop", async () => {
    const { s, run } = fakeJob(100);
    const loop = createSnapshotLoop({ run, minIntervalMs: 20 });
    loop.start();
    await sleep(40);
    void loop.stop(); // not awaited, like an effect cleanup followed by a new effect
    loop.start();
    await sleep(200);
    void loop.stop();
    loop.start();
    await sleep(400);
    await loop.stop();
    assert.equal(s.maxRunning, 1, "two snapshots ran at the same time");
});

test("a failing job does not stop the loop and still cleans up", async () => {
    const { s, run } = fakeJob(5, 2); // every second job throws
    const loop = createSnapshotLoop({ run, minIntervalMs: 20 });
    loop.start();
    await sleep(400);
    await loop.stop();
    assert.ok(s.started >= 5);
    assert.equal(s.cleaned, s.started);
});

test("a job cancelled mid-way is told so and still reaches its cleanup", async () => {
    const { s, run } = fakeJob(100);
    const loop = createSnapshotLoop({ run, minIntervalMs: 10 });
    loop.start();
    await sleep(30);
    await loop.stop();
    assert.equal(s.cancelledSeen, 1);
    assert.equal(s.cleaned, s.started);
});

test("start twice does not double the loop", async () => {
    const { s, run } = fakeJob(30);
    const loop = createSnapshotLoop({ run, minIntervalMs: 50 });
    loop.start(); loop.start();
    await sleep(300);
    await loop.stop();
    assert.equal(s.maxRunning, 1);
    assert.ok(s.started <= 7, `started ${s.started}: a doubled loop would start about twice as many`);
});

// The scheduling used before this fix (shared stop flag, no generation), kept here to show the race the new design removes.
test("OLD design: stop then start while a job runs lets the old loop carry on beside the new one", async () => {
    const s = { running: 0, maxRunning: 0 };
    let stopped = false;
    const job = async () => { s.running++; s.maxRunning = Math.max(s.maxRunning, s.running); await sleep(100); s.running--; };
    const startOld = () => {
        let timer: ReturnType<typeof setTimeout>;
        const cycle = async () => { if (stopped) return; await job(); if (!stopped) timer = setTimeout(cycle, 10); };
        timer = setTimeout(cycle, 0);
        return () => { stopped = true; clearTimeout(timer); };
    };
    stopped = false; const stopA = startOld();
    await sleep(40);
    stopA(); stopped = false; startOld(); // effect cleanup, then the next effect run
    await sleep(500);
    stopped = true;
    await sleep(150);
    assert.equal(s.maxRunning, 2, "expected the old design to overlap");
});
