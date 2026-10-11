import { useRef, useState } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { ScanLine, Search, Zap, ZapOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import { BackButton } from "@/components/BackButton/BackButton";
import { StaffOverlay } from "@/components/StaffOverlay/StaffOverlay";
import { useLiveStaves } from "@/hooks/useLiveStaves";
import { usePageLoader } from "@/components/PageLoader/PageLoader";
import { Button } from "@/ui/Button/Button";
import { Text } from "@/ui/Text/Text";
import { uploadErrorKey } from "@/lib/errorMessages";
import { uploadAndStart } from "@/lib/scans";
import { pickImage } from "@/lib/pickImage";
import { color } from "@/theme/tokens";
import classes from "@/styles/Scan.module.scss";
import { useDirection } from "@/hooks/useDirection";

export default function Scan() {
    const direction = useDirection();
    const { t } = useTranslation();
    const { uri } = useLocalSearchParams<{ uri?: string }>();
    const [photo, setPhoto] = useState<string | undefined>(uri);
    const [permission, requestPermission] = useCameraPermissions();
    const { session } = useAuth();
    const [busy, setBusy] = useState(false);
    usePageLoader(busy, t("auth.sending"));
    const [error, setError] = useState<string>();
    const camera = useRef<CameraView>(null);
    const [ready, setReady] = useState(false);
    const [torch, setTorch] = useState(false);
    // Off until the user turns it on: each live snapshot is a camera capture, and some phones play a shutter sound on every capture.
    const [liveOn, setLiveOn] = useState(false);
    const [zoomStep, setZoomStep] = useState(0);
    const [focus, setFocus] = useState<{ x: number; y: number; n: number }>();
    const ZOOM = [0, 0.25, 0.5];
    const [preview, setPreview] = useState({ width: 0, height: 0 });
    const focused = useIsFocused();
    const live = useLiveStaves(camera, focused && liveOn && ready && !photo && !!permission?.granted && !busy);

    const capture = async () => {
        await live.pause();
        try {
            const shot = await camera.current?.takePictureAsync({ quality: 1, skipProcessing: false, shutterSound: false });
            if (shot) setPhoto(shot.uri);
            else live.resume();
        } catch {
            setError(t("error.generic"));
            live.resume();
        }
    };
    const upload = async () => {
        const picked = await pickImage();
        if (picked) setPhoto(picked);
    };

    const use = async () => {
        if (!photo || !session || busy) return;
        setBusy(true);
        setError(undefined);
        try {
            const res = await uploadAndStart(photo, session.user.id);
            if (res.scanId)
                return router.replace({
                    pathname: "/process",
                    params: { id: res.scanId },
                });
            setError(t(uploadErrorKey(res.error ?? "generic")));
        } catch {
            setError(t("error.generic"));
        }
        setBusy(false);
    };

    const header = (
        <View style={classes.header}>
            <Text variant="display" accessibilityRole="header" style={classes.grow}>
                {t("library.scan")}
            </Text>
            <BackButton />
        </View>
    );

    if (photo) {
        return (
            <SafeAreaView style={[classes.screen, direction]}>
                {header}
                <Image
                    source={{ uri: photo }}
                    style={classes.view}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                />
                {error && (
                    <Text variant="body" tone="error">
                        {error}
                    </Text>
                )}
                <View style={classes.actions}>
                    <Button onPress={use} disabled={busy}>
                        {t("scan.use")}
                    </Button>
                    <Button
                        secondary
                        onPress={() => {
                            setReady(false); // the camera view is created again and is not ready until it says so
                            setPhoto(undefined);
                        }}
                    >
                        {t("scan.retake")}
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission?.granted) {
        return (
            <SafeAreaView style={[classes.screen, direction]}>
                {header}
                <View style={[classes.view, classes.center]}>
                    <Text
                        variant="bodyLarge"
                        tone="inkSecondary"
                        style={classes.centered}
                    >
                        {t("scan.needCamera")}
                    </Text>
                </View>
                <View style={classes.actions}>
                    <Button secondary onPress={upload}>
                        {t("scan.upload")}
                    </Button>
                    <Button onPress={requestPermission}>
                        {t("scan.allow")}
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[classes.screen, direction]}>
                {header}
            <View style={classes.tools}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(liveOn ? "scan.liveOff" : "scan.liveOn")}
                    accessibilityState={{ selected: liveOn }}
                    onPress={() => setLiveOn((v) => !v)}
                    style={({ pressed }) => [classes.tool, liveOn && classes.toolOn, pressed && classes.pressed]}
                >
                    <ScanLine color={liveOn ? color.ink : color.surface} size={24} />
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(torch ? "scan.torchOff" : "scan.torchOn")}
                    accessibilityState={{ selected: torch }}
                    onPress={() => setTorch((v) => !v)}
                    style={({ pressed }) => [classes.tool, torch && classes.toolOn, pressed && classes.pressed]}
                >
                    {torch ? <Zap color={color.ink} size={24} /> : <ZapOff color={color.surface} size={24} />}
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("scan.zoom", { level: 1 + ZOOM[(zoomStep + 1) % ZOOM.length] * 4 })}
                    onPress={() => setZoomStep((v) => (v + 1) % ZOOM.length)}
                    style={({ pressed }) => [classes.tool, pressed && classes.pressed]}
                >
                    <Search color={color.surface} size={20} />
                    <Text variant="caption" style={classes.toolText}>{`${1 + ZOOM[zoomStep] * 4}x`}</Text>
                </Pressable>
            </View>
            <View
                style={classes.view}
                onLayout={(e) => setPreview(e.nativeEvent.layout)}
                onTouchEnd={(e) => {
                    // Tap to focus: the camera tool only supports it on iPhone (autofocus once, then lock). Android focuses by itself.
                    if (Platform.OS === "ios") setFocus({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, n: Date.now() });
                }}
            >
                <CameraView
                    ref={camera}
                    style={classes.camera}
                    facing="back"
                    enableTorch={torch}
                    zoom={ZOOM[zoomStep]}
                    autofocus={focus ? "on" : "off"}
                    animateShutter={false}
                    onCameraReady={() => setReady(true)}
                />
                <StaffOverlay detection={liveOn ? live.detection : undefined} width={preview.width} height={preview.height} />
                <View pointerEvents="none" style={classes.guide} />
                {focus && Platform.OS === "ios" && (
                    <View pointerEvents="none" style={[classes.focusRing, { left: focus.x - 32, top: focus.y - 32 }]} />
                )}
            </View>
            <Text variant="body" tone="inkSecondary" style={classes.centered}>
                {t("scan.frameHint")}
            </Text>
            <View style={classes.actions}>
                <Button onPress={capture} disabled={!ready}>
                    {t("scan.capture")}
                </Button>
                <Button secondary onPress={upload}>
                    {t("scan.upload")}
                </Button>
            </View>
        </SafeAreaView>
    );
}
