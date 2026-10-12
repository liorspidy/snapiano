// Runs one job at a time, repeatedly, with a minimum gap between starts. Pure code (no React) so it can be tested.
//
// Guarantees: a job never overlaps another one, even after stop() followed straight away by start(); stop() waits for the
// job in progress, and no new job starts after it; a job that throws does not end the loop; the job is told when it has
// been cancelled so it can skip work, but it always runs to its own `finally` (that is where temporary files are deleted).

export type SnapshotLoop = {
    start(): void;
    /** Stops new jobs and resolves when the job in progress (if any) has finished. */
    stop(): Promise<void>;
};

type Options = {
    run: (isCancelled: () => boolean) => Promise<void>;
    /** A number, or a function read before every cycle so the interval can be changed while the loop runs. */
    minIntervalMs: number | (() => number);
    firstDelayMs?: number;
    minGapMs?: number;
};

export function createSnapshotLoop({ run, minIntervalMs, firstDelayMs = 0, minGapMs = 0 }: Options): SnapshotLoop {
    let generation = 0; // every start() and stop() begins a new generation; older ones can never schedule anything
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<void> | null = null;
    let active = false;

    const schedule = (gen: number, delay: number) => { timer = setTimeout(() => tick(gen), delay); };

    const tick = async (gen: number) => {
        if (gen !== generation) return;
        if (inFlight) { await inFlight; if (gen !== generation) return; } // never overlap with a job from an older generation
        const startedAt = Date.now();
        const job = (async () => { try { await run(() => gen !== generation); } catch { /* skipped; the next one tries again */ } })();
        inFlight = job;
        await job;
        if (inFlight === job) inFlight = null;
        const interval = typeof minIntervalMs === "function" ? minIntervalMs() : minIntervalMs;
        if (gen === generation) schedule(gen, Math.max(minGapMs, interval - (Date.now() - startedAt)));
    };

    return {
        start() {
            if (active) return;
            active = true;
            generation++;
            schedule(generation, firstDelayMs);
        },
        async stop() {
            active = false;
            generation++;
            if (timer) clearTimeout(timer);
            if (inFlight) await inFlight;
        },
    };
}
