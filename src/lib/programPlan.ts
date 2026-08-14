import type { Routine } from "./types";
import type { FitnessProfile } from "./fitness";
import {
  cooldownRx,
  expand,
  phaseFor,
  phaseKey,
  strengthRx,
  walkCooldownRx,
  walkRx,
  walkWarmupRx,
  warmupRx,
  type ProgramDay,
  type Rx,
} from "./program";

// A personalized 12-week program (Pro). The generator produces one strength
// session per phase, calibrated to the user's capability + equipment; the code
// here assembles each day by wrapping the phase session in the templated
// warm-up, stretches, and walks. Stored as program_blocks.plan (jsonb).

export interface PlanRx {
  name: string;
  type: "strength" | "cardio" | "mobility";
  sets: number;
  reps?: number; // per set (per side when perSide) — for rep-based moves
  holdSec?: number; // present => a timed hold instead of reps
  perSide?: boolean;
  restSec?: number;
  secPerRep?: number; // per-rep tempo in seconds (controlled ~3-4, explosive ~1.5-2)
  cue?: string;
  setup?: string;
}

/** Three distinct strength sessions for a phase (Phase 4 M/W/F variation). */
export interface PhaseSessions {
  mon: PlanRx[];
  wed: PlanRx[];
  fri: PlanRx[];
}

/**
 * A phase's prescription. New plans store three sessions (mon/wed/fri); older
 * plans stored a single flat list that repeated on every strength day — both are
 * accepted so existing program blocks keep working.
 */
export type PhaseData = PlanRx[] | PhaseSessions;

export interface ProgramPlan {
  phases: {
    foundation: PhaseData;
    build: PhaseData;
    develop: PhaseData;
    strengthen: PhaseData;
  };
  /** One-line description of how it was tailored (shown to the user). */
  summary?: string;
  /** Body areas to avoid loading (from the profile), used to tailor warm-ups. */
  avoid?: string[];
}

/** The session for a given weekday code, tolerating both plan shapes. */
export function sessionForDay(phase: PhaseData | undefined, code: string): PlanRx[] {
  if (!phase) return [];
  if (Array.isArray(phase)) return phase; // old flat plan → same session every day
  return phase[code as "mon" | "wed" | "fri"] ?? phase.mon ?? [];
}

/** A mid-block check-in (~week 3-4): how it's feeling + whether we re-tuned. */
export interface MidblockCheckin {
  at: number;
  feedback: string; // "Too easy" | "About right" | "Too hard"
  note?: string;
  adjusted: boolean; // whether the remaining phases were regenerated
}

export interface ProgramBlock {
  id: string;
  blockNumber: number;
  plan: ProgramPlan;
  completedDays: string[];
  status: string;
  startedAt: number | null;
  createdAt: number;
  /** The questionnaire answers this block was built from (the FitnessProfile). */
  sourceAnswers?: FitnessProfile | null;
  /** Mid-block check-in state; null/undefined until it's been handled. */
  midblock?: MidblockCheckin | null;
}

function toRx(p: PlanRx): Rx {
  // The schema requires every field, so holds arrive with reps:0 and rep-moves
  // with holdSec:0 — treat 0 as "not set".
  const hold = p.holdSec && p.holdSec > 0 ? p.holdSec : undefined;
  return {
    name: p.name,
    type: p.type ?? "strength",
    sets: Math.max(1, p.sets ?? 1),
    reps: hold ? undefined : p.reps && p.reps > 0 ? p.reps : 10,
    holdSec: hold,
    perSide: p.perSide,
    restSec: p.restSec && p.restSec > 0 ? p.restSec : undefined,
    secPerRep: p.secPerRep && p.secPerRep > 0 ? p.secPerRep : undefined,
    cue: p.cue,
    setup: p.setup,
  };
}

/** Turn a program day into a concrete Routine using a personalized plan. */
export function buildBlockRoutine(day: ProgramDay, plan: ProgramPlan): Routine | null {
  if (day.kind === "rest") return null;
  const counter = { i: 0 };

  const avoid = plan.avoid ?? [];

  if (day.kind === "walk") {
    return {
      id: day.id,
      name: `Week ${day.week} · ${day.label}`,
      focus: "Walking",
      description: day.summary,
      exercises: [
        ...expand(walkWarmupRx(day.week, avoid), counter, { flow: true }),
        ...expand(walkRx(day.week), counter),
        ...expand(walkCooldownRx(), counter, { flow: true }),
      ],
      createdAt: 0,
      source: "program",
    };
  }

  // Strength: this weekday's personalized session (falls back to a repeated flat
  // session for older plans, or the code template if there's no plan at all).
  const planned = sessionForDay(plan.phases?.[phaseKey(day.week)], day.code);
  const strength: Rx[] = planned.length ? planned.map(toRx) : strengthRx(day.week, day.code);

  return {
    id: day.id,
    name: `Week ${day.week} · ${day.label}`,
    focus: phaseFor(day.week).name,
    description: day.summary,
    exercises: [
      ...expand(warmupRx(day.week, avoid), counter, { flow: true }),
      ...expand(strength, counter),
      ...expand(cooldownRx(), counter, { flow: true }),
    ],
    createdAt: 0,
    source: "program",
  };
}
