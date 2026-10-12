// Audio proof of concept harness (dev only). Reached with `adb shell am start -d snapiano://audio-poc` in a build made
// with EXPO_PUBLIC_AUDIO_POC=1; any other build redirects home. It never touches the practice screen or synth.ts state
// beyond calling synth.ts the way the practice screen does (engine A).
// ponytail: English only and no i18n, it is a measuring tool that never ships.
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { Directory, File, Paths } from "expo-file-system";
import { AudioManager } from "react-native-audio-api";
import { Button } from "@/ui/Button/Button";
import { Text } from "@/ui/Text/Text";
import { aUsedThisSession, Check, Engine, engineA, engineAPrime, loadSamples, signalChecks } from "@/audio/poc/engines";
import { busyWait, Mix, Preset, PRESETS, Scheduler, stats } from "@/audio/poc/poc";
import classes from "@/styles/AudioPoc.module.scss";

const ENABLED = process.env.EXPO_PUBLIC_AUDIO_POC === "1";
// A copies the practice screen (33 ms timer, 120 ms lookahead); A′ schedules a full second ahead.
const TIMING = { A: { tickMs: 33, lookahead: 0.12 }, "A′": { tickMs: 100, lookahead: 1 } } as const;
type Name = keyof typeof TIMING;
type Event = { wallMs: number; audio: number; type: string; detail?: string };

const ms = (s: number) => (s * 1000).toFixed(1);

