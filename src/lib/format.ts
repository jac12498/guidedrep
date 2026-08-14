import type { Exercise, Routine } from "./types";

/** Format seconds as m:ss (or s when under a minute is fine too). */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Total wall-clock seconds a routine takes, including rest and prep. */
export function routineDuration(routine: Routine, prepSec = 5): number {
  return routine.exercises.reduce(
    (sum, ex) => sum + prepSec + ex.durationSec + ex.restSec,
    0,
  );
}

/** Rough minutes label for a routine, e.g. "15 min". */
export function routineMinutes(routine: Routine, prepSec = 5): string {
  return `${Math.round(routineDuration(routine, prepSec) / 60)} min`;
}

/** How the target is described, e.g. "12 reps" or "0:45". */
export function targetLabel(ex: Exercise): string {
  return ex.mode === "reps" && ex.reps ? `${ex.reps} reps` : mmss(ex.durationSec);
}

const TYPE_LABELS: Record<Exercise["type"], string> = {
  strength: "Strength",
  cardio: "Cardio",
  mobility: "Mobility",
};

export function typeLabel(t: Exercise["type"]): string {
  return TYPE_LABELS[t];
}
