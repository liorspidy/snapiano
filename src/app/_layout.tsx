import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    useFonts,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
} from "@expo-google-fonts/rubik";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { PageLoaderProvider } from "@/components/PageLoader/PageLoader";
import { ToastProvider } from "@/ui/Toast/Toast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANG_KEY } from "@/components/LanguagePicker/LanguagePicker";
import { useBlurOnOutsidePress } from "@/hooks/useBlurOnOutsidePress";
import { initI18n, isRTL, Lang } from "@/i18n";
import classes from "@/styles/Layout.module.scss";

function Routes() {
    const { session, loading } = useAuth();
    const { i18n } = useTranslation();
    const blurOnOutsidePress = useBlurOnOutsidePress();
    const rtl = isRTL(i18n.language as Lang);
    if (loading) return null;
    return (
        <View style={classes.root} {...blurOnOutsidePress}>
            {/* ios_from_right/left is the native Android slide at the short animation time (~200 ms); iOS falls back to its own slide. */}
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: classes.screen,
                    animation: "ios_from_right",
                }}
            >
                <Stack.Protected guard={!!session}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="scan" />
                    <Stack.Screen name="process" />
                    <Stack.Screen name="practice" />
                    <Stack.Screen name="admin" />
                    {/* The account button sits at the end of the library title row: the page slides in from, and back out to, that side. */}
                    <Stack.Screen
                        name="account"
                        options={{
                            animation: rtl ? "ios_from_left" : "ios_from_right",
                        }}
                    />
                </Stack.Protected>
                <Stack.Protected guard={!session}>
                    <Stack.Screen name="login" />
                </Stack.Protected>
            </Stack>
        </View>
    );
}

export default function RootLayout() {
    const [fontsReady] = useFonts({
        Rubik_400Regular,
        Rubik_500Medium,
        Rubik_700Bold,
    });
    const [i18nReady, setI18nReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(LANG_KEY)
            .then((saved) => initI18n((saved as Lang) ?? undefined))
            .then(() => setI18nReady(true));
    }, []);

    if (!fontsReady || !i18nReady) return null;
    return (
        <>
            <StatusBar style="dark" />
            <AuthProvider>
                <ToastProvider>
                    <PageLoaderProvider>
                        <Routes />
                    </PageLoaderProvider>
                </ToastProvider>
            </AuthProvider>
        </>
    );
}
