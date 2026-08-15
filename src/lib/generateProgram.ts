import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GenerationError, PROGRAM_MODEL } from "./generateRoutines";
import {
  describeProfile,
  scheduleOf,
  strengthDayCodes,
  WEEKDAYS,
  type FitnessProfile,
} from "./fitness";
import { movementLibraryText } from "./movements";
import type { PhaseSessions, ProgramPlan } from "./programPlan";
import type { PhaseKey } from "./program";

// Generates the personalized 12-week program. Each phase produces one distinct
// strength session PER strength day the user scheduled (keyed by weekday), so
// the week varies instead of repeating one workout. Phases are generated in
// parallel (one AI call each) to keep latency reasonable; warm-up, stretches and
// walks are added by the assembler (programPlan.ts), not generated here.

const LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  WEEKDAYS.map((w) => [w.code, w.label]),
);

// Per-day emphasis. The LAST strength day is always the hardest full-body day;
// the earlier days rotate through complementary emphases so the week covers the
// whole body. For 3 days this reproduces the original Lower / Upper / Full split.
const EMPHASIS_ROTATION = [
  "LOWER-BODY & posterior chain — a squat pattern, a hip-hinge/glute, a single-leg/lunge, calves, and one core move.",
  "UPPER-BODY & core — a push, a horizontal pull/row (loaded ONLY if they have a band or dumbbells; otherwise bodyweight scapular work like Prone Y-T-W raise or Floor angels), two core/anti-rotation moves, and a balance move.",
  "POSTERIOR-CHAIN & CORE — a hip-hinge/deadlift pattern, a glute-bridge variation, a row or scapular move, two core/anti-rotation moves, and a balance hold.",
  "SINGLE-LEG & BALANCE — a lunge/split-squat, a single-leg hip-hinge, a step-up or calf move, a core move, and two balance progressions.",
];

function emphasisFor(i: number, n: number): string {
  if (i === n - 1) {
    return "FULL-BODY and the hardest of the week — a squat, a push, a single-leg, a hip-hinge, a core, and a balance move.";
  }
  return EMPHASIS_ROTATION[i % EMPHASIS_ROTATION.length];
}

function emphasisLines(codes: string[]): string {
  return codes
    .map((c, i) => `- ${c} (${LABEL_BY_CODE[c] ?? c}): ${emphasisFor(i, codes.length)}`)
    .join("\n");
}

/** JSON schema for one phase: an array property per scheduled strength weekday. */
function phaseSchemaFor(codes: string[]) {
  const properties: Record<string, unknown> = {};
  for (const c of codes) properties[c] = { type: "array", items: PLAN_RX };
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: codes,
  } as const;
}

const PLAN_RX = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    type: { type: "string", enum: ["strength", "cardio", "mobility"] },
    sets: { type: "integer", description: "Number of sets, 1-3." },
    reps: { type: "integer", description: "Reps per set for rep-based moves; 0 for a timed hold." },
    holdSec: { type: "integer", description: "Seconds to hold for timed moves; 0 for rep-based moves." },
    perSide: { type: "boolean", description: "True if done one side at a time (e.g. split squat, side plank)." },
    restSec: { type: "integer", description: "Rest seconds between sets (30-45 for strength, 15-25 for core/holds)." },
    secPerRep: { type: "integer", description: "Per-rep tempo in seconds: controlled strength 3-4, faster/explosive 1-2." },
    cue: { type: "string", description: "Short spoken form/effort cue." },
    setup: { type: "string", description: "Short spoken 'get into position' line." },
  },
  required: ["name", "type", "sets", "reps", "holdSec", "perSide", "restSec", "secPerRep", "cue", "setup"],
} as const;

interface PhaseSpec {
  key: PhaseKey;
  label: string;
  difficulty: string;
}

const PHASE_SPECS: PhaseSpec[] = [
  {
    key: "foundation",
    label: "Foundation (weeks 1-3)",
    difficulty:
      "the EASIEST phase — calibrated to what they can do NOW; deliberately conservative, low tiers.",
  },
  {
    key: "build",
    label: "Build (weeks 4-6)",
    difficulty: "slightly harder variations and tempo than Foundation (one tier up where appropriate).",
  },
  {
    key: "develop",
    label: "Develop (weeks 7-9)",
    difficulty: "a legitimate strength workout — mid-to-higher tiers, more challenging variations.",
  },
  {
    key: "strengthen",
    label: "Strengthen (weeks 10-12)",
    difficulty: "the HARDEST — quality functional strength at the highest tiers they can own with good form.",
  },
];

function progressionNote(blockNumber: number): string {
  return blockNumber > 1
    ? ` This is block ${blockNumber}: the person already completed ${blockNumber - 1} full 12-week block(s), so do NOT use absolute-beginner regressions — start at higher tiers and make the whole thing more challenging.`
    : "";
}

function composeSummary(profile: FitnessProfile, sessionCount: number): string {
  const gear =
    profile.equipment?.length &&
    !(profile.equipment.length === 1 && profile.equipment[0] === "Bodyweight only")
      ? " and your equipment"
      : "";
  const sessions =
    sessionCount === 1 ? "one session" : `${sessionCount} different sessions`;
  return `Calibrated to what you can do today${gear} — ${sessions} a week, progressing across four phases over 12 weeks.`;
}

