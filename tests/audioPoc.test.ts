import assert from "node:assert/strict";
import { test } from "node:test";
import { blocksAtFullScale, dense, PRESETS, pulse, roomImpulse, Scheduler, stats, type PocNote } from "../src/audio/poc/poc.ts";

// A fake audio clock the test moves by hand.
function rig(notes: PocNote[], cancel: boolean, lookahead = 1) {
    const clock = { t: 10 };
    const played: { m: number; s: number; t: number }[] = [];
    const sch = new Scheduler(notes, {
        lookahead,
        now: () => clock.t,
        play: (n, t) => played.push({ m: n.m, s: n.s, t }),
        cancelAfter: cancel
            ? (t) => {
                  for (let i = played.length - 1; i >= 0; i--) if (played[i].t > t) played.splice(i, 1);
              }
            : undefined,
    });
    return { clock, played, sch };
}

test("every note is scheduled exactly once, on time, with lookahead slack", () => {
    const { clock, played, sch } = rig(pulse(16, 0.25), false);
    sch.start(120);
    while (clock.t < sch.endTime + 1) {
        clock.t += 0.1;
        sch.tick();
    }
    assert.equal(played.length, 64);
    assert.deepEqual(played.map((p) => p.s), pulse(16, 0.25).map((n) => n.s));
    played.forEach((p, i) => assert.ok(Math.abs(p.t - (10.05 + i * 0.125)) < 1e-9));
    assert.ok(sch.log.every((e) => e.slack >= 0));
});

test("A′ tempo change: future notes are taken back and replayed at the new tempo, none lost or doubled", () => {
    const { clock, played, sch } = rig(pulse(32, 0.5), true);
    sch.start(60);
    for (let i = 0; i < 25; i++) {
        clock.t += 0.1;
        sch.tick();
    }
    sch.setTempo(120);
    while (clock.t < sch.endTime + 1) {
        clock.t += 0.1;
        sch.tick();
    }
    assert.deepEqual(played.map((p) => p.s), pulse(32, 0.5).map((n) => n.s));
    const change = sch.retimes[1];
    for (let i = 1; i < played.length; i++) {
        const gap = played[i].t - played[i - 1].t;
        // 0.5 beat = 0.5 s before the change, 0.25 s after; the one gap spanning it lies in between.
        if (played[i].t <= change.t) assert.ok(Math.abs(gap - 0.5) < 1e-9);
        else if (played[i - 1].t > change.t) assert.ok(Math.abs(gap - 0.25) < 1e-9);
        else assert.ok(gap > 0.25 - 1e-9 && gap < 0.5 + 1e-9);
    }
});

test("production-style tempo change keeps the notes already in the lookahead at the old tempo", () => {
    const { clock, played, sch } = rig(pulse(32, 0.5), false, 0.12);
    sch.start(60);
    for (let i = 0; i < 25; i++) {
        clock.t += 0.033;
        sch.tick();
    }
    sch.setTempo(120);
    while (clock.t < sch.endTime + 1) {
        clock.t += 0.033;
        sch.tick();
    }
    assert.deepEqual(played.map((p) => p.s), pulse(32, 0.5).map((n) => n.s));
});

test("a JS stall longer than the lookahead makes notes late (negative slack)", () => {
    const { clock, sch } = rig(pulse(8, 0.25), false, 0.12);
    sch.start(120);
    clock.t += 0.3; // 300 ms without a tick
    sch.tick();
    assert.ok(sch.log.some((e) => e.slack < 0));
});

test("the reverb impulse is deterministic and has unit energy", () => {
    const a = roomImpulse(48000, 1);
    const b = roomImpulse(48000, 1);
    assert.deepEqual(a, b);
    const e = a.reduce((s, x) => s + x * x, 0);
    assert.ok(Math.abs(e - 1) < 1e-4);
    assert.ok(a.slice(0, Math.floor(48000 * 0.015)).every((x) => x === 0));
});

test("sequences: dense chords cover A0..C8, the 60 s pulse has 480 notes", () => {
    const ms = dense().map((n) => n.m);
    assert.equal(Math.min(...ms), 21);
    assert.equal(Math.max(...ms), 108);
    assert.equal(PRESETS.find((p) => p.id === "steady60")!.notes.length, 480);
});

test("measurement helpers", () => {
    assert.deepEqual(stats([3, 1, 2]).max, 3);
    const x = new Float32Array(256);
    x[5] = 1;
    x[200] = 0.5;
    assert.equal(blocksAtFullScale(x), 1);
});
