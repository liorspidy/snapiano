import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { Text } from "@/ui/Text/Text";
import classes from "./PageLoader.module.scss";

// One octave, in the order a scale is played: C, C#, D, D#, E, F, F#, G, G#, A, A#, B.
const WHITE_X = [0, 20, 40, 60, 80, 100, 120];
const BLACK_X = [14, 34, 74, 94, 114];
const KEYS = [
    { white: 0 }, { black: 0 }, { white: 1 }, { black: 1 }, { white: 2 }, { white: 3 },
    { black: 2 }, { white: 4 }, { black: 3 }, { white: 5 }, { black: 4 }, { white: 6 },
] as { white?: number; black?: number }[];
const STEP = KEYS.length;
const LOOP_MS = 1300;

// Each key glows like a soft bump (raised cosine) that is full at its own step and gone one step before and after.
// So when the next key reaches full blue the older one has just gone out, and in between they cross-fade smoothly.
// Distances wrap around the loop, so the last key hands the light back to the first without a jump.
const SAMPLES_PER_STEP = 8;
const INPUT = Array.from({ length: STEP * SAMPLES_PER_STEP + 1 }, (_, i) => i / SAMPLES_PER_STEP);
const curve = (step: number) =>
    INPUT.map((x) => {
        const d = Math.abs(x - step);
        const wrapped = Math.min(d, STEP - d);
        return wrapped >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * wrapped));
    });

// Brand piano octave: each key lights up in the brand blue in turn. Black keys are the brand navy.
function Octave({ still }: { still: boolean }) {
    const t = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (still) return;
        const loop = Animated.loop(Animated.timing(t, { toValue: STEP, duration: LOOP_MS, easing: (x) => x, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [t, still]);

    const lit = (step: number) => <Animated.View style={[classes.lit, { opacity: t.interpolate({ inputRange: INPUT, outputRange: curve(step) }) }]} />;
    return (
        <View style={classes.octave}>
            {KEYS.map((key, step) => key.white !== undefined && (
                <View key={`w${key.white}`} style={[classes.white, { left: WHITE_X[key.white] }]}><View style={classes.clip}>{lit(step)}</View></View>
            ))}
            {KEYS.map((key, step) => key.black !== undefined && (
                <View key={`b${key.black}`} style={[classes.black, { left: BLACK_X[key.black] }]}><View style={classes.clip}>{lit(step)}</View></View>
            ))}
        </View>
    );
}

type Controls = { show: (label: string) => void; hide: () => void };
const Ctx = createContext<Controls>({ show: () => {}, hide: () => {} });

/** Shows the page loader while `active` is true. Call it from the screen that is waiting. */
export function usePageLoader(active: boolean, label: string) {
    const { show, hide } = useContext(Ctx);
    useEffect(() => {
        if (!active) return;
        show(label);
        return hide;
    }, [active, label, show, hide]);
}

// Wrap the app once. The content sits inside a BlurTargetView so the overlay can blur it on Android as well as iOS.
export function PageLoaderProvider({ children }: { children: ReactNode }) {
    const target = useRef<View>(null);
    const [label, setLabel] = useState<string>();
    const [mounted, setMounted] = useState(false);
    const [still, setStill] = useState(false);
    const fade = useRef(new Animated.Value(0)).current;

    const show = useCallback((text: string) => { setLabel(text); setMounted(true); }, []);
    const hide = useCallback(() => setLabel(undefined), []);

    useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setStill); }, []);
    useEffect(() => {
        if (label !== undefined) Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        else Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setMounted(false));
    }, [label, fade]);

    return (
        <Ctx.Provider value={{ show, hide }}>
            <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>
            {mounted && (
                <Animated.View
                    style={[classes.overlay, { opacity: fade }]}
                    onStartShouldSetResponder={() => true}
                    accessibilityViewIsModal
                    accessibilityRole="progressbar"
                    accessibilityLabel={label}
                    accessibilityLiveRegion="polite"
                >
                    <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={70} tint="light" style={classes.scrim} />
                    <View style={classes.scrim} />
                    <Octave still={still} />
                    <Text variant="bodyLarge" style={classes.label}>{label}</Text>
                </Animated.View>
            )}
        </Ctx.Provider>
    );
}
