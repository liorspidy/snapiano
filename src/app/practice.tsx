import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { Minus, Pause, Play, Plus, SlidersVertical, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { FallingNotes } from "@/components/FallingNotes/FallingNotes";
import { Keyboard } from "@/components/Keyboard/Keyboard";
import { Text } from "@/ui/Text/Text";
import { Modal } from "@/ui/Modal/Modal";
import { Button } from "@/ui/Button/Button";
import { audioTime, mix, playNote, setMix, warmUp } from "@/audio/synth";
import { notesInWindow } from "@/audio/audioMath";
import { VerticalSlider } from "@/ui/VerticalSlider/VerticalSlider";
import { loadPiece, Piece } from "@/lib/piece";
import { color, handColor } from "@/theme/tokens";
import classes from "@/styles/Practice.module.scss";
import { useDirection } from "@/hooks/useDirection";

type Hands = "both" | "R" | "L";
const TICK_MS = 33;
const LOOKAHEAD_S = 0.12;
const MIN_BPM = 30;
const MAX_BPM = 200;

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
    const [tempoOpen, setTempoOpen] = useState(false);
    const [mixerOpen, setMixerOpen] = useState(false);
    useEffect(warmUp, []);
    // The modal is at most 86% of the screen; its padding, title and labels take ~155dp, the faders get the rest.
    const sliderHeight = Math.min(220, Math.max(80, Math.floor(useWindowDimensions().height * 0.86) - 155));
    const [levels, setLevels] = useState({ ...mix });
    const setLevel = (part: Partial<typeof mix>) => {
        setMix(part);
        setLevels({ ...mix });
    };
    const [bpmText, setBpmText] = useState("80");
    const closeTempo = () => {
        setTempo(Number(bpmText));
        setTempoOpen(false);
    };
    const setTempo = (v: number) => {
        const next = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v) || bpm));
        setBpm(next);
        setBpmText(String(next));
    };
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
    // Notes are scheduled on the audio clock up to LOOKAHEAD_S ahead, so they land on time even when the JS thread
    // stutters; the cursor follows the same clock. `scheduledRef` (beats) is the end of the last scheduled window.
    const scheduledRef = useRef(-Infinity);
    useEffect(() => {
        if (!playing || !piece) return;
        const anchorTime = audioTime();
        const anchorPos = posRef.current;
        const toTime = (beat: number) => anchorTime + ((beat - anchorPos) * 60) / bpm;
        const notes = piece.notes.filter((n) => hands === "both" || n.h === hands);
        if (scheduledRef.current < anchorPos - 1e-6) scheduledRef.current = anchorPos - 1e-6;
        const tick = () => {
            const now = audioTime();
            posRef.current = anchorPos + ((now - anchorTime) * bpm) / 60;
            const horizon = posRef.current + (LOOKAHEAD_S * bpm) / 60;
            for (const n of notesInWindow(notes, scheduledRef.current, horizon))
                playNote(n.m, (n.d * 60) / bpm, toTime(n.s));
            scheduledRef.current = Math.max(scheduledRef.current, horizon);
            if (posRef.current >= end) {
                setPlaying(false);
                posRef.current = piece.notes[0]?.s ?? 0;
                scheduledRef.current = -Infinity;
            }
            setPos(posRef.current);
        };
        tick();
        const timer = setInterval(tick, TICK_MS);
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
                    <Text variant="label" style={classes.bpmLabel}>
                        {t("practice.hands")}:
                    </Text>
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
                <Chip
                    icon={<SlidersVertical color={color.stageText} size={20} />}
                    accessibilityLabel={t("practice.mixer")}
                    on={false}
                    onPress={() => setMixerOpen(true)}
                />
                <Text variant="caption" style={classes.lineLabel}>
                    {t("practice.line", {
                        n: lineNo,
                        total: piece.lines.length,
                    })}
                </Text>
                <View style={classes.group}>
                    <Text variant="label" style={classes.bpmLabel}>
                        bpm:
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${t("practice.tempo")}: ${bpm}`}
                        onPress={() => {
                            setBpmText(String(bpm));
                            setTempoOpen(true);
                        }}
                        style={({ pressed }) => [classes.chip, pressed && classes.pressed]}
                    >
                        <Text variant="label" style={classes.bpmValue}>
                            {bpm}
                        </Text>
                    </Pressable>
                </View>
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
            <Modal
                open={tempoOpen}
                onClose={closeTempo}
                title={t("practice.tempo")}
                closeLabel={t("practice.done")}
                maxWidth={400}
                footer={<Button onPress={closeTempo}>{t("practice.done")}</Button>}
            >
                <Text variant="label" tone="inkSecondary" style={classes.tempoUnit}>
                    bpm
                </Text>
                <View style={classes.tempoRow}>
                    <Button
                        secondary
                        sizeFormat="fitContent"
                        accessibilityLabel={t("practice.slower")}
                        onPress={() => setTempo(bpm - 5)}
                    >
                        <Minus color={color.ink} size={20} />
                    </Button>
                    <TextInput
                        style={classes.tempoInput}
                        value={bpmText}
                        accessibilityLabel={`${t("practice.tempo")}, ${t("practice.bpm")}`}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectTextOnFocus
                        onChangeText={(v) => setBpmText(v.replace(/\D/g, ""))}
                        onEndEditing={() => setTempo(Number(bpmText))}
                    />
                    <Button
                        secondary
                        sizeFormat="fitContent"
                        accessibilityLabel={t("practice.faster")}
                        onPress={() => setTempo(bpm + 5)}
                    >
                        <Plus color={color.ink} size={20} />
                    </Button>
                </View>
            </Modal>
            <Modal
                open={mixerOpen}
                onClose={() => setMixerOpen(false)}
                title={t("practice.mixer")}
                closeLabel={t("practice.done")}
                maxWidth={400}
                compact
                closeLeft
                hasCloseBtn
            >
                <View style={classes.mixer}>
                    <VerticalSlider label={t("practice.volume")} value={levels.volume} onChange={(v) => setLevel({ volume: v })} height={sliderHeight} />
                    <VerticalSlider label={t("practice.reverb")} value={levels.reverb} onChange={(v) => setLevel({ reverb: v })} height={sliderHeight} />
                </View>
            </Modal>
        </SafeAreaView>
    );
}
