import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { Minus, Pause, Play, Plus, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { FallingNotes } from "@/components/FallingNotes/FallingNotes";
import { Keyboard } from "@/components/Keyboard/Keyboard";
import { Text } from "@/ui/Text/Text";
import { playNote } from "@/audio/synth";
import { loadPiece, Piece } from "@/lib/piece";
import { color, handColor } from "@/theme/tokens";
import classes from "@/styles/Practice.module.scss";
import { useDirection } from "@/hooks/useDirection";

type Hands = "both" | "R" | "L";
const TICK_MS = 33;

function Chip({
    label,
    icon,
    accessibilityLabel,
    on,
    onPress,
}: {
    label?: string;
    icon?: ReactNode;
    accessibilityLabel?: string;
    on: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: on }}
            onPress={onPress}
            style={({ pressed }) => [
                classes.chip,
                on && classes.chipOn,
                pressed && classes.pressed,
            ]}
        >
            {icon}
            {label && (
                <Text
                    variant="label"
                    style={on ? classes.chipLabelOn : classes.chipLabel}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

export default function Practice() {
    const direction = useDirection();
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [piece, setPiece] = useState<Piece>();
    const [failed, setFailed] = useState(false);
    const [hands, setHands] = useState<Hands>("both");
    const [bpm, setBpm] = useState(80);
    const [playing, setPlaying] = useState(false);
    const [pos, setPos] = useState(0); // quarter notes
    const [view, setView] = useState({ w: 0, h: 0 });
    const posRef = useRef(0);

    useEffect(() => {
        ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE,
        );
        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);
    useEffect(() => {
        loadPiece(id)
            .then((p) => {
                setPiece(p);
                setBpm(Math.round(p.bpm) || 80);
                posRef.current = p.notes[0]?.s ?? 0;
                setPos(posRef.current);
            })
            .catch(() => setFailed(true));
    }, [id]);

    const end = useMemo(
        () => Math.max(0, ...(piece?.notes.map((n) => n.s + n.d) ?? [])),
        [piece],
    );
    useEffect(() => {
        if (!playing) return;
        let last = Date.now();
        const timer = setInterval(() => {
            const now = Date.now();
            const before = posRef.current;
            posRef.current += ((now - last) / 1000) * (bpm / 60);
            last = now;
            for (const n of piece?.notes ?? []) {
                if (
                    n.s >= before &&
                    n.s < posRef.current &&
                    (hands === "both" || n.h === hands)
                )
                    playNote(n.m, (n.d * 60) / bpm);
            }
            if (posRef.current >= end) {
                setPlaying(false);
                posRef.current = piece?.notes[0]?.s ?? 0;
            }
            setPos(posRef.current);
        }, TICK_MS);
        return () => clearInterval(timer);
    }, [playing, bpm, end, piece, hands]);

    if (failed)
        return (
            <SafeAreaView style={[classes.stage, direction]}>
                <Text style={classes.message}>{t("error.generic")}</Text>
            </SafeAreaView>
        );
    if (!piece)
        return (
            <SafeAreaView style={[classes.stage, direction]}>
                <Text style={classes.message}>{t("practice.loading")}</Text>
            </SafeAreaView>
        );

    const shown = piece.notes.filter((n) => hands === "both" || n.h === hands);
    const sounding = shown.filter((n) => n.s <= pos && pos < n.s + n.d);
    const next = shown.find((n) => n.s >= pos);
    const focus = sounding[0] ?? next ?? shown[shown.length - 1];
    const lineNo = focus?.line ?? 1;
    const line = piece.lines[lineNo - 1];
    const onLine = (
        sounding.length ? sounding : shown.filter((n) => n.s === focus?.s)
    ).filter((n) => n.line === lineNo);
    const cx = onLine.length
        ? onLine.reduce((a, n) => a + n.x, 0) / onLine.length
        : 0;

    const scale = line && view.h ? view.h / line.h : 1;
    const imgW = line ? line.w * scale : 0;
    const offset = Math.min(
        Math.max(cx * scale - view.w * 0.4, 0),
        Math.max(0, imgW - view.w),
    );
    const lit = new Map(sounding.map((n) => [n.m, n.h] as const));
    const midis = piece.notes.map((n) => n.m);
    const low = Math.min(...midis) - (Math.min(...midis) % 12);
    const high = Math.max(...midis) + 1;

    return (
        <SafeAreaView style={[classes.stage, direction]}>
            <View style={classes.controls}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(
                        playing ? "practice.pause" : "practice.play",
                    )}
                    onPress={() => setPlaying((p) => !p)}
                    style={({ pressed }) => [
                        classes.play,
                        pressed && classes.pressed,
                    ]}
                >
                    {playing ? (
                        <Pause color={color.ink} size={24} />
                    ) : (
                        <Play
                            color={color.ink}
                            size={24}
                            style={classes.playIcon}
                        />
                    )}
                </Pressable>
                <View style={classes.group}>
                    <Chip
                        label={t("practice.both")}
                        on={hands === "both"}
                        onPress={() => setHands("both")}
                    />
                    <Chip
                        label={t("practice.right")}
                        on={hands === "R"}
                        onPress={() => setHands("R")}
                    />
                    <Chip
                        label={t("practice.left")}
                        on={hands === "L"}
                        onPress={() => setHands("L")}
                    />
                </View>
                <View style={classes.group}>
                    <Chip
                        icon={<Minus color={color.stageText} size={20} />}
                        accessibilityLabel={t("practice.slower")}
                        on={false}
                        onPress={() => setBpm((b) => Math.max(30, b - 5))}
                    />
                    <Text variant="label" style={classes.bpm}>
                        {bpm} {t("practice.bpm")}
                    </Text>
                    <Chip
                        icon={<Plus color={color.stageText} size={20} />}
                        accessibilityLabel={t("practice.faster")}
                        on={false}
                        onPress={() => setBpm((b) => Math.min(200, b + 5))}
                    />
                </View>
                <Text variant="caption" style={classes.lineLabel}>
                    {t("practice.line", {
                        n: lineNo,
                        total: piece.lines.length,
                    })}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("process.back")}
                    onPress={() => router.replace("/")}
                    style={classes.close}
                >
                    <X color={color.stageText} size={24} />
                </Pressable>
            </View>

            <View
                style={classes.sheet}
                onLayout={(e) =>
                    setView({
                        w: e.nativeEvent.layout.width,
                        h: e.nativeEvent.layout.height,
                    })
                }
            >
                {line && (
                    <View
                        style={[
                            classes.line,
                            { width: imgW, height: view.h, left: -offset },
                        ]}
                    >
                        <Image
                            source={{ uri: line.uri }}
                            style={{ width: imgW, height: view.h }}
                            accessibilityIgnoresInvertColors
                        />
                        {sounding
                            .filter((n) => n.line === lineNo)
                            .map((n, i) => (
                                <View
                                    key={i}
                                    style={[
                                        classes.mark,
                                        {
                                            left: n.x * scale - 9,
                                            top: n.y * scale - 9,
                                            backgroundColor: handColor(
                                                n.h,
                                                true,
                                            ),
                                        },
                                    ]}
                                />
                            ))}
                        {onLine.length > 0 && (
                            <View
                                style={[
                                    classes.cursor,
                                    { left: cx * scale - 1 },
                                ]}
                            />
                        )}
                    </View>
                )}
            </View>

            <View style={classes.falling}>
                <FallingNotes notes={shown} pos={pos} low={low} high={high} />
            </View>
            <View style={classes.keys}>
                <Keyboard low={low} high={high} lit={lit} />
            </View>
        </SafeAreaView>
    );
}