export default function AudioPoc() {
    const [name, setName] = useState<Name>("A′");
    const [preset, setPreset] = useState<Preset>(PRESETS[0]);
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [report, setReport] = useState("");
    const [busy, setBusy] = useState(false);
    const lastLog = useRef(""); // release builds are not debuggable (no adb run-as), so logs leave by the share sheet
    const engines = useRef<Partial<Record<Name, Engine & { decodeMs?: number }>>>({});
    const run = useRef<{ sch: Scheduler; engine: Engine; timers: ReturnType<typeof setTimeout>[]; events: Event[]; t0: { audio: number; wall: number }; preset: Preset; mix: Mix } | null>(null);

    const engineFor = async (n: Name, mix: Mix) => {
        if (!engines.current[n]) engines.current[n] = n === "A" ? engineA() : await engineAPrime(mix);
        return engines.current[n]!;
    };
    const event = (type: string, detail?: string) => {
        const r = run.current;
        if (r) r.events.push({ wallMs: performance.now(), audio: r.engine.now(), type, detail: detail ?? r.engine.state() });
    };

    // Lifecycle evidence only: app background/foreground and the library's system events are logged, never acted on.
    useEffect(() => {
        if (!ENABLED) return;
        const subs = [
            AppState.addEventListener("change", (s) => event("appState", s)),
            AudioManager.addSystemEventListener("interruption", (e) => event("interruption", JSON.stringify(e))),
            AudioManager.addSystemEventListener("routeChange", (e) => event("routeChange", JSON.stringify(e))),
            AudioManager.addSystemEventListener("duck", () => event("duck")),
        ];
        return () => {
            subs.forEach((s) => s?.remove());
            stop("screen closed");
            engines.current["A′"]?.close();
        };
    }, []);

    if (!ENABLED) return <Redirect href="/" />;

    const stop = (why: string) => {
        const r = run.current;
        if (!r) return;
        r.timers.forEach((t) => clearInterval(t));
        const now = r.engine.now();
        if (r.engine.cancelAfter) {
            r.engine.cancelAfter(now);
            for (const e of r.sch.log) if (e.t > now) e.cancelled = true;
        }
        event("stop", why);
        run.current = null;
        setRunning(false);
        finish(r, why);
    };

    const finish = (r: NonNullable<typeof run.current>, why: string) => {
        const live = r.sch.log.filter((e) => !e.cancelled);
        const late = live.filter((e) => e.slack < 0);
        const gaps = r.sch.tickTimes.slice(1).map((t, i) => t - r.sch.tickTimes[i]);
        const audioSpan = r.engine.now() - r.t0.audio;
        const wallSpan = (performance.now() - r.t0.wall) / 1000;
        const clockPpm = (audioSpan / wallSpan - 1) * 1e6;
        const slack = stats(live.map((e) => e.slack));
        const gap = stats(gaps);
        const summary = {
            engine: r.engine.name,
            preset: r.preset.id,
            ended: why,
            device: `${Platform.OS} ${Platform.Version} ${(Platform.constants as any)?.Model ?? ""}`,
            sampleRate: r.engine.sampleRate(),
            aUsedThisSession,
            notes: live.length,
            cancelled: r.sch.log.length - live.length,
            lateNotes: late.length,
            worstLateMs: late.length ? -Math.min(...late.map((e) => e.slack)) * 1000 : 0,
            slackMs: { min: slack.min * 1000, p50: slack.p50 * 1000 },
            tickGapMs: { p50: gap.p50 * 1000, p99: gap.p99 * 1000, max: gap.max * 1000 },
            audioVsWallPpm: clockPpm,
        };
        const lines = [
            `${summary.engine} · ${r.preset.label} · ended: ${why}`,
            `device ${summary.device}, ${summary.sampleRate} Hz${aUsedThisSession && summary.engine === "A′" ? "  ⚠ A ran in this session: restart the app before measuring A′" : ""}`,
            `notes scheduled ${summary.notes}, taken back ${summary.cancelled}`,
            `late notes ${late.length}${late.length ? `, worst ${summary.worstLateMs.toFixed(1)} ms late` : ""}`,
            `scheduling slack min ${ms(slack.min)} ms, median ${ms(slack.p50)} ms`,
            `JS timer gaps median ${ms(gap.p50)} ms, p99 ${ms(gap.p99)} ms, max ${ms(gap.max)} ms`,
            `audio clock vs wall clock ${clockPpm.toFixed(0)} ppm over ${wallSpan.toFixed(1)} s`,
            `events: ${r.events.map((e) => `${e.type}(${e.detail})`).join(", ") || "none"}`,
        ];
        let saved = "";
        try {
            const dir = new Directory(Paths.document, "audio-poc");
            if (!dir.exists) dir.create();
            const file = new File(dir, `${summary.engine === "A" ? "A" : "Aprime"}-${r.preset.id}-${Date.now()}.json`);
            lastLog.current = JSON.stringify({ summary, mix: r.mix, retimes: r.sch.retimes, scheduled: r.sch.log, events: r.events, t0: r.t0 });
            file.write(lastLog.current);
            saved = file.uri;
        } catch (e) {
            saved = `not saved: ${String(e)}`;
        }
        lines.push(`log ${saved}`);
        console.log("[audio-poc]", JSON.stringify(summary), saved);
        setReport(lines.join("\n"));
    };

    const start = async () => {
        setBusy(true);
        try {
            const p = preset;
            const engine = await engineFor(name, p.mix);
            await engine.ready();
            engine.setMix(p.mix);
            await new Promise((r) => setTimeout(r, 150)); // let the A′ fader settle (15 ms time constant)
            const timing = TIMING[name];
            const sch = new Scheduler(p.notes, {
                lookahead: timing.lookahead,
                now: engine.now,
                play: engine.play,
                cancelAfter: engine.cancelAfter,
                anchorAtLastTick: name === "A",
            });
            const t0 = { audio: engine.now(), wall: performance.now() };
            run.current = { sch, engine, timers: [], events: [], t0, preset: p, mix: { ...p.mix } };
            sch.start(p.bpm);
            const r = run.current;
            r.timers.push(
                setInterval(() => {
                    sch.tick();
                    setElapsed(engine.now() - t0.audio); // a re-render per tick, like the practice cursor
                    if (engine.now() > sch.endTime + 1.5) stop("finished");
                }, timing.tickMs),
            );
            if (p.jsLoad) r.timers.push(setInterval(() => busyWait(150), 1000));
            for (const step of p.tempo ?? [])
                r.timers.push(setTimeout(() => (sch.setTempo(step.bpm), event("tempo", String(step.bpm))), step.atS * 1000));
            event("start", `${engine.state()} decode ${(engine as any).decodeMs ?? "?"} ms`);
            setRunning(true);
            setReport("");
        } catch (e) {
            setReport(`could not start: ${String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    // Live controls for listening tests (fader smoothing, tempo while playing).
    const liveMix = (part: Partial<Mix>) => {
        const r = run.current;
        if (!r) return;
        Object.assign(r.mix, part);
        r.engine.setMix(r.mix);
        event("mix", JSON.stringify(r.mix));
    };
    const liveTempo = (delta: number) => {
        const r = run.current;
        if (!r) return;
        const bpm = Math.min(240, Math.max(30, r.sch.bpm + delta));
        r.sch.setTempo(bpm);
        event("tempo", String(bpm));
    };

    const runChecks = async () => {
        setBusy(true);
        try {
            const engine = await engineFor("A′", PRESETS[0].mix);
            const rate = engine.sampleRate();
            const { buffers } = await loadSamples(rate);
            const checks: Check[] = await signalChecks(buffers, rate);
            const text = checks.map((c) => `${c.pass ? "PASS" : "FAIL"}  ${c.name}\n      ${c.detail}`).join("\n");
            console.log("[audio-poc] checks", JSON.stringify(checks));
            try {
                const dir = new Directory(Paths.document, "audio-poc");
                if (!dir.exists) dir.create();
                lastLog.current = JSON.stringify({ rate, checks });
                new File(dir, `checks-${Date.now()}.json`).write(lastLog.current);
            } catch {}
            setReport(`offline signal checks at ${rate} Hz (A′ graph)\n${text}`);
        } catch (e) {
            setReport(`checks failed to run: ${String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={classes.screen}>
            <ScrollView contentContainerStyle={classes.content}>
                <Text variant="title" accessibilityRole="header">Audio engine test</Text>
                <Text variant="caption" tone="inkMuted">
                    A = production synth.ts. A′ = same library, fixed usage. Restart the app between an A run and an A′ measurement.
                </Text>

                <Text variant="label" style={classes.section}>Engine</Text>
                <View style={classes.row}>
                    {(["A′", "A"] as Name[]).map((n) => (
                        <Button key={n} size="S" sizeFormat="fitContent" secondary={name !== n} disabled={running}
                            accessibilityLabel={`Engine ${n}`}
                            // A decodes its samples in the background (synth.ts): start that as soon as A is chosen.
                            onPress={() => (setName(n), n === "A" && engineFor("A", preset.mix))}>
                            {n}
                        </Button>
                    ))}
                </View>

                <Text variant="label" style={classes.section}>Test</Text>
                {PRESETS.map((p) => (
                    <Button key={p.id} size="S" secondary={preset.id !== p.id} disabled={running} onPress={() => setPreset(p)}>
                        {p.label}
                    </Button>
                ))}

                <Text variant="label" style={classes.section}>While playing</Text>
                <View style={classes.row}>
                    <Button size="S" sizeFormat="fitContent" secondary disabled={!running} onPress={() => liveMix({ volume: 0.5 })}>Volume 50</Button>
                    <Button size="S" sizeFormat="fitContent" secondary disabled={!running} onPress={() => liveMix({ volume: 1 })}>Volume 100</Button>
                    <Button size="S" sizeFormat="fitContent" secondary disabled={!running} onPress={() => liveMix({ reverb: 0 })}>Reverb 0</Button>
                    <Button size="S" sizeFormat="fitContent" secondary disabled={!running} onPress={() => liveMix({ reverb: 1 })}>Reverb 100</Button>
                    <Button size="S" sizeFormat="fitContent" secondary disabled={!running} onPress={() => liveTempo(-20)}>Tempo −20</Button>
                    <Button size="S" sizeFormat="fitContent" secondary disabled={!running} onPress={() => liveTempo(20)}>Tempo +20</Button>
                </View>

                <Button size="S" secondary disabled={running || busy} onPress={runChecks} style={classes.section}>
                    Run offline signal checks (A′)
                </Button>

                <Button size="S" secondary disabled={running || !report} onPress={() => Share.share({ message: lastLog.current || report })}>
                    Share last log (JSON)
                </Button>

                {running && <Text variant="body">Playing {elapsed.toFixed(1)} s</Text>}
                {!!report && <Text selectable style={classes.report}>{report}</Text>}
            </ScrollView>
            <View style={classes.footer}>
                <Button isPending={busy} pending="Preparing" onPress={() => (running ? stop("stopped by hand") : start())}>
                    {running ? "Stop" : `Play with ${name}`}
                </Button>
            </View>
        </SafeAreaView>
    );
}
