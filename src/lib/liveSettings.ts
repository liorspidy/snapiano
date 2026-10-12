// Developer-tunable settings of the live staff detection, kept on this phone (AsyncStorage). Set in the admin screen.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const INTERVAL_KEY = "snapiano.live.intervalMs";
export const INTERVAL_DEFAULT_MS = 100;
export const INTERVAL_MIN_MS = 0;      // 0 = a new snapshot as soon as the last one is done
export const INTERVAL_MAX_MS = 5000;

export const clampInterval = (ms: number) => (Number.isFinite(ms) ? Math.min(INTERVAL_MAX_MS, Math.max(INTERVAL_MIN_MS, Math.round(ms))) : INTERVAL_DEFAULT_MS);

/** Step for the - and + buttons: fine below half a second, coarser above. */
export const nextInterval = (ms: number, direction: 1 | -1) => {
    const step = ms < 500 || (ms === 500 && direction < 0) ? 50 : 250;
    return clampInterval(ms + direction * step);
};

// The loop reads this on every cycle; it is filled from storage when the app starts using it.
export const liveSettings = { intervalMs: INTERVAL_DEFAULT_MS };

export async function loadLiveSettings() {
    try {
        const raw = await AsyncStorage.getItem(INTERVAL_KEY);
        if (raw !== null) liveSettings.intervalMs = clampInterval(Number(raw));
    } catch { /* keep the default */ }
    return liveSettings.intervalMs;
}

export async function saveInterval(ms: number) {
    liveSettings.intervalMs = clampInterval(ms);
    try { await AsyncStorage.setItem(INTERVAL_KEY, String(liveSettings.intervalMs)); } catch { /* applies until the app restarts */ }
    return liveSettings.intervalMs;
}
