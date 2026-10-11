import { useEffect, useState } from "react";
import { Image, ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import { BackButton } from "@/components/BackButton/BackButton";
import { useDirection } from "@/hooks/useDirection";
import { loadPiece, Piece } from "@/lib/piece";
import { deletePiece } from "@/lib/pieces";
import { supabase } from "@/lib/supabase";
import { color, handColor } from "@/theme/tokens";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import { Skeleton } from "@/ui/Skeleton/Skeleton";
import { Text } from "@/ui/Text/Text";
import { useToast } from "@/ui/Toast/Toast";
import classes from "@/styles/Review.module.scss";

type Info = { title: string; measures: number | null; flagged: number[] };

// The result of a scan: the cleaned page with what we read drawn on top, so the user can check it and say if they are happy.
export default function Review() {
    const direction = useDirection();
    const { t } = useTranslation();
    const { session } = useAuth();
    const toast = useToast();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { width: screenWidth } = useWindowDimensions();
    const [piece, setPiece] = useState<Piece>();
    const [info, setInfo] = useState<Info>();
    const [discarding, setDiscarding] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        loadPiece(id).then(setPiece).catch(() => toast(t("error.generic")));
        Promise.all([
            supabase.from("pieces").select("title").eq("id", id).single(),
            supabase.from("scans").select("measures, flagged_measures").eq("piece_id", id).limit(1).maybeSingle(),
        ]).then(([p, s]) =>
            setInfo({ title: p.data?.title ?? "", measures: s.data?.measures ?? null, flagged: s.data?.flagged_measures ?? [] }),
        );
    }, [id]);

    const discard = async () => {
        setBusy(true);
        try {
            await deletePiece(id, session!.user.id);
            router.replace("/scan");
        } catch {
            toast(t("error.generic"));
            setBusy(false);
            setDiscarding(false);
        }
    };

    const width = screenWidth - 32;
    const flagged = info?.flagged ?? [];

    return (
        <SafeAreaView style={[classes.screen, direction]}>
            <View style={classes.header}>
                <Text variant="display" accessibilityRole="header" style={classes.grow}>
                    {t("review.title")}
                </Text>
                <BackButton />
            </View>
            <ScrollView contentContainerStyle={classes.content}>
                <View style={classes.summary}>
                    {!!info?.title && <Text variant="title">{info.title}</Text>}
                    {info?.measures != null && (
                        <Text variant="bodyLarge" tone="inkSecondary">
                            {t("review.found", { count: info.measures })}
                        </Text>
                    )}
                    <Text variant="body" tone={flagged.length ? "warning" : "success"}>
                        {flagged.length ? t("review.toCheck", { count: flagged.length }) : t("review.ready")}
                    </Text>
                    {flagged.length > 0 && (
                        <Text variant="caption" tone="inkMuted">
                            {t("review.flaggedList", { list: flagged.join(", ") })}
                        </Text>
                    )}
                    <Text variant="caption" tone="inkMuted">{t("review.legend")}</Text>
                </View>

                {!piece && <Skeleton width="100%" height={220} radius={12} />}
                {piece?.lines.map((line, i) => {
                    const scale = width / line.w;
                    const here = piece.notes.filter((n) => n.line === i + 1);
                    return (
                        <View key={i} style={[classes.page, { width, height: line.h * scale }]}>
                            <Image
                                source={{ uri: line.uri }}
                                style={{ width, height: line.h * scale }}
                                accessibilityIgnoresInvertColors
                                accessibilityLabel={t("practice.line", { n: i + 1, total: piece.lines.length })}
                            />
                            {flagged.map((bar) => {
                                const xs = here.filter((n) => n.b === bar).map((n) => n.x);
                                if (!xs.length) return null;
                                const left = Math.min(...xs) * scale - 8;
                                return (
                                    <View key={bar} style={[classes.band, { left, width: (Math.max(...xs) - Math.min(...xs)) * scale + 16 }]}>
                                        <View style={classes.bandLabel}>
                                            <TriangleAlert color={color.warning} size={14} />
                                        </View>
                                    </View>
                                );
                            })}
                            {here.map((n, k) => (
                                <View key={k} style={[classes.dot, { left: n.x * scale - 4, top: n.y * scale - 4, backgroundColor: handColor(n.h, true) }]} />
                            ))}
                        </View>
                    );
                })}
            </ScrollView>

            <View style={classes.actions}>
                <Text variant="bodyLarge" style={classes.question}>{t("review.happy")}</Text>
                <Button onPress={() => router.replace({ pathname: "/practice", params: { id } })}>{t("review.startPractice")}</Button>
                <Button secondary onPress={() => setDiscarding(true)}>{t("review.notHappy")}</Button>
            </View>

            <Modal
                open={discarding}
                onClose={() => !busy && setDiscarding(false)}
                title={t("review.discardTitle")}
                closeLabel={t("account.cancel")}
                mobileCard
                footer={
                    <View style={classes.modalActions}>
                        <Button destructive onPress={discard} isPending={busy} pending={t("auth.sending")}>{t("review.notHappy")}</Button>
                        <Button secondary onPress={() => setDiscarding(false)} disabled={busy}>{t("account.cancel")}</Button>
                    </View>
                }
            >
                <Text variant="bodyLarge" tone="inkSecondary">{t("review.discardMessage")}</Text>
            </Modal>
        </SafeAreaView>
    );
}
