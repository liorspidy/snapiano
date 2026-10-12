import type { Detection } from "./staffDetect";

// Keeps a staff recognisable from one snapshot to the next, so its colour and number stay put and its box can glide
// to the new position instead of jumping. Pure code (no React) so it can be tested.

export type Track = { id: number; cx: number; cy: number; w: number; h: number; angle: number };

const toTrack = (s: Detection["staves"][number], id: number): Track => {
    'worklet';
    const [a, b, c, d] = s.corners;
    return {
        id,
        cx: (a.x + b.x + c.x + d.x) / 4,
        cy: (a.y + b.y + c.y + d.y) / 4,
        w: Math.hypot(b.x - a.x, b.y - a.y),
        h: Math.hypot(d.x - a.x, d.y - a.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
};

/**
 * Matches the staves of a new detection to the tracks of the previous one (nearest first, within a distance that scales with
 * the staff height). Matched staves keep their id; the others get new ids. `nextId` is the first unused id.
 * Ids are never reused, so a staff that disappears and returns later is a new staff with a new colour.
 */
export function matchStaves(prev: Track[], det: Detection, nextId: number): { tracks: Track[]; nextId: number } {
    'worklet';
    const fresh = det.staves.map((s) => toTrack(s, -1));
    const pairs: { i: number; j: number; cost: number }[] = [];
    fresh.forEach((f, i) =>
        prev.forEach((p, j) => {
            const reach = Math.max(p.h, f.h) * 1.5 + 12;
            const dist = Math.hypot(f.cx - p.cx, (f.cy - p.cy) * 1.3);
            if (dist <= reach) pairs.push({ i, j, cost: dist });
        }),
    );
    pairs.sort((a, b) => a.cost - b.cost);
    const usedNew = new Set<number>(), usedOld = new Set<number>();
    for (const { i, j } of pairs) {
        if (usedNew.has(i) || usedOld.has(j)) continue;
        usedNew.add(i); usedOld.add(j);
        fresh[i].id = prev[j].id;
    }
    for (const f of fresh) if (f.id < 0) f.id = nextId++;
    return { tracks: fresh, nextId };
}
