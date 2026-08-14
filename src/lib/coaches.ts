// Coach personas: each is a voice *preference* (resolved to the best available
// device voice at runtime) plus a personality "copy pack" — the words the coach
// uses. Personality is device-independent even when the exact TTS voice varies.
// Pure data (no window refs) so it's safe to import anywhere; voice resolution
// lives in audio.ts.

export interface CoachVoice {
  /** Preferred gender when picking a device voice ("any" = don't care). */
  gender: "female" | "male" | "any";
  /** Preferred voice names (substring match), most-wanted first, cross-platform. */
  voiceNames: string[];
  /** Base speaking rate and pitch (Web Speech: rate 0.1–10, pitch 0–2). */
  rate: number;
  pitch: number;
}

export interface CoachCopy {
  /** Prefix before the upcoming exercise, e.g. "Next up:". */
  intro: string;
  /** Timed-setup tail, e.g. "Get ready.". */
  getReady: string;
  /** Wait-mode tail, e.g. "Say ready when you're set.". */
  ready: string;
  /** Spoken at the start of a work interval. */
  go: string;
  /** Spoken when a rest interval begins. */
  rest: string;
  /** Occasional between-set encouragement (Full coach level only). */
  encouragements: string[];
  /** Spoken when the whole workout finishes. */
  done: string;
}

export interface Coach {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  voice: CoachVoice;
  copy: CoachCopy;
}

export const COACHES: Coach[] = [
  {
    id: "sam",
    name: "Sam",
    blurb: "Warm & encouraging",
    emoji: "🌤️",
    voice: {
      gender: "female",
      voiceNames: ["Samantha", "Karen", "Jenny", "Aria", "Google US English", "Zira", "Female"],
      rate: 1.02,
      pitch: 1.06,
    },
    copy: {
      intro: "Next up:",
      getReady: "Get ready.",
      ready: "Say ready when you're set.",
      go: "Let's go!",
      rest: "Rest.",
      encouragements: ["Nice work.", "You've got this.", "Looking strong.", "Great job."],
      done: "Workout complete. Wonderful work today!",
    },
  },
  {
    id: "marcus",
    name: "Marcus",
    blurb: "Calm & steady",
    emoji: "🧭",
    voice: {
      gender: "male",
      voiceNames: ["Daniel", "Aaron", "Alex", "Guy", "David", "Google UK English Male", "Male"],
      rate: 0.96,
      pitch: 0.9,
    },
    copy: {
      intro: "Coming up:",
      getReady: "Settle in.",
      ready: "Take your time — say ready when you're set.",
      go: "Begin.",
      rest: "Rest. Breathe.",
      encouragements: ["Smooth and controlled.", "Steady.", "Good form.", "Stay with it."],
      done: "That's the session. Well done.",
    },
  },
  {
    id: "vic",
    name: "Vic",
    blurb: "High-energy drill",
    emoji: "🔥",
    voice: {
      gender: "male",
      voiceNames: ["Fred", "Aaron", "Rishi", "Daniel", "Google UK English Male", "Male"],
      rate: 1.1,
      pitch: 1.0,
    },
    copy: {
      intro: "Get ready for:",
      getReady: "Lock in.",
      ready: "Set up and call it — say ready!",
      go: "Go, go, go!",
      rest: "Rest — shake it out.",
      encouragements: ["Push! Don't quit.", "Make it count.", "That's it — dig in!", "Own it."],
      done: "And that's a wrap. You crushed it!",
    },
  },
  {
    id: "zen",
    name: "Zen",
    blurb: "Soft & mindful",
    emoji: "🌿",
    voice: {
      gender: "female",
      voiceNames: ["Moira", "Tessa", "Fiona", "Samantha", "Google US English", "Female"],
      rate: 0.9,
      pitch: 1.0,
    },
    copy: {
      intro: "Prepare for:",
      getReady: "Find your position, and breathe.",
      ready: "When you feel ready, say ready.",
      go: "Begin.",
      rest: "Rest. Soften and breathe.",
      encouragements: ["Stay present.", "Easy breaths.", "Move with intention.", "Let it flow."],
      done: "Session complete. Take a moment for yourself.",
    },
  },
];

export const DEFAULT_COACH_ID = "sam";

export function getCoach(id: string | undefined): Coach {
  return COACHES.find((c) => c.id === id) ?? COACHES[0];
}
