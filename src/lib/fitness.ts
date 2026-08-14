// The fitness questionnaire that personalizes routines (and, on Pro, the program).
// Answers are stored as `profiles.fitness_profile` (jsonb).

export const GOALS = [
  "General fitness",
  "Lose weight",
  "Build strength",
  "Mobility & flexibility",
  "Stay active",
] as const;

export const EXPERIENCE = [
  "New to exercise",
  "Getting back into it",
  "Exercise regularly",
] as const;

export const DAYS_OPTIONS = [2, 3, 4, 5] as const;
export const MINUTES_OPTIONS = [10, 15, 20, 30] as const;

export const EQUIPMENT = [
  "Bodyweight only",
  "Resistance band",
  "Dumbbells",
  "Kettlebell",
  "Pull-up bar",
  "Bench or step",
] as const;

export const AVOID_AREAS = [
  "Knees",
  "Lower back",
  "Shoulders",
  "Wrists",
  "Neck",
  "Ankles",
] as const;

// Capability self-check — the key calibration for the Pro 12-week program, so a
// deconditioned person starts with true regressions instead of the default plan.
export const CAPABILITIES = [
  "A full push-up",
  "A knee push-up",
  "A bodyweight squat",
  "A 20-second plank",
  "Walk briskly for 20 minutes",
  "Get up and down from the floor easily",
] as const;

export const INTENSITY = ["Ease me in", "Moderate", "Challenge me"] as const;

export const AGE_BANDS = [
  "Under 20",
  "20–29",
  "30–39",
  "40–49",
  "50–59",
  "60–69",
  "70+",
] as const;

export const SEX_OPTIONS = ["Female", "Male", "Prefer not to say"] as const;

export interface FitnessProfile {
  goal: string;
  experience: string;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  avoid: string[];
  avoidNote?: string;
  // Optional — collected but never required.
  ageBand?: string;
  sex?: string;
  heightIn?: number;
  weightLb?: number;
  // Extended answers for the Pro 12-week program setup.
  capabilities?: string[]; // which of CAPABILITIES they can do comfortably now
  intensity?: string; // desired starting intensity (INTENSITY)
  updatedAt?: number;
}

export const DEFAULT_PROFILE: FitnessProfile = {
  goal: GOALS[0],
  experience: EXPERIENCE[0],
  daysPerWeek: 3,
  sessionMinutes: 20,
  equipment: ["Bodyweight only"],
  avoid: [],
};

/** A plain-language summary of the profile, for the generation prompt. */
export function describeProfile(p: FitnessProfile): string {
  const lines = [
    `- Primary goal: ${p.goal}`,
    `- Experience level: ${p.experience}`,
    `- Available time per session: about ${p.sessionMinutes} minutes`,
    `- Training days per week: ${p.daysPerWeek}`,
    `- Equipment: ${p.equipment.length ? p.equipment.join(", ") : "bodyweight only"}`,
  ];
  if (p.avoid.length) lines.push(`- Go easy on / avoid loading: ${p.avoid.join(", ")}`);
  if (p.avoidNote?.trim()) lines.push(`- Notes on injuries/limitations: ${p.avoidNote.trim()}`);
  if (p.ageBand) lines.push(`- Age range: ${p.ageBand}`);
  if (p.sex && p.sex !== "Prefer not to say") lines.push(`- Sex: ${p.sex}`);
  if (p.capabilities) {
    lines.push(
      `- Can currently do comfortably: ${p.capabilities.length ? p.capabilities.join(", ") : "none of the listed movements"}`,
    );
  }
  if (p.intensity) lines.push(`- Desired starting intensity: ${p.intensity}`);
  return lines.join("\n");
}
