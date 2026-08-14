// Core domain types for Guided Reps.

export type ExerciseType = "strength" | "cardio" | "mobility";

export interface Exercise {
  id: string;
  name: string;
  /** Spoken form of the name for the voice coach (no abbreviations, e.g. "set 1 of 2"). Falls back to name. */
  sayName?: string;
  type: ExerciseType;
  /** "time" = auto-advance after durationSec. "reps" = time-boxed estimate, reps announced. */
  mode: "time" | "reps";
  /** Work duration in seconds. For "reps" mode this is an estimated time box so the coach stays hands-free. */
  durationSec: number;
  /** Target reps when mode === "reps". */
  reps?: number;
  /** Rest in seconds after this exercise (0 = none). */
  restSec: number;
  /** Short spoken coaching/form cue, e.g. "keep your back flat". */
  cue?: string;
  /** Short spoken setup — how to get into position, read during the "get ready" phase. */
  setup?: string;
  /** A warm-up/cool-down flow move — eligible for a quick, short setup beat. */
  flow?: boolean;
}

export interface Routine {
  id: string;
  name: string;
  /** Human label of focus, e.g. "Full body", "Mobility". */
  focus: string;
  description?: string;
  exercises: Exercise[];
  createdAt: number;
  source: "seed" | "ai" | "custom" | "program";
}

export interface SessionLog {
  id: string;
  routineId: string;
  routineName: string;
  /** epoch ms of when the session finished. */
  date: number;
  durationSec: number;
  completedCount: number;
  totalCount: number;
}

/**
 * How talkative the coach is during a set:
 * - "full": setup, rep counting / hold countdowns, plus light encouragement.
 * - "counts": rep counting / countdowns only.
 * - "quiet": announcements at each move only (original behavior).
 */
export type CoachLevel = "full" | "counts" | "quiet";

/**
 * How the setup phase before each exercise advances:
 * - "timed": the coach describes the position and counts down, then auto-starts.
 * - "wait": the coach describes the position and holds until you say "Ready"
 *   (mic on) or tap — fully hands-free only with the mic enabled.
 */
export type SetupMode = "timed" | "wait";

export interface Settings {
  voice: boolean;
  beeps: boolean;
  /** Seconds of "get ready" before each exercise (timed setup; floored so the
   * setup narration has room to play). */
  prepSec: number;
  coachLevel: CoachLevel;
  setupMode: SetupMode;
  /** Which coach persona (voice + personality) narrates — see coaches.ts. */
  coachId: string;
  /** Give warm-up/cool-down flow moves a quick short setup instead of the full beat. */
  quickWarmup: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  voice: true,
  beeps: true,
  prepSec: 10,
  coachLevel: "full",
  setupMode: "timed",
  coachId: "sam",
  quickWarmup: true,
};
