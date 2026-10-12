import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { CircleCheck, Info } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { LiveHint } from "@/lib/staffDetect";
import type { Track } from "@/lib/staffMatch";
import { Text } from "@/ui/Text/Text";
import classes from "./StaffOverlay.module.scss";

type Props = {
    tracks: Track[];
    /** Size of the picture the tracks are measured in. */
    source?: { width: number; height: number };
    hint?: LiveHint;
    count: number;
    detectedAt?: number;
    moving: boolean;
    /** Size of the preview the boxes are drawn on. */
    width: number;
    height: number;
};

const ANNOUNCE_COOLDOWN_MS = 5000;
const GLIDE_MS = 150; // shorter than before: detections now arrive much more often
const STALE_MS = 4000;

// One colour per staff so they can be told apart (each also has its number: colour is never the only signal).
// Blue, orange and purple are left out on purpose: blue and orange mean the right and left hand in this app.
const PALETTE = ["#E5484D", "#30A46C", "#FFD60A", "#12A594", "#E93D82", "#99D52A", "#AD7F58", "#FFFFFF"];

type Shape = { left: number; top: number; width: number; height: number; angle: number };

// One staff's box. It keeps its own animated values, so a new detection makes it glide to the new place.
function Box({ track, shape, label }: { track: Track; shape: Shape; label: number }) {
    const v = useRef({
        left: new Animated.Value(shape.left), top: new Animated.Value(shape.top),
        width: new Animated.Value(shape.width), height: new Animated.Value(shape.height), angle: new Animated.Value(shape.angle),
    }).current;
    useEffect(() => {
        Animated.parallel(
            (["left", "top", "width", "height", "angle"] as const).map((k) =>
                Animated.timing(v[k], { toValue: shape[k], duration: GLIDE_MS, useNativeDriver: false })),
        ).start();
    }, [shape, v]);
    const colour = PALETTE[track.id % PALETTE.length];
    return (
        <Animated.View
            style={[classes.box, {
                borderColor: colour, backgroundColor: `${colour}2E`,
                left: v.left, top: v.top, width: v.width, height: v.height,
                transform: [{ rotate: v.angle.interpolate({ inputRange: [-1.6, 1.6], outputRange: ["-1.6rad", "1.6rad"] }) }],
            }]}
        >
            <View style={[classes.badge, { backgroundColor: colour }]}>
                <Text variant="caption" style={classes.badgeText}>{label}</Text>
            </View>
        </Animated.View>
    );
}

// Boxes around the staves found in the latest snapshot, plus a short hint. `width` and `height` are the preview's size; the
// snapshot fills the preview the same way the camera does (scaled to cover, centred). The boxes come from snapshots a second
// or so apart, so while the phone moves they are faded (they would point at the wrong place) and after a few seconds without a
// new detection they are hidden.
export function StaffOverlay({ tracks, source, hint, count, detectedAt, moving, width, height }: Props) {
    const { t } = useTranslation();
    const lastHint = useRef<string | undefined>(undefined);
    const lastAt = useRef(0);
    const fade = useRef(new Animated.Value(1)).current;

    // A once-a-second tick, so boxes also disappear when no new detection arrives (the clock alone does not re-render anything).
    const [, setTick] = useState(0);
    useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
    const stale = !!detectedAt && Date.now() - detectedAt > STALE_MS;
    useEffect(() => {
        Animated.timing(fade, { toValue: moving ? 0.25 : 1, duration: 200, useNativeDriver: true }).start();
    }, [moving, fade]);

    // Spoken only when the kind of hint changes and at most once per cooldown; the device's screen-reader settings decide if anything is heard.
    useEffect(() => {
        if (!hint || moving || hint === lastHint.current) return;
        lastHint.current = hint;
        if (Date.now() - lastAt.current < ANNOUNCE_COOLDOWN_MS) return;
        lastAt.current = Date.now();
        const spoken = { ready: "scan.liveReady", partial: "scan.livePartial", none: "scan.liveNone", dark: "scan.hintDark", closer: "scan.liveCloser", edge: "scan.liveEdge" }[hint];
        AccessibilityInfo.announceForAccessibility(t(spoken, { count }));
    }, [hint, moving]);

    if (!source || !hint || !width || !height) return null;

    const scale = Math.max(width / source.width, height / source.height);
    const dx = (width - source.width * scale) / 2;
    const dy = (height - source.height * scale) / 2;
    const text = moving ? t("scan.liveMoving") : {
        ready: t("scan.liveReady", { count }),
        partial: t("scan.livePartial"),
        none: t("scan.liveNone"),
        dark: t("scan.hintDark"),
        closer: t("scan.liveCloser"),
        edge: t("scan.liveEdge"),
    }[hint];

    return (
        <View pointerEvents="none" style={classes.layer}>
            {!stale && (
                <Animated.View style={[classes.layer, { opacity: fade }]}>
                    {tracks.map((tr, i) => {
                        const w = tr.w * scale, h = tr.h * scale;
                        const shape: Shape = { left: tr.cx * scale + dx - w / 2, top: tr.cy * scale + dy - h / 2, width: w, height: h, angle: tr.angle };
                        return <Box key={tr.id} track={tr} shape={shape} label={i + 1} />;
                    })}
                </Animated.View>
            )}
            <View style={classes.hint} accessible accessibilityLabel={text}>
                {hint === "ready" && !moving ? <CircleCheck color="#FFFFFF" size={20} /> : <Info color="#FFFFFF" size={20} />}
                <Text variant="label" style={classes.hintText}>{text}</Text>
            </View>
        </View>
    );
}
