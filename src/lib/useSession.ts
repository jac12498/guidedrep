"use client";

// Drives a workout as a flat timeline of segments (prep / work / rest), advancing
// automatically on a real-time clock and firing hands-free audio cues at each
// boundary. Timing is anchored to performance.now() timestamps so it stays accurate
// even if the tab throttles the interval.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CoachLevel, Exercise, Routine, Settings } from "./types";
import { getCoach, type Coach } from "./coaches";
import {
  chimeGo,
  speak,
  speakSoft,
  stopSpeaking,
  tick as tickSound,
  unlockAudio,
} from "./audio";

export type Phase = "prep" | "work" | "rest";

export interface Segment {
  phase: Phase;
  durationSec: number;
  exercise: Exercise;
  exerciseIndex: number;
}

// Floor for the timed setup countdown so the "get into position" narration has
// room to play before "Go!". In "wait" mode the prep segment holds instead.
const MIN_SETUP_SEC = 10;

const spokenName = (e: Exercise): string => e.sayName || e.name;

/**
 * The full "Get ready" narration for an exercise: name, target, how to get into
 * position, and the form cue — everything descriptive, spoken here so the work
 * phase can start clean and let rep counting have the floor. The coach persona
 * supplies the intro phrase and the setup tail.
 */
function prepSpeech(
  ex: Exercise,
  coach: Coach,
  setupMode: Settings["setupMode"],
  quick = false,
): string {
  if (quick) {
    // A warm-up flow move: just name it (with its cue) and go — no position setup.
    const cue = ex.cue ? ` ${ex.cue}` : "";
    return `${coach.copy.intro} ${spokenName(ex)}.${cue} ${coach.copy.getReady}`;
  }
  const target = ex.mode === "reps" && ex.reps ? `, ${ex.reps} ${ex.reps === 1 ? "rep" : "reps"}` : "";
  const setup = ex.setup ? ` ${ex.setup}` : "";
  const cue = ex.cue ? ` ${ex.cue}` : "";
  const tail = setupMode === "wait" ? ` ${coach.copy.ready}` : ` ${coach.copy.getReady}`;
  return `${coach.copy.intro} ${spokenName(ex)}${target}.${setup}${cue}${tail}`;
}

/** Whether this exercise gets the quick short setup (warm-up flow + setting on). */
function isQuickSetup(ex: Exercise, settings: Settings): boolean {
  return settings.quickWarmup && !!ex.flow;
}

/** Rough spoken duration of a phrase (~2.6 words/sec for TTS). */
function estimateSpeechSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words / 2.6;
}

/** Timed "Get ready" length: long enough for the narration to finish, floored
 * (a low floor for quick warm-up moves, the full floor otherwise). */
function prepDurationSec(ex: Exercise, settings: Settings): number {
  const coach = getCoach(settings.coachId);
  const quick = isQuickSetup(ex, settings);
  const floor = quick ? 3 : Math.max(settings.prepSec, MIN_SETUP_SEC);
  const narration = Math.ceil(estimateSpeechSec(prepSpeech(ex, coach, "timed", quick)) + (quick ? 1 : 2));
  return Math.max(floor, narration);
}