async function generatePhase(
  client: Anthropic,
  profile: FitnessProfile,
  library: string,
  spec: PhaseSpec,
  blockNumber: number,
  codes: string[],
  adjust = "",
): Promise<PhaseSessions> {
  const dayWord = codes.length === 1 ? "session" : "distinct sessions";
  const prompt = `Design ${codes.length} ${dayWord} for one phase of a personalized 12-week program — one for each of the person's scheduled strength days: ${codes.join(", ")}. They run in the same week, so make them DIFFERENT emphases (never the same workout twice), while together covering the whole body across the week.

Phase: ${spec.label} — ${spec.difficulty}

Emphasis per day (the JSON key is the weekday code):
${emphasisLines(codes)}

Each session is 5-7 movements at effort 6-7 out of 10 ("could do 3-4 more good reps"). Progress difficulty by choosing harder movement TIERS and slower tempo, not ever-higher rep counts.

Pick movements from this library (each pattern is listed easiest→hardest; choose the tier that matches their calibrated ability, and use higher tiers in later phases). Prefer these names for consistency:
${library}

CALIBRATE to their capability answers — this is the most important thing:
- If they CANNOT do a full push-up, use wall or incline push-ups; only progress toward the floor in later phases.
- If they CANNOT do a bodyweight squat, use Sit-to-stand or Box squats.
- If they CANNOT hold a 20-second plank, use Countertop or Knee planks and shorter holds.
Only use equipment they have. Do NOT load any body area they avoid — choose a safe alternative. Respect their desired starting intensity.${adjust}${progressionNote(blockNumber)}

Return a JSON object with exactly these keys: ${codes.join(", ")} — each an array of movements. For every movement provide: name, type (strength/cardio/mobility), sets (1-3), reps (per set; 0 for a timed hold), holdSec (0 for rep moves), perSide, restSec, secPerRep (tempo), a short spoken cue, and a short spoken setup line ("how to get into position").

Person:
${describeProfile(profile)}`;

  const response = await client.messages.create({
    model: PROGRAM_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: phaseSchemaFor(codes) } },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new GenerationError("The request was declined. Try adjusting your answers.", 400);
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new GenerationError("No program was generated. Try again.", 502);
  }
  const sessions = JSON.parse(textBlock.text) as PhaseSessions;
  if (codes.some((c) => !sessions[c]?.length)) {
    throw new GenerationError("The generated program was incomplete. Try again.", 502);
  }
  return sessions;
}

function normalizeError(err: unknown, fallback: string): GenerationError {
  if (err instanceof GenerationError) return err;
  if (err instanceof Anthropic.APIError) {
    return new GenerationError(`AI service error (${err.status ?? "?"}). Try again in a moment.`, 502);
  }
  return new GenerationError(fallback, 500);
}

export async function generateProgram(
  profile: FitnessProfile,
  opts: { blockNumber?: number } = {},
): Promise<ProgramPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GenerationError("AI isn't configured. Add ANTHROPIC_API_KEY to build programs.", 400);
  }
  const blockNumber = opts.blockNumber ?? 1;
  const codes = strengthDayCodes(scheduleOf(profile));
  if (!codes.length) {
    throw new GenerationError("Pick at least one strength day to build a program.", 400);
  }
  const library = movementLibraryText(profile.equipment ?? []);
  const client = new Anthropic({ apiKey });

  try {
    const [foundation, build, develop, strengthen] = await Promise.all(
      PHASE_SPECS.map((spec) => generatePhase(client, profile, library, spec, blockNumber, codes)),
    );
    return {
      summary: composeSummary(profile, codes.length),
      avoid: profile.avoid,
      phases: { foundation, build, develop, strengthen },
    };
  } catch (err) {
    throw normalizeError(err, "Failed to generate the program.");
  }
}

/**
 * Mid-block adaptation (~week 3-4): re-tune the phases still ahead (build,
 * develop, strengthen) after the person reports how Foundation felt. Foundation
 * is already done, so it's kept as-is. Returns a full updated plan.
 */
export async function adaptProgram(
  profile: FitnessProfile,
  current: ProgramPlan,
  direction: "easier" | "harder",
  note?: string,
): Promise<ProgramPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GenerationError("AI isn't configured. Add ANTHROPIC_API_KEY to build programs.", 400);
  }
  const codes = strengthDayCodes(scheduleOf(profile));
  if (!codes.length) {
    throw new GenerationError("Pick at least one strength day to build a program.", 400);
  }
  const library = movementLibraryText(profile.equipment ?? []);
  const client = new Anthropic({ apiKey });
  const adjust =
    direction === "easier"
      ? " ADJUST EASIER: the first three weeks (Foundation) were too hard — use gentler tiers, a touch more rest, and slightly fewer reps or shorter holds."
      : " ADJUST HARDER: the first three weeks (Foundation) were too easy — use higher tiers and slower tempo (not just more reps).";
  const noteText = note ? ` Their note: "${note}" — account for it.` : "";
  const specs = PHASE_SPECS.filter((s) => s.key !== "foundation");

  try {
    const [build, develop, strengthen] = await Promise.all(
      specs.map((spec) => generatePhase(client, profile, library, spec, 1, codes, adjust + noteText)),
    );
    return {
      ...current,
      summary: `${current.summary ? current.summary + " " : ""}Re-tuned ${direction} after your week-3 check-in.`,
      phases: { foundation: current.phases.foundation, build, develop, strengthen },
    };
  } catch (err) {
    throw normalizeError(err, "Failed to adjust the program.");
  }
}
