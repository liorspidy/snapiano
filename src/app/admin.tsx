import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { BackButton } from "@/components/BackButton/BackButton";
import { CameraTab } from "@/components/CameraTab/CameraTab";
import { CodesTab } from "@/components/CodesTab/CodesTab";
import { PlansTab } from "@/components/PlansTab/PlansTab";
import { ReportsTab } from "@/components/ReportsTab/ReportsTab";
import { UsersTab } from "@/components/UsersTab/UsersTab";
import { useDirection } from "@/hooks/useDirection";
import { supabase } from "@/lib/supabase";
import { Tabs } from "@/ui/Tabs/Tabs";
import { Text } from "@/ui/Text/Text";
import classes from "@/styles/Admin.module.scss";

type Tab = "users" | "plans" | "codes" | "reports" | "camera";

export default function Admin() {
    const direction = useDirection();
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>("users");

    // The database already refuses everything to non-admins; this only keeps the screen out of reach.
    useEffect(() => {
        supabase.rpc("my_entitlements").then(({ data }) => {
            if (data?.role !== "admin") router.replace("/");
        });
    }, []);

    return (
        <SafeAreaView style={[classes.screen, direction]}>
            <View style={classes.header}>
                <Text variant="display" accessibilityRole="header" style={classes.grow}>
                    {t("admin.title")}
                </Text>
                <BackButton />
            </View>
            <Tabs
                accessibilityLabel={t("admin.title")}
                active={tab}
                onChange={setTab}
                tabs={[
                    { id: "users", title: t("admin.users") },
                    { id: "plans", title: t("admin.plans") },
                    { id: "codes", title: t("admin.codes") },
                    { id: "reports", title: t("admin.reports") },
                    { id: "camera", title: t("admin.camera") },
                ]}
            />
            <ScrollView contentContainerStyle={classes.content}>
                {tab === "users" && <UsersTab />}
                {tab === "plans" && <PlansTab />}
                {tab === "codes" && <CodesTab />}
                {tab === "reports" && <ReportsTab />}
                {tab === "camera" && <CameraTab />}
            </ScrollView>
        </SafeAreaView>
    );
}
