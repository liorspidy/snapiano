import { useCallback, useState } from "react";
import { FlatList, InteractionManager, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Trash2, UserRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import { useToast } from "@/ui/Toast/Toast";
import { Text } from "@/ui/Text/Text";
import { EmptyLibraryArt } from "@/components/EmptyLibraryArt/EmptyLibraryArt";
import { pickImage } from "@/lib/pickImage";
import { deletePiece } from "@/lib/pieces";
import { supabase } from "@/lib/supabase";
import { color } from "@/theme/tokens";
import classes from "@/styles/Library.module.scss";
import { useDirection } from "@/hooks/useDirection";

type Piece = {
    id: string;
    title: string;
    composer: string;
    progress_measure: number;
};

export default function Library() {
    const direction = useDirection();
    const { t } = useTranslation();
    const { session } = useAuth();
    const toast = useToast();
    const [toDelete, setToDelete] = useState<Piece>();
    const [deleting, setDeleting] = useState(false);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [scansLeft, setScansLeft] = useState<number | null>(null); // null = unlimited or unknown

    // Load after the screen transition has finished, so the slide animation never competes with the data update.
    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                supabase
                    .from("pieces")
                    .select("id, title, composer, progress_measure")
                    .order("updated_at", { ascending: false })
                    .then(({ data }) => setPieces(data ?? []));
                supabase.rpc("my_entitlements").then(({ data }) => {
                    if (data?.scans_per_month != null)
                        setScansLeft(
                            Math.max(0, data.scans_per_month - data.scans_used),
                        );
                });
            });
            return () => task.cancel();
        }, []),
    );

    const remove = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await deletePiece(toDelete.id, session!.user.id);
            setPieces((all) => all.filter((p) => p.id !== toDelete.id));
        } catch {
            toast(t("error.generic"));
        }
        setDeleting(false);
        setToDelete(undefined);
    };

    return (
        <SafeAreaView style={[classes.screen, direction]}>
            <View style={classes.header}>
                <View style={classes.titleRow}>
                    <Text
                        variant="display"
                        accessibilityRole="header"
                        style={classes.grow}
                    >
                        {t("library.title")}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("account.title")}
                        onPress={() => router.push("/account")}
                        style={({ pressed }) => [
                            classes.account,
                            pressed && classes.pressed,
                        ]}
                    >
                        <UserRound color={color.ink} size={24} />
                    </Pressable>
                </View>
                {scansLeft !== null && (
                    <Text variant="caption" tone="inkMuted">
                        {t("library.scansLeft", { count: scansLeft })}
                    </Text>
                )}
            </View>
            <FlatList
                style={classes.grow}
                data={pieces}
                keyExtractor={(p) => p.id}
                contentContainerStyle={
                    pieces.length ? classes.list : classes.empty
                }
                ListEmptyComponent={
                    <View style={classes.emptyContent}>
                        <EmptyLibraryArt size={220} />
                        <Text
                            variant="bodyLarge"
                            tone="inkSecondary"
                            style={classes.centered}
                        >
                            {t("library.empty")}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={classes.row}>
                        <Pressable
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                classes.rowMain,
                                pressed && classes.pressed,
                            ]}
                            onPress={() =>
                                router.push({
                                    pathname: "/practice",
                                    params: { id: item.id },
                                })
                            }
                        >
                            <Text variant="bodyLarge">
                                {item.title || t("app.name")}
                            </Text>
                            <Text variant="caption" tone="inkMuted">
                                {item.progress_measure
                                    ? t("review.measure", {
                                          n: item.progress_measure,
                                      })
                                    : t("library.notStarted")}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${t("library.delete")}: ${item.title || t("app.name")}`}
                            onPress={() => setToDelete(item)}
                            style={({ pressed }) => [
                                classes.delete,
                                pressed && classes.pressed,
                            ]}
                        >
                            <Trash2 color={color.inkSecondary} size={20} />
                        </Pressable>
                    </View>
                )}
            />
            <View style={classes.actions}>
                <Button onPress={() => router.push("/scan")}>
                    {t("library.scan")}
                </Button>
                <Button
                    secondary
                    onPress={async () => {
                        const uri = await pickImage();
                        if (uri)
                            router.push({ pathname: "/scan", params: { uri } });
                    }}
                >
                    {t("library.upload")}
                </Button>
            </View>
            <Modal
                open={!!toDelete}
                onClose={() => !deleting && setToDelete(undefined)}
                title={t("library.deleteTitle")}
                closeLabel={t("account.cancel")}
                mobileCard
                footer={
                    <View style={classes.modalActions}>
                        <Button destructive onPress={remove} isPending={deleting} pending={t("auth.sending")}>
                            {t("library.delete")}
                        </Button>
                        <Button secondary onPress={() => setToDelete(undefined)} disabled={deleting}>
                            {t("account.cancel")}
                        </Button>
                    </View>
                }
            >
                <Text variant="bodyLarge" tone="inkSecondary">
                    {toDelete?.title || t("app.name")}
                </Text>
                <Text variant="body" tone="inkSecondary">
                    {t("library.deleteMessage")}
                </Text>
            </Modal>
        </SafeAreaView>
    );
}
