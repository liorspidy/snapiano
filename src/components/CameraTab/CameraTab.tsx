import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { INTERVAL_DEFAULT_MS, INTERVAL_MAX_MS, INTERVAL_MIN_MS, loadLiveSettings, nextInterval, saveInterval } from "@/lib/liveSettings";
import { color } from "@/theme/tokens";
import { Button } from "@/ui/Button/Button";
import { Text } from "@/ui/Text/Text";
import classes from "./CameraTab.module.scss";

// Developer setting: how long the live staff detection waits between snapshots. Applies at the next cycle, even while the camera runs.
export function CameraTab() {
    const { t } = useTranslation();
    const [ms, setMs] = useState(INTERVAL_DEFAULT_MS);
    useEffect(() => { void loadLiveSettings().then(setMs); }, []);

    const change = async (value: number) => setMs(await saveInterval(value));
    const seconds = (ms / 1000).toFixed(ms % 100 === 0 ? 1 : 2);

    return (
        <View style={classes.card}>
            <Text variant="title">{t("admin.snapshotInterval")}</Text>
            <View style={classes.row}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("admin.faster")} disabled={ms <= INTERVAL_MIN_MS}
                    onPress={() => change(nextInterval(ms, -1))}
                    style={({ pressed }) => [classes.step, pressed && classes.pressed, ms <= INTERVAL_MIN_MS && classes.disabled]}>
                    <Minus color={color.ink} size={24} />
                </Pressable>
                <Text variant="headline" style={classes.value} accessibilityLiveRegion="polite">{t("admin.seconds", { value: seconds })}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t("admin.slower")} disabled={ms >= INTERVAL_MAX_MS}
                    onPress={() => change(nextInterval(ms, 1))}
                    style={({ pressed }) => [classes.step, pressed && classes.pressed, ms >= INTERVAL_MAX_MS && classes.disabled]}>
                    <Plus color={color.ink} size={24} />
                </Pressable>
            </View>
            <Text variant="caption" tone="inkMuted">{t("admin.snapshotHint")}</Text>
            <Button secondary onPress={() => change(INTERVAL_DEFAULT_MS)} disabled={ms === INTERVAL_DEFAULT_MS}>{t("admin.resetDefault")}</Button>
        </View>
    );
}
