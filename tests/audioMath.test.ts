import assert from "node:assert/strict";
import { test } from "node:test";
import { CEILING, KNEE, limit, limiterCurve, notesInWindow } from "../src/audio/audioMath.ts";

test("the limiter leaves normal levels untouched", () => {
    for (const x of [0, 0.1, -0.3, KNEE, -KNEE]) assert.equal(limit(x), x);
});

test("the limiter never reaches 1.0, even for peaks far above it", () => {
    for (const x of [0.8, 1, 2, 10, -5]) assert.ok(Math.abs(limit(x)) <= CEILING);
    assert.ok(limiterCurve().every((v) => Math.abs(v) <= CEILING));
    assert.ok(CEILING < 1);
});

test("the limiter is smooth at the knee and keeps getting louder", () => {
    assert.ok(Math.abs(limit(KNEE + 1e-6) - KNEE) < 1e-5);
    assert.ok(limit(0.7) < limit(0.9) && limit(0.9) < limit(1.5));
});

test("consecutive windows schedule every note exactly once", () => {
    const notes = [0, 0, 0.5, 1, 1.25, 2].map((s) => ({ s }));
    const seen: number[] = [];
    let from = -0.001;
    for (const to of [0.2, 0.7, 1.1, 1.3, 3]) {
        seen.push(...notesInWindow(notes, from, to).map((n) => n.s));
        from = to;
    }
    assert.deepEqual(seen, [0, 0, 0.5, 1, 1.25, 2]);
});
