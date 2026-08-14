"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { getSettings, logSession, markProgramDayComplete, newId, saveSettings } from "@/lib/store";
import { DEFAULT_SETTINGS, type CoachLevel, type Settings } from "@/lib/types";
import { useSession } from "@/lib/useSession";
import { useWakeLock } from "@/lib/useWakeLock";
import { useVoiceCommands } from "@/lib/useVoiceCommands";
import { setCoachVoice, speak } from "@/lib/audio";
import { getCoach } from "@/lib/coaches";
import CoachPicker from "@/components/CoachPicker";
import RoutineFeedback from "@/components/RoutineFeedback";
import { instructionsFor, youtubeSearchUrl } from "@/lib/instructions";
import { mmss, targetLabel, typeLabel } from "@/lib/format";

const PHASE_META = {
  prep: { label: "Get ready", color: "var(--prep)" },
  work: { label: "Work", color: "var(--work)" },
  rest: { label: "Rest", color: "var(--rest)" },
} as const;

export default function Player({
  routine,
  programDayId,
  onProgramComplete,
}: {
  routine: Routine;
  programDayId?: string;
  /** Called with the day id when a program day finishes. Defaults to the legacy
   * code-program marker; the personalized program passes the block marker. */
  onProgramComplete?: (dayId: string) => void | Promise<void>;
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => setSettings(getSettings()), []);
  // Keep the audio layer's active voice in sync with the chosen coach.
  useEffect(() => {
    setCoachVoice(getCoach(settings.coachId).voice);
  }, [settings.coachId]);

  const s = useSession(routine, settings);
  useWakeLock(s.running);

  const [voiceControl, setVoiceControl] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const exitHref = programDayId ? "/app/program" : "/app";
  const phase = s.segment?.phase ?? "prep";
  const meta = PHASE_META[phase];
  const ex = s.segment?.exercise;
  const secs = Math.ceil(s.remaining);

  // Which exercise the "How to" panel explains (the upcoming one during rest).
  const instrEx = phase === "rest" ? s.nextExercise ?? ex : ex;
  const instr = instrEx ? instructionsFor(instrEx.name) : null;

  function readInstructions() {
    if (!instr) return;
    setShowInstructions(true);
    if (settings.voice) speak(instr.text);
  }

  // Voice commands map to the same controls as the buttons.
  const voice = useVoiceCommands(voiceControl, (cmd) => {
    switch (cmd) {
      case "pause":
        s.pause();
        break;
      case "resume":
        s.resume();
        break;
      case "start":
        if (s.awaitingReady) s.ready();
        else if (!s.started || s.finished) s.start();
        else s.resume();
        break;
      case "skip":
        s.skip();
        break;
      case "back":
        s.back();
        break;
      case "restart":
        s.restartSegment();
        break;
      case "instructions":
        readInstructions();
        break;
    }
  });

  // Log the session exactly once when it finishes.
  const loggedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (s.started && startedAtRef.current == null) startedAtRef.current = Date.now();
  }, [s.started]);
  useEffect(() => {
    if (s.finished && !loggedRef.current) {
      loggedRef.current = true;
      const started = startedAtRef.current ?? Date.now();
      void logSession({
        id: newId(),
        routineId: routine.id,
        routineName: routine.name,
        date: Date.now(),
        durationSec: Math.round((Date.now() - started) / 1000),
        completedCount: routine.exercises.length,
        totalCount: routine.exercises.length,
      });
      if (programDayId) {
        if (onProgramComplete) void onProgramComplete(programDayId);
        else void markProgramDayComplete(programDayId);
      }
    }
  }, [s.finished, routine, programDayId, onProgramComplete]);

  function toggleSetting(key: "voice" | "beeps") {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveSettings(next);
  }

  function toggleSetup() {
    const next: Settings = {
      ...settings,
      setupMode: settings.setupMode === "wait" ? "timed" : "wait",
    };
    setSettings(next);
    saveSettings(next);
  }

  function toggleQuickWarmup() {
    const next: Settings = { ...settings, quickWarmup: !settings.quickWarmup };
    setSettings(next);
    saveSettings(next);
  }

  function chooseCoach(id: string) {
    const next: Settings = { ...settings, coachId: id };
    setSettings(next);
    saveSettings(next);
  }

  const COACH_ORDER: CoachLevel[] = ["full", "counts", "quiet"];
  const COACH_LABEL: Record<CoachLevel, string> = { full: "Full", counts: "Counts", quiet: "Quiet" };
  function cycleCoach() {
    const next = {
      ...settings,
      coachLevel: COACH_ORDER[(COACH_ORDER.indexOf(settings.coachLevel) + 1) % COACH_ORDER.length],
    };
    setSettings(next);
    saveSettings(next);
  }

  // ---- Pre-start screen ----
  if (!s.started && !s.finished) {
    return (
      <Shell routine={routine} exitHref={exitHref} progress={0}>
        <div className="flex flex-1 flex-col items-center gap-5 text-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted">Ready when you are</p>
            <h1 className="mt-1 text-3xl font-bold">{routine.name}</h1>
            <p className="mt-2 text-muted">
              {routine.exercises.length} exercises · {routine.focus}
            </p>
          </div>
          <button
            onClick={s.start}
            className="w-full rounded-2xl bg-brand py-5 text-lg font-bold text-black transition active:scale-[0.98]"
          >
            ▶ Start workout
          </button>
          <p className="text-xs text-muted">
            Tip: turn your volume up — the coach calls out every move. Tap “How to” on any
            exercise if you’re unsure of the form.
          </p>
          <CoachPicker coachId={settings.coachId} onChange={chooseCoach} />
          <ol className="w-full space-y-1 text-left text-sm text-muted">
            {routine.exercises.map((e, i) => (
              <li key={e.id} className="flex justify-between border-b border-border/60 py-1.5">
                <span>
                  <span className="mr-2 text-muted/60">{i + 1}.</span>
                  {e.name}
                </span>
                <span className="tnum text-foreground/80">{targetLabel(e)}</span>
              </li>
            ))}
          </ol>
        </div>
      </Shell>
    );
  }

  // ---- Finished screen ----
  if (s.finished) {
    const mins = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 60000)
      : 0;
    return (
      <Shell routine={routine} exitHref={exitHref} progress={1}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="text-6xl">🎉</div>
          <div>
            <h1 className="text-3xl font-bold">Workout complete!</h1>
            <p className="mt-2 text-muted">
              {routine.exercises.length} exercises{mins ? ` · ~${mins} min` : ""}
            </p>
          </div>

          <RoutineFeedback routine={routine} />

          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => {
                loggedRef.current = false;
                startedAtRef.current = null;
                s.restart();
              }}
              className="w-full rounded-2xl bg-surface-2 py-4 font-semibold"
            >
              Repeat
            </button>
            <Link
              href={exitHref}
              className="w-full rounded-2xl bg-brand py-4 font-bold text-black"
            >
              Done
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- Active session ----
  return (
    <Shell routine={routine} exitHref={exitHref} progress={s.progress} timeLeft={mmss(s.totalRemaining)}>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Exercise {(s.segment?.exerciseIndex ?? 0) + 1} of {s.totalExercises}
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => toggleSetting("voice")}
            className={settings.voice ? "text-brand" : "text-muted line-through"}
          >
            🔊 Voice
          </button>
          <button
            onClick={() => toggleSetting("beeps")}
            className={settings.beeps ? "text-brand" : "text-muted line-through"}
          >
            🔔 Beeps
          </button>
          <button
            onClick={cycleCoach}
            className={settings.coachLevel !== "quiet" ? "text-brand" : "text-muted"}
            title="How much the coach talks during a set (counts reps, times holds)"
          >
            🗣️ {COACH_LABEL[settings.coachLevel]}
          </button>
          <button
            onClick={toggleSetup}
            className="text-muted"
            title="Setup before each move: a timed countdown, or wait until you say “Ready” / tap"
          >
            ⏱️ {settings.setupMode === "wait" ? "Wait" : "Timed"}
          </button>
          <button
            onClick={toggleQuickWarmup}
            className={settings.quickWarmup ? "text-brand" : "text-muted"}
            title="Warm-up moves get a quick name call instead of the full get-into-position setup"
          >
            ⏩ {settings.quickWarmup ? "Quick" : "Full"}
          </button>
          <button
            onClick={() => setVoiceControl((v) => !v)}
            className={voiceControl ? "text-brand" : "text-muted"}
            title="Voice commands: say pause, continue, next, back, restart, instructions"
          >
            {voiceControl ? "🎙️ On" : "🎙️ Off"}
          </button>
        </div>
      </div>

      {voiceControl ? (
        <p className="mt-1 text-center text-[11px] text-muted">
          {voice.error
            ? `Voice control: ${voice.error}`
            : voice.supported
              ? voice.listening
                ? "Listening — say “pause”, “continue”, “next”, “back”, “restart”, “instructions”."
                : "Starting microphone…"
              : "Voice control isn’t supported in this browser."}
        </p>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span
          className="rounded-full px-4 py-1 text-sm font-bold uppercase tracking-widest"
          style={{ color: meta.color, backgroundColor: `${meta.color}22` }}
        >
          {phase === "work" ? typeLabel(ex!.type) : s.awaitingReady ? "Set up" : meta.label}
        </span>

        <h1 className="px-2 text-3xl font-bold leading-tight">
          {phase === "rest" ? "Rest" : ex?.name}
        </h1>

        {phase === "prep" && ex?.setup ? (
          <p className="max-w-xs px-2 text-lg leading-snug text-foreground/90">{ex.setup}</p>
        ) : null}

        {s.awaitingReady ? (
          <button
            onClick={s.ready}
            className="rounded-2xl bg-brand px-8 py-5 text-2xl font-black text-black transition active:scale-95"
          >
            I&apos;m ready ▶
          </button>
        ) : (
          <div className="tnum text-8xl font-black leading-none" style={{ color: meta.color }}>
            {secs}
          </div>
        )}

        {phase === "work" && ex?.mode === "reps" && ex.reps ? (
          <p className="text-lg font-semibold text-foreground/90">Target: {ex.reps} reps</p>
        ) : null}
        {phase === "work" && ex?.cue ? <p className="max-w-xs text-muted">{ex.cue}</p> : null}

        {s.nextExercise ? (
          <p className="text-sm text-muted">
            Next up: <span className="text-foreground">{s.nextExercise.name}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Last one — finish strong!</p>
        )}

        {instr ? (
          <button
            onClick={() => setShowInstructions((v) => !v)}
            className="mt-1 rounded-full bg-surface-2 px-4 py-1.5 text-sm text-foreground/90"
          >
            {showInstructions ? "Hide how-to" : "ℹ️ How to"}
          </button>
        ) : null}

        {showInstructions && instr && instrEx ? (
          <div className="w-full rounded-2xl border border-border bg-surface p-4 text-left">
            <p className="mb-1 text-sm font-semibold">
              How to: {instrEx.name.replace(/—.*$/, "").trim()}
            </p>
            <p className="text-sm text-muted">{instr.text}</p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <button onClick={() => speak(instr.text)} className="text-brand">
                🔊 Read aloud
              </button>
              <a
                href={youtubeSearchUrl(instr.query)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand"
              >
                Watch on YouTube ↗
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* controls */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <button
          onClick={s.back}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-xl"
          aria-label="Previous"
        >
          ⏮
        </button>
        <button
          onClick={s.toggle}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-3xl text-black active:scale-95"
          aria-label={s.awaitingReady ? "I'm ready" : s.running ? "Pause" : "Play"}
        >
          {s.awaitingReady ? "▶" : s.running ? "⏸" : "▶"}
        </button>
        <button
          onClick={s.skip}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-xl"
          aria-label="Skip"
        >
          ⏭
        </button>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted">
        <span className="tnum">
          {s.awaitingReady
            ? "Take your time — say “ready” or tap ▶"
            : `${mmss(s.remaining)} left this interval`}
        </span>
        <button onClick={s.restartSegment} className="hover:text-foreground">
          ↺ Restart set
        </button>
      </div>
    </Shell>
  );
}

function Shell({
  routine,
  exitHref,
  progress,
  timeLeft,
  children,
}: {
  routine: Routine;
  exitHref: string;
  progress?: number;
  /** Whole-routine time remaining (mm:ss), shown next to the progress %. */
  timeLeft?: string;
  children: React.ReactNode;
}) {
  const pct = progress == null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="flex min-h-dvh flex-col">
      {/* overall progress — pinned at the very top */}
      {pct != null ? (
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      <div className="mb-3 flex items-center justify-between">
        <span className="truncate text-sm font-medium text-muted">
          {routine.name}
          {pct != null ? <span className="ml-2 text-muted/70 tnum">{pct}%</span> : null}
        </span>
        <div className="flex items-center gap-3">
          {timeLeft ? <span className="tnum text-sm font-semibold text-foreground/90">⏱ {timeLeft}</span> : null}
          <Link href={exitHref} className="text-sm text-muted hover:text-foreground" aria-label="Exit">
            ✕
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