function buildSegments(routine: Routine, settings: Settings): Segment[] {
  const segs: Segment[] = [];
  const wait = settings.setupMode === "wait";
  const includePrep = wait || settings.prepSec > 0;
  routine.exercises.forEach((ex, i) => {
    if (includePrep) {
      // Wait prep holds (nominal duration) — except quick warm-up moves, which
      // always use a short timed prep and never hold. Timed prep is sized to its
      // narration.
      const quick = isQuickSetup(ex, settings);
      const durationSec = wait && !quick ? MIN_SETUP_SEC : prepDurationSec(ex, settings);
      segs.push({ phase: "prep", durationSec, exercise: ex, exerciseIndex: i });
    }
    segs.push({ phase: "work", durationSec: ex.durationSec, exercise: ex, exerciseIndex: i });
    if (ex.restSec > 0) segs.push({ phase: "rest", durationSec: ex.restSec, exercise: ex, exerciseIndex: i });
  });
  return segs;
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Spell a small count so the voice says "twelve", not "12". */
function numberWord(n: number): string {
  if (n < 20) return ONES[n] ?? String(n);
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (t > 9) return String(n);
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}

interface Cue {
  /** Seconds elapsed into the work segment when this is spoken. */
  at: number;
  text: string;
}

/**
 * Countdown cues for a timed segment, scaled to how long it is:
 * - short holds (≤60s): every 5 seconds, then each second in the final 5.
 * - minutes (1-5): each minute remaining, then a 30-second cue and a final 5-count.
 * - walks (5min+): every 5 minutes, then each minute inside the last 5, then a
 *   30-second cue and a final 5-count.
 */
function timeCountdownCues(D: number): Cue[] {
  const marks: { r: number; text: string }[] = [];
  const add = (r: number, text: string) => {
    if (r > 0 && r < D) marks.push({ r, text }); // never announce at the very start
  };
  const mins = (m: number) => `${m} minute${m === 1 ? "" : "s"} to go`;

  if (D <= 60) {
    for (let r = Math.floor((D - 1) / 5) * 5; r >= 10; r -= 5) add(r, numberWord(r));
    for (let r = 5; r >= 1; r--) add(r, numberWord(r));
  } else {
    if (D >= 300) {
      for (let r = Math.floor((D - 1) / 300) * 300; r >= 300; r -= 300) add(r, mins(r / 60));
    }
    for (let m = Math.min(5, Math.floor((D - 1) / 60)); m >= 1; m--) add(m * 60, mins(m));
    add(30, "Thirty seconds");
    add(10, "Ten seconds");
    for (let r = 5; r >= 1; r--) add(r, numberWord(r));
  }

  const seen = new Set<number>();
  const cues: Cue[] = [];
  for (const { r, text } of marks) {
    if (seen.has(r)) continue; // e.g. the 5-min and 1-5 minute loops both hit 300s
    seen.add(r);
    cues.push({ at: D - r, text });
  }
  return cues.sort((a, b) => a.at - b.at);
}

/**
 * Mid-set spoken cues for a work segment: a count-up per rep (with "last one"),
 * or a scaled countdown for timed holds and walks.
 */
function buildCues(seg: Segment, level: CoachLevel): Cue[] {
  if (level === "quiet" || seg.phase !== "work") return [];
  const ex = seg.exercise;
  const D = seg.durationSec;

  if (ex.mode === "reps" && (ex.reps ?? 0) >= 2) {
    const R = ex.reps as number;
    const interval = D / R;
    const cues: Cue[] = [];
    for (let k = 1; k <= R; k++) {
      const at = (k - 0.5) * interval;
      if (at >= D - 0.2) continue;
      cues.push({ at, text: k === R ? "Last one" : numberWord(k) });
    }
    return cues;
  }
  if (ex.mode === "time" && D >= 6) return timeCountdownCues(D);
  return [];
}

export interface SessionState {
  segments: Segment[];
  index: number;
  segment: Segment | null;
  /** The exercise coming after the current one (for "next up" display). */
  nextExercise: Exercise | null;
  remaining: number;
  running: boolean;
  finished: boolean;
  started: boolean;
  /** True while a "wait" setup phase is holding for the user to say/tap ready. */
  awaitingReady: boolean;
  /** 0..1 across the whole workout. */
  progress: number;
  /** Seconds left in the whole routine (all segments), for the countdown clock. */
  totalRemaining: number;
  completedExercises: number;
  totalExercises: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  /** Leave a held setup phase and begin the exercise. */
  ready: () => void;
  skip: () => void;
  back: () => void;
  /** Re-arm the current interval from the top (redo this set). */
  restartSegment: () => void;
  restart: () => void;
}

export function useSession(routine: Routine, settings: Settings): SessionState {
  const segments = useMemo(
    () => buildSegments(routine, settings),
    [routine, settings],
  );

  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(segments[0]?.durationSec ?? 0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  // In "wait" mode the setup phase holds here until the user signals ready.
  const [awaitingReady, setAwaitingReady] = useState(false);
  const awaitingRef = useRef(false);

  const runningRef = useRef(false);
  const indexRef = useRef(0);
  const endAtRef = useRef<number | null>(null);
  const remainingRef = useRef(remaining);
  const lastSecondRef = useRef<number>(Math.ceil(remaining));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  // Mid-set coaching cues for the current segment, and which have already fired.
  const cuesRef = useRef<Cue[]>([]);
  const firedRef = useRef<Set<number>>(new Set());

  const say = useCallback((text: string) => {
    if (settingsRef.current.voice) speak(text);
  }, []);

  const clearAwait = useCallback(() => {
    awaitingRef.current = false;
    setAwaitingReady(false);
  }, []);

  const announce = useCallback(
    (seg: Segment, next: Segment | undefined) => {
      const ex = seg.exercise;
      const coach = getCoach(settingsRef.current.coachId);
      if (seg.phase === "prep") {
        // All the descriptive narration (name, target, position, cue) happens here,
        // during "Get ready", so it never overlaps mid-set rep counting. Warm-up
        // flow moves get a shorter version when quick setup is on.
        say(prepSpeech(ex, coach, settingsRef.current.setupMode, isQuickSetup(ex, settingsRef.current)));
      } else if (seg.phase === "work") {
        // Keep the work start to a single phrase so rep counts aren't stepped on.
        if (settingsRef.current.beeps) chimeGo();
        say(coach.copy.go);
      } else {
        const nextName = next ? spokenName(next.exercise) : undefined;
        // A little coach personality on rest, at the fullest level only.
        const enc =
          settingsRef.current.coachLevel === "full" && coach.copy.encouragements.length && Math.random() < 0.4
            ? `${coach.copy.encouragements[Math.floor(Math.random() * coach.copy.encouragements.length)]} `
            : "";
        say(nextName ? `${enc}${coach.copy.rest} Coming up: ${nextName}.` : `${enc}${coach.copy.rest}`);
      }
    },
    [say],
  );

  const finish = useCallback(() => {
    runningRef.current = false;
    endAtRef.current = null;
    awaitingRef.current = false;
    setAwaitingReady(false);
    setRunning(false);
    setFinished(true);
    setRemaining(0);
    remainingRef.current = 0;
    stopSpeaking();
    if (settingsRef.current.voice) speak(getCoach(settingsRef.current.coachId).copy.done);
    else if (settingsRef.current.beeps) {
      chimeGo();
    }
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const segs = segmentsRef.current;
      if (i < 0) i = 0;
      if (i >= segs.length) {
        finish();
        return;
      }
      const seg = segs[i];
      indexRef.current = i;
      setIndex(i);
      remainingRef.current = seg.durationSec;
      setRemaining(seg.durationSec);
      lastSecondRef.current = Math.ceil(seg.durationSec);
      // A "wait" setup phase holds instead of running a countdown — but quick
      // warm-up moves never hold.
      const waitPrep =
        seg.phase === "prep" &&
        settingsRef.current.setupMode === "wait" &&
        !isQuickSetup(seg.exercise, settingsRef.current);
      awaitingRef.current = waitPrep && runningRef.current;
      setAwaitingReady(awaitingRef.current);
      endAtRef.current =
        runningRef.current && !waitPrep ? performance.now() + seg.durationSec * 1000 : null;
      cuesRef.current = buildCues(seg, settingsRef.current.coachLevel);
      firedRef.current = new Set();
      announce(seg, segs[i + 1]);
    },
    [announce, finish],
  );

  // Single persistent clock; reads mutable refs so it never goes stale.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!runningRef.current || endAtRef.current == null) return;
      const rem = (endAtRef.current - performance.now()) / 1000;
      const clamped = Math.max(0, rem);
      remainingRef.current = clamped;
      setRemaining(clamped);
      const seg = segmentsRef.current[indexRef.current];

      const whole = Math.ceil(clamped);
      if (whole !== lastSecondRef.current) {
        lastSecondRef.current = whole;
        if (
          settingsRef.current.beeps &&
          whole >= 1 &&
          whole <= 3 &&
          seg &&
          seg.phase !== "rest"
        ) {
          tickSound();
        }
      }

      // Mid-set coaching cues (rep counts / hold countdowns). Fire at most one per
      // tick — the latest that came due — and let speakSoft drop it if the coach is
      // still mid-sentence, so counts stay on-beat and never pile up.
      if (seg && settingsRef.current.voice && cuesRef.current.length) {
        const elapsed = seg.durationSec - clamped;
        let toSpeak: string | null = null;
        for (let ci = 0; ci < cuesRef.current.length; ci++) {
          if (!firedRef.current.has(ci) && cuesRef.current[ci].at <= elapsed) {
            firedRef.current.add(ci);
            toSpeak = cuesRef.current[ci].text;
          }
        }
        if (toSpeak) speakSoft(toSpeak);
      }

      if (rem <= 0) goTo(indexRef.current + 1);
    }, 200);
    return () => window.clearInterval(id);
  }, [goTo]);

  const start = useCallback(() => {
    unlockAudio();
    setStarted(true);
    setFinished(false);
    runningRef.current = true;
    setRunning(true);
    // (Re)start from the current index with a fresh clock.
    goTo(indexRef.current);
  }, [goTo]);

  const pause = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    endAtRef.current = null;
    clearAwait();
    stopSpeaking();
  }, [clearAwait]);

  const resume = useCallback(() => {
    if (finished) return;
    unlockAudio();
    runningRef.current = true;
    setRunning(true);
    // Resuming onto a "wait" setup phase re-enters the hold rather than counting down.
    const seg = segmentsRef.current[indexRef.current];
    if (seg?.phase === "prep" && settingsRef.current.setupMode === "wait") {
      awaitingRef.current = true;
      setAwaitingReady(true);
      endAtRef.current = null;
    } else {
      endAtRef.current = performance.now() + remainingRef.current * 1000;
    }
  }, [finished]);

  // Signal "I'm ready" to leave a held setup phase and begin the exercise.
  const ready = useCallback(() => {
    if (!awaitingRef.current) return;
    unlockAudio();
    clearAwait();
    goTo(indexRef.current + 1);
  }, [clearAwait, goTo]);

  const toggle = useCallback(() => {
    if (awaitingRef.current) ready();
    else if (!started || finished) start();
    else if (runningRef.current) pause();
    else resume();
  }, [started, finished, start, pause, resume, ready]);

  const skip = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const back = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const restartSegment = useCallback(() => goTo(indexRef.current), [goTo]);

  const restart = useCallback(() => {
    indexRef.current = 0;
    setFinished(false);
    setStarted(false);
    runningRef.current = false;
    setRunning(false);
    endAtRef.current = null;
    awaitingRef.current = false;
    setAwaitingReady(false);
    const first = segmentsRef.current[0];
    setIndex(0);
    setRemaining(first?.durationSec ?? 0);
    remainingRef.current = first?.durationSec ?? 0;
    stopSpeaking();
  }, []);

  const segment = segments[index] ?? null;

  // Overall progress across the whole timeline.
  const totalDuration = useMemo(
    () => segments.reduce((s, seg) => s + seg.durationSec, 0),
    [segments],
  );
  const elapsedBefore = useMemo(
    () => segments.slice(0, index).reduce((s, seg) => s + seg.durationSec, 0),
    [segments, index],
  );
  const elapsed = elapsedBefore + ((segment?.durationSec ?? 0) - remaining);
  const progress = finished
    ? 1
    : totalDuration > 0
      ? Math.min(1, Math.max(0, elapsed / totalDuration))
      : 0;
  // Whole-routine time remaining (all segments), for the overall countdown clock.
  const totalRemaining = finished ? 0 : Math.max(0, totalDuration - elapsed);

  const nextExercise = useMemo(() => {
    if (!segment) return null;
    for (let i = index + 1; i < segments.length; i++) {
      if (segments[i].exerciseIndex !== segment.exerciseIndex) {
        return segments[i].exercise;
      }
    }
    return null;
  }, [segments, index, segment]);

  const completedExercises = finished
    ? routine.exercises.length
    : segment?.exerciseIndex ?? 0;

  return {
    segments,
    index,
    segment,
    nextExercise,
    remaining,
    running,
    finished,
    started,
    awaitingReady,
    progress,
    totalRemaining,
    completedExercises,
    totalExercises: routine.exercises.length,
    start,
    pause,
    resume,
    toggle,
    ready,
    skip,
    back,
    restartSegment,
    restart,
  };
}
