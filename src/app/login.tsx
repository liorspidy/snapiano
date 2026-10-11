import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import { GoogleIcon } from "@/components/GoogleIcon/GoogleIcon";
import { LanguagePicker } from "@/components/LanguagePicker/LanguagePicker";
import { Logo } from "@/components/Logo/Logo";
import { PasswordChecklist } from "@/components/PasswordChecklist/PasswordChecklist";
import { Wordmark } from "@/components/Wordmark/Wordmark";
import { Button } from "@/ui/Button/Button";
import { Input } from "@/ui/Input/Input";
import { Text } from "@/ui/Text/Text";
import classes from "@/styles/Login.module.scss";
import { useDirection } from "@/hooks/useDirection";

type Mode = "login" | "signup";

export default function Login() {
    const direction = useDirection();
    const { t } = useTranslation();
    const { signInWithGoogle, logIn, signUp, banned } = useAuth();
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{
        email?: string;
        password?: string;
        form?: string;
    }>({});
    const [confirmEmail, setConfirmEmail] = useState<string>();
    const [sending, setSending] = useState(false);

    const toggle = () => {
        setMode(mode === "login" ? "signup" : "login");
        setErrors({});
        setConfirmEmail(undefined);
    };

    const submit = async () => {
        const address = email.trim();
        const next = {
            email: !address
                ? t("auth.errEmailRequired")
                : !/^\S+@\S+\.\S+$/.test(address)
                  ? t("auth.invalidEmail")
                  : undefined,
            password: password.length < 8 ? t("auth.errPassword") : undefined,
        };
        setErrors(next);
        setConfirmEmail(undefined);
        if (next.email || next.password) return;
        setSending(true);
        try {
            if (mode === "login") await logIn(address, password);
            else if ((await signUp(address, password)).needsConfirmation)
                setConfirmEmail(address);
        } catch (e) {
            const wrong =
                mode === "login" &&
                /invalid login credentials/i.test(String((e as Error).message));
            setErrors({
                form: t(wrong ? "auth.wrongCredentials" : "error.generic"),
            });
        }
        setSending(false);
    };

    const google = async () => {
        setErrors({});
        try {
            await signInWithGoogle();
        } catch (e) {
            const notSetUp =
                /unsupported provider|provider is not enabled/i.test(
                    String((e as Error).message),
                );
            setErrors({
                form: t(notSetUp ? "auth.googleUnavailable" : "error.generic"),
            });
        }
    };

    return (
        <SafeAreaView style={[classes.screen, direction]}>
            <ScrollView
                contentContainerStyle={classes.scroll}
                keyboardShouldPersistTaps="handled"
            >
                <View style={classes.language}>
                    <LanguagePicker compact />
                </View>
                <View style={classes.card}>
                    <View style={classes.brand}>
                        <Logo size={88} />
                        <Wordmark height={44} label={t("app.name")} />
                        <Text
                            variant="body"
                            tone="inkSecondary"
                            style={classes.tagline}
                        >
                            {t("app.tagline")}
                        </Text>
                    </View>
                    <Button secondary onPress={google}>
                        <GoogleIcon size={20} />
                        <Text variant="label">{t("auth.google")}</Text>
                    </Button>
                    <View style={classes.divider}>
                        <View style={classes.dividerLine} />
                        <Text variant="caption" tone="inkMuted">
                            {t("auth.or")}
                        </Text>
                        <View style={classes.dividerLine} />
                    </View>
                    <Input
                        label={t("auth.email")}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={errors.email}
                    />
                    <Input
                        label={t("auth.password")}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete={
                            mode === "login"
                                ? "current-password"
                                : "new-password"
                        }
                        error={errors.password}
                    />
                    {mode === "signup" && (
                        <PasswordChecklist value={password} />
                    )}
                    <View style={classes.toggle}>
                        <Text variant="body" tone="inkSecondary">
                            {t(
                                mode === "login"
                                    ? "auth.newToApp"
                                    : "auth.haveAccount",
                            )}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={toggle}
                            style={({ pressed }) => [
                                classes.link,
                                pressed && classes.pressed,
                            ]}
                        >
                            <Text variant="label" style={classes.linkText}>
                                {t(
                                    mode === "login"
                                        ? "auth.createAccount"
                                        : "auth.logIn",
                                )}
                            </Text>
                        </Pressable>
                    </View>
                </View>
                <View style={classes.bottom}>
                    {confirmEmail && (
                        <Text
                            variant="body"
                            tone="success"
                            accessibilityRole="alert"
                            style={classes.message}
                        >
                            {t("auth.checkEmail", { email: confirmEmail })}
                        </Text>
                    )}
                    {banned && (
                        <Text variant="body" tone="error" accessibilityRole="alert" style={classes.message}>
                            {banned === "infinity"
                                ? t("auth.bannedForever")
                                : t("auth.banned", { date: new Date(banned).toLocaleDateString() })}
                        </Text>
                    )}
                    {errors.form && (
                        <Text
                            variant="body"
                            tone="error"
                            accessibilityRole="alert"
                            style={classes.message}
                        >
                            {errors.form}
                        </Text>
                    )}
                    <Text
                        variant="caption"
                        tone="inkMuted"
                        style={classes.terms}
                    >
                        {t("auth.terms")}
                    </Text>
                    <Button
                        onPress={submit}
                        isPending={sending}
                        pending={t("auth.sending")}
                    >
                        {t(mode === "login" ? "auth.login" : "auth.continue")}
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
