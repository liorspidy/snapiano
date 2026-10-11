import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePageLoader } from "@/components/PageLoader/PageLoader";
import { Button } from "@/ui/Button/Button";
import { Text } from "@/ui/Text/Text";
import { scanErrorKey } from "@/lib/errorMessages";
import { supabase } from "@/lib/supabase";
import classes from "@/styles/Process.module.scss";
import { useDirection } from "@/hooks/useDirection";

type Scan = {
    error: string | null;
    status: "queued" | "processing" | "done" | "failed";
    measures: number | null;
    flagged_measures: number[] | null;
    piece_id: string | null;
};

export default function Process() {
    const direction = useDirection();
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [scan, setScan] = useState<Scan>();

    // ponytail: polls every 3s; switch to Supabase realtime if the worker takes long enough to matter.
    useEffect(() => {
        let stop = false;
        const tick = async () => {
            const { data } = await supabase
                .from("scans")
                .select("status, measures, flagged_measures, piece_id, error")
                .eq("id", id)
                .single();
            if (stop) return;
            if (data) setScan(data as Scan);
            if (
                !data ||
                data.status === "queued" ||
                data.status === "processing"
            )
                setTimeout(tick, 3000);
        };
        tick();
        return () => {
            stop = true;
        };
    }, [id]);

    const working =
        !scan || scan.status === "queued" || scan.status === "processing";
    usePageLoader(working, t("process.title"));

    // A finished scan opens the review, where the result is checked and accepted. Only failures stay on this screen.
    useEffect(() => {
        if (scan?.status === "done" && scan.piece_id) {
            router.replace({ pathname: "/review", params: { id: scan.piece_id } });
        }
    }, [scan]);

    return (
        <SafeAreaView style={[classes.screen, direction]}>
            <View style={classes.body}>
                {scan?.status === "failed" && (
                    <Text variant="headline" accessibilityRole="header" style={classes.centered}>
                        {t(scanErrorKey(scan.error))}
                    </Text>
                )}
            </View>
            {scan?.status === "failed" && (
                <View style={classes.actions}>
                    <Button onPress={() => router.replace("/scan")}>{t("library.scan")}</Button>
                    <Button secondary onPress={() => router.replace("/")}>{t("process.back")}</Button>
                </View>
            )}
        </SafeAreaView>
    );
}
