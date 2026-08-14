import type { Exercise, Routine } from "./types";
import { newId } from "./store";

// Shape the model returns for a routine (no ids / client-only fields).
export interface AIExercise {
  name: string;
  type: Exercise["type"];
  mode: Exercise["mode"];
  durationSec: number;
  reps: number;
  restSec: number;
  cue: string;
  setup: string;
}
export interface AIRoutine {
  name: string;
  focus: string;
  description: string;
  exercises: AIExercise[];
}

/** JSON Schema for a single routine — shared by all AI generation. */
export const AI_ROUTINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "Short punchy routine name, e.g. 'Full Body 20'." },
    focus: {
      type: "string",
      description: "One of: 'Full body', 'Mobility', 'Cardio / HIIT', 'Strength'.",
    },
    description: { type: "string", description: "One sentence describing the routine." },
    exercises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["strength", "cardio", "mobility"] },
          mode: {
            type: "string",
            enum: ["time", "reps"],
            description: "'time' = hold/perform for durationSec; 'reps' = target a rep count.",
          },
          durationSec: {
            type: "integer",
            description:
              "Work duration in seconds. For reps mode, reps × a realistic per-rep tempo (controlled strength ~3-4s, explosive/cardio ~1.5-2s) — this is the pace the coach counts reps at.",
          },
          reps: { type: "integer", description: "Target reps when mode is 'reps'; 0 otherwise." },
          restSec: { type: "integer", description: "Rest in seconds after this exercise (0 for none)." },
          cue: { type: "string", description: "Short spoken form cue, e.g. 'keep your back flat'." },
          setup: {
            type: "string",
            description:
              "One short sentence on how to get into the starting position, spoken during the 'get ready' phase (e.g. 'Start in a forearm plank, elbows under your shoulders').",
          },
        },
        required: ["name", "type", "mode", "durationSec", "reps", "restSec", "cue", "setup"],
      },
    },
  },
  required: ["name", "focus", "description", "exercises"],
} as const;

/** Convert a model-produced routine into a stored app Routine. */
export function aiToRoutine(ai: AIRoutine, now: number): Routine {
  return {
    id: newId(),
    name: ai.name,
    focus: ai.focus,
    description: ai.description,
    createdAt: now,
    source: "ai",
    exercises: ai.exercises.map((e) => ({
      id: newId(),
      name: e.name,
      type: e.type,
      mode: e.mode,
      durationSec: e.durationSec,
      reps: e.mode === "reps" ? e.reps : undefined,
      restSec: e.restSec,
      cue: e.cue,
      setup: e.setup,
    })),
  };
}
