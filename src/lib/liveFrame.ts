import { estimateShift, rgbToGray } from "./motionShift.ts";
import { detectStaves, liveHint, type LiveHint } from "./staffDetect.ts";
import { applyShift, emptyTracker, updateWithDetection, type TrackerState } from "./staffTracker.ts";

// Everything that happens for one camera frame, as one function. The camera runs it on its own thread; the tests run it in
// plain Node on recorded frames. `state` is kept by the caller between frames.

export type LiveState = { prev: Uint8Array | null; tracker: TrackerState; n: number; last: number; hint?: LiveHint; count: number };
export type FrameReport = { tracks: { id: number; cx: number; cy: number; w: number; h: number; angle: number }[]; hint?: LiveHint; count: number; width: number; height: number; at: number };

export function newLiveState(): LiveState {
    'worklet';
    return { prev: null, tracker: emptyTracker(), n: 0, last: 0, count: 0 };
}

export const MIN_FRAME_GAP_MS = 60;  // at most about 16 analysed frames per second
export const DETECT_EVERY = 3;       // a full staff detection every 3rd analysed frame
const MAX_SHIFT = 10;                // pixels searched per frame

/** True when this frame should be skipped (too soon after the last analysed one). */
export function tooSoon(state: LiveState, now: number): boolean {
    'worklet';
    return now - state.last < MIN_FRAME_GAP_MS;
}

/** Analyses one frame (interleaved RGB bytes, width x height). Mutates `state` and returns what the screen needs. */
export function processFrame(state: LiveState, rgb: Uint8Array, w: number, h: number, now: number): FrameReport {
    'worklet';
    state.last = now;
    const gray = rgbToGray(rgb, w, h, false, false);
    if (state.prev && state.prev.length === gray.length) {
        const s = estimateShift(state.prev, gray, w, h, MAX_SHIFT);
        if (s.quality > 0) state.tracker = applyShift(state.tracker, s.dx, s.dy);
    }
    state.prev = gray;
    state.n++;
    if (state.n % DETECT_EVERY === 1) {
        const det = detectStaves(gray, w, h);
        state.tracker = updateWithDetection(state.tracker, det);
        state.hint = liveHint(det);
        state.count = det.staves.length;
    }
    return {
        tracks: state.tracker.tracks.map((t) => ({ id: t.id, cx: t.cx, cy: t.cy, w: t.w, h: t.h, angle: t.angle })),
        hint: state.hint, count: state.count, width: w, height: h, at: now,
    };
}
