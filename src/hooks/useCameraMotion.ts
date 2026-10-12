import { requireOptionalNativeModule } from "expo-modules-core";
import { useEffect, useState } from "react";

const MOVING_ABOVE = 0.45; // rad/s, about 26 degrees per second
const STILL_BELOW = 0.2;   // rad/s
const STILL_FOR_MS = 350;

// Only the gyroscope is loaded, and only when it is needed: the package's main file also loads every other sensor
// (such as the step counter), and one of them is missing from some Expo Go versions, which crashed the whole scan screen.
type GyroMeasurement = { x: number; y: number; z: number };
type GyroModule = { Gyroscope: { setUpdateInterval(ms: number): void; addListener(cb: (m: GyroMeasurement) => void): { remove(): void } } };

/**
 * True while the phone is being turned or swung. The live boxes come from snapshots a second or so apart, so while the
 * camera moves they are out of date: the overlay fades them instead of letting them point at the wrong place.
 * If the sensor is missing or fails to start, the answer stays false (the boxes just stay visible) and nothing else breaks.
 */
export function useCameraMotion(active: boolean) {
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        if (!active) { setMoving(false); return; }
        // Look for the native part first, quietly: loading the sensor file without it prints a red error, even when caught.
        if (!requireOptionalNativeModule("ExponentGyroscope")) return;
        let sub: { remove(): void } | undefined;
        try {
            const loaded = require("expo-sensors/build/Gyroscope");
            const Gyroscope: GyroModule["Gyroscope"] = loaded.default ?? loaded.Gyroscope;
            let calmSince = Date.now();
            let state = false;
            Gyroscope.setUpdateInterval(120);
            sub = Gyroscope.addListener(({ x, y, z }) => {
                const speed = Math.sqrt(x * x + y * y + z * z);
                if (speed > MOVING_ABOVE) { calmSince = Infinity; if (!state) { state = true; setMoving(true); } }
                else if (speed < STILL_BELOW) {
                    if (calmSince === Infinity) calmSince = Date.now();
                    if (state && Date.now() - calmSince > STILL_FOR_MS) { state = false; setMoving(false); }
                }
            });
        } catch {
            // no gyroscope in this app build: the overlay simply never fades
        }
        return () => { sub?.remove(); setMoving(false); };
    }, [active]);

    return moving;
}
