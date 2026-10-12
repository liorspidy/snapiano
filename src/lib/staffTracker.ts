import type { Detection } from "./staffDetect.ts";
import { matchStaves, type Track } from "./staffMatch.ts"; // the .ts lets the plain-Node tests load this file

// Keeps the boxes on the staves between full detections: every frame moves them by the measured picture shift (cheap), and every
// full detection pulls them to where the staves really are (accurate, slower). Pure code, also used inside the frame processor.

export type TrackedStaff = Track & { misses: number };
export type TrackerState = { tracks: TrackedStaff[]; nextId: number };

export function emptyTracker(): TrackerState {
    'worklet';
    return { tracks: [], nextId: 0 };
}

/** Moves every box with the picture. Call once per frame with the shift measured against the previous frame. */
export function applyShift(state: TrackerState, dx: number, dy: number): TrackerState {
    'worklet';
    if (!dx && !dy) return state;
    return { nextId: state.nextId, tracks: state.tracks.map((t) => ({ ...t, cx: t.cx + dx, cy: t.cy + dy })) };
}

/**
 * Blends a full detection into the tracks. A matched box moves `pull` of the way to the detected position (so one noisy
 * detection does not make the boxes jump) and takes on its size and tilt. New staves appear. A box not seen in the detection
 * is kept for up to `maxMisses` detections, because a detection can miss a staff for a moment, and is then dropped.
 */
export function updateWithDetection(state: TrackerState, det: Detection, pull = 0.6, maxMisses = 3): TrackerState {
    'worklet';
    const { tracks: found, nextId } = matchStaves(state.tracks, det, state.nextId);
    const old: Record<number, TrackedStaff> = {};
    for (const t of state.tracks) old[t.id] = t;
    const seen: Record<number, boolean> = {};
    const next: TrackedStaff[] = found.map((f) => {
        seen[f.id] = true;
        const o = old[f.id];
        if (!o) return { ...f, misses: 0 };
        return {
            id: f.id, misses: 0,
            cx: o.cx + (f.cx - o.cx) * pull, cy: o.cy + (f.cy - o.cy) * pull,
            w: o.w + (f.w - o.w) * pull, h: o.h + (f.h - o.h) * pull, angle: o.angle + (f.angle - o.angle) * pull,
        };
    });
    for (const t of state.tracks) if (!seen[t.id] && t.misses + 1 <= maxMisses) next.push({ ...t, misses: t.misses + 1 });
    next.sort((a, b) => a.cy - b.cy);
    return { tracks: next, nextId };
}
