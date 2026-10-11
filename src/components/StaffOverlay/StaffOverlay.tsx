import { useEffect, useRef } from "react";
import { AccessibilityInfo, View } from "react-native";
import { CircleCheck, Info } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Detection, liveHint } from "@/lib/staffDetect";
import { color } from "@/theme/tokens";
import { Text } from "@/ui/Text/Text";
import classes from "./StaffOverlay.module.scss";

type Props = { detection?: Detection; width: number; height: number };

const ANNOUNCE_COOLDOWN_MS = 5000;

// Boxes around the staves found in the latest snapshot, plus a short hint about what to do. `width` and `height` are the
// preview's size; the snapshot fills the preview the same way the camera does (scaled to cover, centred).
export function StaffOverlay({ detection, width, height }: Props) {
    const { t } = useTranslation();
    const hint = detection ? liveHint(detection) : undefined;
    const lastHint = useRef<string | undefined>(undefined);
    const lastAt = useRef(0);

    // Spoken only when the kind of hint changes (not on every snapshot or every change of the staff count) and at most once
    // per cooldown. announceForAccessibility speaks only while a screen reader is on, so the device's settings decide.
    useEffect(() => {
        if (!hint || hint === lastHint.current) return;
        lastHint.current = hint;
        if (Date.now() - lastAt.current < ANNOUNCE_COOLDOWN_MS) return;
        lastAt.current = Date.now();
        const spoken = { ready: "scan.liveReady", partial: "scan.livePartial", none: "scan.liveNone", dark: "scan.hintDark", closer: "scan.liveCloser", edge: "scan.liveEdge" }[hint];
        AccessibilityInfo.announceForAccessibility(t(spoken, { count: detection?.staves.length ?? 0 }));
    }, [hint]);

    if (!detection || !hint || !width || !height) return null;

    const scale = Math.max(width / detection.width, height / detection.height);
    const dx = (width - detection.width * scale) / 2;
    const dy = (height - detection.height * scale) / 2;
    const text = {
        ready: t("scan.liveReady", { count: detection.staves.length }),
        partial: t("scan.livePartial"),
        none: t("scan.liveNone"),
        dark: t("scan.hintDark"),
        closer: t("scan.liveCloser"),
        edge: t("scan.liveEdge"),
    }[hint];

    return (
        <View pointerEvents="none" style={classes.layer}>
            {detection.staves.map((s, i) => {
                const [a, b, , d] = s.corners.map((p) => ({ x: p.x * scale + dx, y: p.y * scale + dy }));
                const w = Math.hypot(b.x - a.x, b.y - a.y);
                const h = Math.hypot(d.x - a.x, d.y - a.y);
                const cx = (a.x + b.x + d.x + (b.x + d.x - a.x)) / 4;
                const cy = (a.y + b.y + d.y + (b.y + d.y - a.y)) / 4;
                return (
                    <View
                        key={i}
                        style={[classes.box, { left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }] }]}
                    />
                );
            })}
            <View style={classes.hint} accessible accessibilityLabel={text}>
                {hint === "ready" ? <CircleCheck color={color.surface} size={20} /> : <Info color={color.surface} size={20} />}
                <Text variant="label" style={classes.hintText}>{text}</Text>
            </View>
        </View>
    );
}
