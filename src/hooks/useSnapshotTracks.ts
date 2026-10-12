import { useMemo, useRef } from "react";
import { Detection } from "@/lib/staffDetect";
import { matchStaves, Track } from "@/lib/staffMatch";

/** Turns the detections of the snapshot camera into tracks with steady ids, so boxes keep their colour and glide. */
export function useSnapshotTracks(detection?: Detection): Track[] {
    const state = useRef<{ tracks: Track[]; nextId: number; source?: Detection }>({ tracks: [], nextId: 0 });
    return useMemo(() => {
        if (!detection) { state.current = { tracks: [], nextId: state.current.nextId }; return []; }
        if (state.current.source !== detection) {
            const r = matchStaves(state.current.tracks, detection, state.current.nextId);
            state.current = { tracks: r.tracks, nextId: r.nextId, source: detection };
        }
        return state.current.tracks;
    }, [detection]);
}
