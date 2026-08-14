import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GenerationError, PROGRAM_MODEL } from "./generateRoutines";
import { describeProfile, type FitnessProfile } from "./fitness";
import { movementLibraryText } from "./movements";
import type { PhaseSessions, ProgramPlan } from "./programPlan";
import type { PhaseKey } from "./program";

// Generates the personalized 12-week program. Each phase is THREE distinct
// strength sessions (Mon lower-body, Wed upper+core, Fri full-body/hardest) so
// the week varies instead of repeating one workout. Phases are generated in
// parallel (one AI call each) to keep latency reasonable; warm-up, stretches and
// walks are added by the assembler (programPlan.ts), not generated here.

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

// One phase = three sessions.
const PHASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mon: { type: "array", items: PLAN_RX },
    wed: { type: "array", items: PLAN_RX },
    fri: { type: "array", items: PLAN_RX },
  },
  required: ["mon", "wed", "fri"],
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

function composeSummary(profile: FitnessProfile): string {
  const gear =
    profile.equipment?.length &&
    !(profile.equipment.length === 1 && profile.equipment[0] === "Bodyweight only")
      ? " and your equipment"
      : "";
  return `Calibrated to what you can do today${gear} — three different sessions a week, progressing across four phases over 12 weeks.`;
}

async function generatePhase(
  client: Anthropic,
  profile: FitnessProfile,
  library: string,
  spec: PhaseSpec,
  blockNumber: number,
  adjust = "",
): Promise<PhaseSessions> {
  const prompt = `Design THREE distinct strength sessions for one phase of a personalized 12-week program — a Monday, a Wednesday, and a Friday session. They run in the same week, so make them DIFFERENT emphases (never the same workout three times), while together covering the whole body across the week.

Phase: ${spec.label} — ${spec.difficulty}

Emphasis per day:
- mon: LOWER-BODY & posterior chain — a squat pattern, a hip-hinge/glute, a single-leg/lunge, calves, and one core move.
- wed: UPPER-BODY & core — a push, a horizontal pull/row (loaded ONLY if they have a band or dumbbells; otherwise bodyweight scapular work like Prone Y-T-W raise or Floor angels), two core/anti-rotation moves, and a balance move.
- fri: FULL-BODY and the hardest of the week — a squat, a push, a single-leg, a hip-hinge, a core, and a balance move.

Each session is 5-7 movements at effort 6-7 out of 10 ("could do 3-4 more good reps"). Progress difficulty by choosing harder movement TIERS and slower tempo, not ever-higher rep counts.

Pick movements from this library (each pattern is listed easiest→hardest; choose the tier that matches their calibrated ability, and use higher tiers in later phases). Prefer these names for consistency:
${library}

CALIBRATE to their capability answers — this is the most important thing:
- If they CANNOT do a full push-up, use wall or incline push-ups; only progress toward the floor in later phases.
- If they CANNOT do a bodyweight squat, use Sit-to-stand or Box squats.
- If they CANNOT hold a 20-second plank, use Countertop or Knee planks and shorter holds.
Only use equipment they have. Do NOT load any body area they avoid — choose a safe alternative. Respect their desired starting intensity.${adjust}${progressionNote(blockNumber)}

For every movement provide: name, type (strength/cardio/mobility), sets (1-3), reps (per set; 0 for a timed hold), holdSec (0 for rep moves), perSide, restSec, secPerRep (tempo), a short spoken cue, and a short spoken setup line ("how to get into position").

Person:
${describeProfile(profile)}`;

  const response = await client.messages.create({
    model: PROGRAM_MODEL,
    max_tokens: 12000,
    output_config: { effort: "low", format: { type: "json_schema", schema: PHASE_SCHEMA } },
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
  if (!sessions.mon?.length || !sessions.wed?.length || !sessions.fri?.length) {
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
  const library = movementLibraryText(profile.equipment ?? []);
  const client = new Anthropic({ apiKey });

  try {
    const [foundation, build, develop, strengthen] = await Promise.all(
      PHASE_SPECS.map((spec) => generatePhase(client, profile, library, spec, blockNumber)),
    );
    return {
      summary: composeSummary(profile),
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
      specs.map((spec) => generatePhase(client, profile, library, spec, 1, adjust + noteText)),
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
