// Tiered movement library — the vetted palette the 12-week program's generation
// draws from. Each movement is tagged with its pattern, a difficulty tier (1 =
// easiest regression → 5 = hardest progression), and any required equipment.
// Serialized into the generation prompt so the AI picks quality, name-consistent
// variations and calibrates/progresses by moving up tiers rather than inventing
// moves or just adding reps.

export type Pattern =
  | "squat"
  | "hinge"
  | "single-leg"
  | "push"
  | "pull"
  | "core"
  | "balance"
  | "calf";

export interface Movement {
  name: string;
  pattern: Pattern;
  tier: number; // 1 (easiest) .. 5 (hardest)
  /** Any one of these satisfies the requirement; omit for bodyweight/no gear. */
  equipment?: string[];
}

// Equipment strings match src/lib/fitness.ts EQUIPMENT.
const LOAD = ["Resistance band", "Dumbbells", "Kettlebell"];

export const MOVEMENTS: Movement[] = [
  // squat (knee-dominant)
  { name: "Sit-to-stand", pattern: "squat", tier: 1 },
  { name: "Box squat", pattern: "squat", tier: 2 },
  { name: "Bodyweight squat", pattern: "squat", tier: 3 },
  { name: "Tempo squat", pattern: "squat", tier: 4 },
  { name: "Pause squat", pattern: "squat", tier: 4 },
  { name: "Heel-elevated squat", pattern: "squat", tier: 5 },
  { name: "Goblet squat", pattern: "squat", tier: 5, equipment: ["Dumbbells", "Kettlebell"] },

  // hinge / glute (hip-dominant)
  { name: "Glute bridge", pattern: "hinge", tier: 1 },
  { name: "Hip thrust", pattern: "hinge", tier: 2 },
  { name: "Single-leg glute bridge", pattern: "hinge", tier: 3 },
  { name: "Band good morning", pattern: "hinge", tier: 3, equipment: ["Resistance band"] },
  { name: "Romanian deadlift", pattern: "hinge", tier: 4, equipment: LOAD },
  { name: "Single-leg Romanian deadlift", pattern: "hinge", tier: 5 },

  // single-leg / lunge
  { name: "Assisted split squat", pattern: "single-leg", tier: 1 },
  { name: "Split squat", pattern: "single-leg", tier: 2 },
  { name: "Reverse lunge", pattern: "single-leg", tier: 3 },
  { name: "Step-up", pattern: "single-leg", tier: 3, equipment: ["Bench or step"] },
  { name: "Walking lunge", pattern: "single-leg", tier: 4 },
  { name: "Bulgarian split squat", pattern: "single-leg", tier: 5 },

  // push (horizontal press)
  { name: "Wall push-up", pattern: "push", tier: 1 },
  { name: "Incline push-up", pattern: "push", tier: 2 },
  { name: "Knee push-up", pattern: "push", tier: 3 },
  { name: "Full push-up", pattern: "push", tier: 4 },
  { name: "Tempo push-up", pattern: "push", tier: 5 },
  { name: "Feet-elevated push-up", pattern: "push", tier: 5 },

  // pull / row
  { name: "Prone Y-T-W raise", pattern: "pull", tier: 1 },
  { name: "Floor angels", pattern: "pull", tier: 1 },
  { name: "Band pull-apart", pattern: "pull", tier: 2, equipment: ["Resistance band"] },
  { name: "Band row", pattern: "pull", tier: 2, equipment: ["Resistance band"] },
  { name: "Bent-over row", pattern: "pull", tier: 3, equipment: ["Dumbbells", "Kettlebell"] },
  { name: "Single-arm row", pattern: "pull", tier: 3, equipment: ["Dumbbells", "Kettlebell"] },
  { name: "Inverted row", pattern: "pull", tier: 4 },

  // core
  { name: "Dead bug", pattern: "core", tier: 1 },
  { name: "Bird dog", pattern: "core", tier: 2 },
  { name: "Countertop plank", pattern: "core", tier: 2 },
  { name: "Knee plank", pattern: "core", tier: 3 },
  { name: "Plank", pattern: "core", tier: 4 },
  { name: "Side plank", pattern: "core", tier: 4 },
  { name: "Plank shoulder taps", pattern: "core", tier: 5 },

  // balance
  { name: "Feet-together stand", pattern: "balance", tier: 1 },
  { name: "Supported single-leg stand", pattern: "balance", tier: 2 },
  { name: "Single-leg balance", pattern: "balance", tier: 3 },
  { name: "Heel-to-toe stand", pattern: "balance", tier: 3 },
  { name: "Single-leg reach", pattern: "balance", tier: 4 },
  { name: "Eyes-closed single-leg", pattern: "balance", tier: 5 },

  // calf
  { name: "Calf raise", pattern: "calf", tier: 1 },
  { name: "Tempo calf raise", pattern: "calf", tier: 2 },
  { name: "Single-leg calf raise", pattern: "calf", tier: 3 },
];

const PATTERN_LABEL: Record<Pattern, string> = {
  squat: "SQUAT (knee-dominant)",
  hinge: "HINGE / GLUTE (hip-dominant)",
  "single-leg": "SINGLE-LEG / LUNGE",
  push: "PUSH (horizontal press)",
  pull: "PULL / ROW",
  core: "CORE",
  balance: "BALANCE",
  calf: "CALF",
};

const ORDER: Pattern[] = ["squat", "hinge", "single-leg", "push", "pull", "core", "balance", "calf"];

function available(m: Movement, equipment: string[]): boolean {
  if (!m.equipment || m.equipment.length === 0) return true;
  return m.equipment.some((req) => equipment.includes(req));
}

/** The library serialized for the prompt: one line per pattern, easiest→hardest,
 * filtered to what the person's equipment supports. */
export function movementLibraryText(equipment: string[]): string {
  return ORDER.map((p) => {
    const names = MOVEMENTS.filter((m) => m.pattern === p && available(m, equipment))
      .sort((a, b) => a.tier - b.tier)
      .map((m) => m.name);
    return names.length ? `${PATTERN_LABEL[p]} (easy→hard): ${names.join(", ")}` : null;
  })
    .filter(Boolean)
    .join("\n");
}
