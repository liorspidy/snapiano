import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { CameraView } from "expo-camera";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import jpeg from "jpeg-js";
import { liveSettings, loadLiveSettings } from "@/lib/liveSettings";
import { createSnapshotLoop } from "@/lib/snapshotLoop";
import { Detection, detectStaves } from "@/lib/staffDetect";

const WIDTH = 640;
// Bounded rate: a new snapshot starts at most once per interval (set in the admin screen, 0.1 s by default) and never while another
// one is still running, so the real rate is also limited by how long one capture and analysis take.
// Snapshots that could not be deleted (for example the app was killed in between) are retried on the next run.
const leftovers = new Set<string>();

const bytesFromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

function sweepLeftovers() {
    for (const uri of [...leftovers]) { try { new File(uri).delete(); } catch { /* already gone */ } leftovers.delete(uri); }
}

/**
 * While `active`, grabs a small silent snapshot from the camera over and over and looks for staves in it on the phone.
 * It is a snapshot loop (the camera tool gives no live video frames in Expo Go), so boxes update every second or two.
 * Scheduling lives in createSnapshotLoop (tested): one snapshot at a time, safe to stop and start at any moment.
 * `pause()` waits for a snapshot in progress to finish, so taking the real photo never overlaps with one.
 */
export function useLiveStaves(camera: RefObject<CameraView | null>, active: boolean) {
    const [found, setFound] = useState<{ detection: Detection; at: number }>();
    const wanted = useRef(active);
    wanted.current = active;

    const loop = useMemo(
        () =>
            createSnapshotLoop({
                minIntervalMs: () => liveSettings.intervalMs,
                firstDelayMs: 600,
                minGapMs: 0,
                run: async (isCancelled) => {
                    sweepLeftovers();
                    const files: File[] = [];
                    try {
                        const shot = await camera.current?.takePictureAsync({ quality: 0.3, skipProcessing: false, shutterSound: false });
                        if (!shot) return;
                        files.push(new File(shot.uri));
                        leftovers.add(shot.uri);
                        if (isCancelled()) return;
                        const rendered = await ImageManipulator.manipulate(shot.uri).resize({ width: WIDTH }).renderAsync();
                        const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
                        files.push(new File(small.uri));
                        leftovers.add(small.uri);
                        if (isCancelled()) return;
                        const img = jpeg.decode(bytesFromBase64(small.base64 ?? ""), { useTArray: true });
                        const gray = new Uint8Array(img.width * img.height);
                        for (let i = 0; i < gray.length; i++) gray[i] = (img.data[i * 4] * 77 + img.data[i * 4 + 1] * 150 + img.data[i * 4 + 2] * 29) >> 8;
                        if (!isCancelled()) setFound({ detection: detectStaves(gray, img.width, img.height), at: Date.now() });
                    } finally {
                        // runs on success, failure and cancellation: snapshots must not pile up in the cache
                        for (const f of files) { try { f.delete(); leftovers.delete(f.uri); } catch { /* stays in leftovers, retried next run */ } }
                    }
                },
            }),
        [camera],
    );

    useEffect(() => { void loadLiveSettings(); }, []);

    useEffect(() => {
        if (!active) { void loop.stop(); setFound(undefined); return; }
        loop.start();
        // No snapshots while the app is in the background.
        const sub = AppState.addEventListener("change", (state) => {
            if (state !== "active") void loop.stop();
            else if (wanted.current) loop.start();
        });
        return () => { sub.remove(); void loop.stop().then(sweepLeftovers); };
    }, [loop, active]);

    const pause = useCallback(() => loop.stop(), [loop]);
    /** Starts the loop again after a pause() that did not lead to a photo. */
    const resume = useCallback(() => { if (wanted.current) loop.start(); }, [loop]);
    return { detection: found?.detection, detectedAt: found?.at, pause, resume };
}
