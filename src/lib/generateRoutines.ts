import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI_ROUTINE_SCHEMA, type AIRoutine } from "./aiRoutine";
import { describeProfile, type FitnessProfile } from "./fitness";

// Shared routine generation, used by both the public pre-signup preview
// (/api/start/routines) and the authenticated onboarding/personalize flow
// (/api/onboarding/routines).

// Both use the highest-quality model — the first routine is the make-or-break
// impression, and the latency win comes from generating fewer routines (the
// preview asks for just one), not from a lighter model. Swap STARTER_MODEL to
// claude-sonnet-5 if per-generation cost/speed ever matters more than quality.
export const STARTER_MODEL = "claude-opus-5";
export const PROGRAM_MODEL = "claude-opus-5";

// Note: structured-output schemas only allow array minItems/maxItems of 0 or 1,
// so we ask for the exact count in the prompt instead of constraining it here.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    routines: {
      type: "array",
      description: "The requested routines.",
      items: AI_ROUTINE_SCHEMA,
    },
  },
  required: ["routines"],
} as const;

export class GenerationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface GenerateOptions {
  /** How many routines to generate. Latency scales with this. Default 3. */
  count?: number;
  model?: string;
}

export async function generateStarterRoutines(
  profile: FitnessProfile,
  opts: GenerateOptions = {},
): Promise<AIRoutine[]> {
  const count = Math.max(1, opts.count ?? 3);
  const model = opts.model ?? STARTER_MODEL;
  const maxTokens = count <= 1 ? 6000 : 16000;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GenerationError("AI isn't configured. Add ANTHROPIC_API_KEY to enable routines.", 400);
  }

  const intro =
    count <= 1
      ? `Create ONE exercise routine for a personal daily workout, tailored to this person:`
      : `Create ${count} complementary exercise routines for a personal daily workout, tailored to this person:`;
  const varyRule =
    count <= 1
      ? `- Make it the single best-fit routine for their main goal today.`
      : `- Give ${count} DISTINCT options they can choose between on a given day — vary them (e.g. one that targets their main goal, one shorter/lighter option, and one different modality such as mobility or gentle cardio). Not copies.`;

  const prompt = `${intro}

${describeProfile(profile)}

Rules:
${varyRule}
- Each routine should fit roughly their available time (${profile.sessionMinutes} min). ALWAYS begin with a gentle warm-up and ALWAYS end with a short cool-down of 2-3 gentle stretches — never skip either.
- Start the warm-up with slow, gentle neck rolls UNLESS the neck is listed among the areas to avoid.
- Match the difficulty to their experience level. If they are new or getting back into it, choose approachable regressions (e.g. wall or knee push-ups, box/chair squats, short holds) rather than advanced moves.
- Only use the equipment they have. If a listed body area should be avoided, do not load it — choose alternatives.
- Prefer "time" mode for cardio/mobility and "reps" mode for strength moves.
- For "reps" exercises, set durationSec from a REALISTIC tempo, not a flat rate: controlled strength moves about 3-4 seconds per rep, faster or explosive/cardio moves about 1.5-2 seconds per rep — multiply that per-rep tempo by the rep count. This is the pace the coach will count reps at, so it must feel right for the movement (never too rushed).
- For every exercise include a "setup": one short sentence on how to get into the starting position (e.g. "Start on all fours, hands under your shoulders").
- Keep each cue to a short spoken phrase about form. Use realistic rest (10-20s) between hard efforts.
- Choose each routine's focus from exactly: "Full body", "Mobility", "Cardio / HIIT", or "Strength".`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      throw new GenerationError("The request was declined. Try adjusting your answers.", 400);
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new GenerationError("No routines were generated. Try again.", 502);
    }
    const parsed = JSON.parse(textBlock.text) as { routines: AIRoutine[] };
    if (!parsed.routines?.length) throw new GenerationError("No routines were generated.", 502);
    return parsed.routines.slice(0, count);
  } catch (err) {
    if (err instanceof GenerationError) throw err;
    if (err instanceof Anthropic.APIError) {
      throw new GenerationError(`AI service error (${err.status ?? "?"}). Try again in a moment.`, 502);
    }
    throw new GenerationError("Failed to generate routines.", 500);
  }
}
