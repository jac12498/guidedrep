// The fitness questionnaire that personalizes routines (and, on Pro, the program).
// Answers are stored as `profiles.fitness_profile` (jsonb).

export const GOALS = [
  "General fitness",
  "Lose weight",
  "Build strength",
  "Mobility & flexibility",
  "Bone health & balance",
  "Stay active",
] as const;

export const BONE_HEALTH_GOAL = "Bone health & balance";

export const EXPERIENCE = [
  "New to exercise",
  "Getting back into it",
  "Exercise regularly",
] as const;

export const MINUTES_OPTIONS = [10, 15, 20, 30] as const;

// Weekly schedule: the user assigns an activity to each day of the week.
export type WeekdayActivity = "strength" | "aerobic" | "rest";

export const WEEKDAYS = [
  { code: "mon", dow: 1, label: "Monday", short: "Mon" },
  { code: "tue", dow: 2, label: "Tuesday", short: "Tue" },
  { code: "wed", dow: 3, label: "Wednesday", short: "Wed" },
  { code: "thu", dow: 4, label: "Thursday", short: "Thu" },
  { code: "fri", dow: 5, label: "Friday", short: "Fri" },
  { code: "sat", dow: 6, label: "Saturday", short: "Sat" },
  { code: "sun", dow: 7, label: "Sunday", short: "Sun" },
] as const;

// Default weekly rhythm: strength Mon/Wed/Fri, aerobic Tue/Thu/Sat, rest Sunday.
export const DEFAULT_SCHEDULE: WeekdayActivity[] = [
  "strength",
  "aerobic",
  "strength",
  "aerobic",
  "strength",
  "aerobic",
  "rest",
];

// Above this many strength days per week we warn and ask for confirmation
// (little recovery between sessions for most people).
export const MAX_RECOMMENDED_STRENGTH_DAYS = 4;

/** The 7-day schedule for a profile, falling back to the default rhythm. */
export function scheduleOf(p?: Partial<FitnessProfile> | null): WeekdayActivity[] {
  const s = p?.schedule;
  return Array.isArray(s) && s.length === 7 ? s : DEFAULT_SCHEDULE;
}

/** Weekday codes (mon..sun) marked as strength days, in week order. */
export function strengthDayCodes(schedule: WeekdayActivity[]): string[] {
  return WEEKDAYS.filter((_, i) => schedule[i] === "strength").map((w) => w.code);
}

export function countStrengthDays(schedule: WeekdayActivity[]): number {
  return schedule.filter((a) => a === "strength").length;
}

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
  /** Per-weekday activity plan (length 7, Mon..Sun). Drives the program calendar. */
  schedule?: WeekdayActivity[];
  /** Legacy: number of training days. Derived from `schedule` for new profiles. */
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
  schedule: DEFAULT_SCHEDULE,
  daysPerWeek: 3,
  sessionMinutes: 20,
  equipment: ["Bodyweight only"],
  avoid: [],
};

/** A plain-language summary of the profile, for the generation prompt. */
export function describeProfile(p: FitnessProfile): string {
  const sched = scheduleOf(p);
  const strengthDays = WEEKDAYS.filter((_, i) => sched[i] === "strength").map((w) => w.label);
  const aerobicDays = WEEKDAYS.filter((_, i) => sched[i] === "aerobic").map((w) => w.label);
  const lines = [
    `- Primary goal: ${p.goal}`,
    `- Experience level: ${p.experience}`,
    `- Available time per session: about ${p.sessionMinutes} minutes`,
    `- Strength days per week: ${strengthDays.length} (${strengthDays.join(", ") || "none"})`,
    `- Aerobic days: ${aerobicDays.join(", ") || "none"}`,
    `- Equipment: ${p.equipment.length ? p.equipment.join(", ") : "bodyweight only"}`,
  ];
  if (p.goal === BONE_HEALTH_GOAL) {
    lines.push(
      "- BONE-HEALTH & POSTURE EMPHASIS: prioritize weight-bearing and resistance movements (best for bone density), balance and fall-prevention drills, and postural / spinal-EXTENSION work.",
      "- BONE-HEALTH SAFETY (must follow): AVOID loaded or repeated spinal FLEXION — no crunches, sit-ups, toe-touches, or deep forward folds; AVOID rapid or loaded spinal twisting; AVOID high-impact or jumping. Favor upright, controlled, supported movements.",
    );
  }
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
