import { Ref, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput, usePhotoOutput } from "react-native-vision-camera";
import { createResizer, type Resizer } from "react-native-vision-camera-resizer";
import { createSynchronizable, scheduleOnRN } from "react-native-worklets";
import { newLiveState, processFrame, tooSoon, type FrameReport, type LiveState } from "@/lib/liveFrame";
import type { LiveHint } from "@/lib/staffDetect";
import type { Track } from "@/lib/staffMatch";
import classes from "./LiveCamera.module.scss";

// The camera used in a development build: every frame is shrunk on the GPU, the picture shift is measured on every frame, and
// a full staff detection runs every few frames. Boxes follow the page between detections. Frames are processed on the camera's
// own thread, so the screen stays responsive. Expo Go does not have the native parts this needs (the scan screen falls back).

export type LiveResult = FrameReport & { tracks: Track[]; hint?: LiveHint };
export type LiveCameraHandle = { capture(): Promise<string | undefined> };

type Props = {
    ref?: Ref<LiveCameraHandle>;
    live: boolean;
    torch: boolean;
    /** Size of the preview in screen points: the frames are cut to the same shape so boxes line up with what is shown. */
    width: number;
    height: number;
    onResult: (r: LiveResult) => void;
    onReady?: () => void;
};

const FRAME_WIDTH = 640;       // pixels across of the picture analysed

export function LiveCamera({ ref, live, torch, width, height, onResult, onReady }: Props) {
    const device = useCameraDevice("back");
    const { hasPermission, requestPermission } = useCameraPermission();
    const photoOutput = usePhotoOutput({ qualityPrioritization: "quality", containerFormat: "jpeg" }) // always JPEG: the server and the file check only accept JPEG and PNG;
    const [resizer, setResizer] = useState<Resizer>();
    const liveFlag = useMemo(() => createSynchronizable(live), []);
    useEffect(() => { liveFlag.setBlocking(live); }, [live, liveFlag]);
    useEffect(() => { if (!hasPermission) void requestPermission(); }, [hasPermission, requestPermission]);

    // frames are cut to the preview's shape (both use "cover"), so a point in the frame is a point in the preview
    const frameHeight = width > 0 ? Math.max(2, Math.round(((FRAME_WIDTH * height) / width) / 2) * 2) : 0;
    useEffect(() => {
        if (!frameHeight) return;
        let cancelled = false, made: Resizer | undefined;
        void createResizer({ width: FRAME_WIDTH, height: frameHeight, channelOrder: "rgb", dataType: "uint8", pixelLayout: "interleaved", scaleMode: "cover" })
            .then((r) => { if (cancelled) return; made = r; setResizer(r); })
            .catch(() => undefined);
        return () => { cancelled = true; setResizer(undefined); made = undefined; };
    }, [frameHeight]);

    const deliver = useCallback((r: LiveResult) => onResult(r), [onResult]);

    const frameOutput = useFrameOutput({
        pixelFormat: "yuv",
        dropFramesWhileBusy: true,
        onFrame(frame) {
            "worklet";
            // Keeps its state between frames in this thread's own global object.
            const g = globalThis as unknown as { __snapianoLive?: LiveState };
            const st = (g.__snapianoLive ??= newLiveState());
            const now = Date.now();
            if (!resizer || !liveFlag.getBlocking() || tooSoon(st, now)) { frame.dispose(); return; }
            const small = resizer.resize(frame);
            const w = small.width, h = small.height;
            const rgb = new Uint8Array(small.getPixelBuffer());
            small.dispose();
            frame.dispose();
            scheduleOnRN(deliver, processFrame(st, rgb, w, h, now));
        },
    });

    useImperativeHandle(ref, () => ({
        async capture() {
            // Silent where the platform allows it, flash off (the torch button is the light).
            const file = await photoOutput.capturePhotoToFile({ flashMode: "off", enableShutterSound: false }, {});
            return file.filePath.startsWith("file://") ? file.filePath : `file://${file.filePath}`;
        },
    }), [photoOutput]);

    if (!device) return null;
    return (
        <Camera
            style={classes.fill}
            device={device}
            isActive
            outputs={[photoOutput, frameOutput]}
            resizeMode="cover" // the frames are cut with "cover" too, so boxes line up with the preview
            torchMode={torch ? "on" : "off"}
            enableNativeZoomGesture
            enableNativeTapToFocusGesture
            onPreviewStarted={onReady}
        />
    );
}
