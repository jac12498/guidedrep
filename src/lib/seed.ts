import type { Routine } from "./types";

// Built-in routines so the coach is usable on day one, before any AI generation.
// Ids are stable strings so re-seeding is idempotent.

export const SEED_ROUTINES: Routine[] = [
  {
    id: "seed-full-body-15",
    name: "Full Body 15",
    focus: "Full body",
    description: "A balanced 15-minute strength + cardio circuit. No equipment.",
    createdAt: 0,
    source: "seed",
    exercises: [
      { id: "fb1", name: "Marching in place", type: "cardio", mode: "time", durationSec: 60, restSec: 10, cue: "Warm up, pump your arms" },
      { id: "fb2", name: "Bodyweight squats", type: "strength", mode: "reps", reps: 15, durationSec: 45, restSec: 15, cue: "Chest up, knees over toes" },
      { id: "fb3", name: "Push-ups", type: "strength", mode: "reps", reps: 12, durationSec: 45, restSec: 15, cue: "Elbows tucked, body in a line" },
      { id: "fb4", name: "Jumping jacks", type: "cardio", mode: "time", durationSec: 45, restSec: 15, cue: "Stay light on your feet" },
      { id: "fb5", name: "Reverse lunges", type: "strength", mode: "reps", reps: 20, durationSec: 50, restSec: 15, cue: "Alternate legs, control the descent" },
      { id: "fb6", name: "Plank hold", type: "strength", mode: "time", durationSec: 40, restSec: 15, cue: "Squeeze your glutes, don't sag" },
      { id: "fb7", name: "High knees", type: "cardio", mode: "time", durationSec: 40, restSec: 15, cue: "Drive your knees up fast" },
      { id: "fb8", name: "Glute bridges", type: "strength", mode: "reps", reps: 15, durationSec: 45, restSec: 15, cue: "Pause and squeeze at the top" },
      { id: "fb9", name: "Standing forward fold", type: "mobility", mode: "time", durationSec: 40, restSec: 0, cue: "Cool down, let your head hang" },
    ],
  },
  {
    id: "seed-mobility-10",
    name: "Morning Mobility 10",
    focus: "Mobility",
    description: "Gentle 10-minute mobility flow to loosen up for the day.",
    createdAt: 0,
    source: "seed",
    exercises: [
      { id: "mo1", name: "Neck rolls", type: "mobility", mode: "time", durationSec: 40, restSec: 5, cue: "Slow circles, both directions" },
      { id: "mo2", name: "Shoulder rolls", type: "mobility", mode: "time", durationSec: 40, restSec: 5, cue: "Big backward circles" },
      { id: "mo3", name: "Cat-cow", type: "mobility", mode: "time", durationSec: 50, restSec: 5, cue: "Flow with your breath" },
      { id: "mo4", name: "World's greatest stretch (L)", type: "mobility", mode: "time", durationSec: 40, restSec: 5, cue: "Open your chest to the ceiling" },
      { id: "mo5", name: "World's greatest stretch (R)", type: "mobility", mode: "time", durationSec: 40, restSec: 5, cue: "Open your chest to the ceiling" },
      { id: "mo6", name: "Hip circles", type: "mobility", mode: "time", durationSec: 40, restSec: 5, cue: "Both directions, big range" },
      { id: "mo7", name: "Deep squat hold", type: "mobility", mode: "time", durationSec: 45, restSec: 5, cue: "Sink low, elbows push knees out" },
      { id: "mo8", name: "Thoracic rotations", type: "mobility", mode: "time", durationSec: 50, restSec: 5, cue: "Reach one arm to the sky" },
      { id: "mo9", name: "Child's pose", type: "mobility", mode: "time", durationSec: 50, restSec: 0, cue: "Breathe into your back, relax" },
    ],
  },
  {
    id: "seed-hiit-12",
    name: "Quick HIIT 12",
    focus: "Cardio / HIIT",
    description: "12 minutes of high-intensity intervals. Bring the effort.",
    createdAt: 0,
    source: "seed",
    exercises: [
      { id: "hi1", name: "Jog in place", type: "cardio", mode: "time", durationSec: 60, restSec: 10, cue: "Warm up gradually" },
      { id: "hi2", name: "Burpees", type: "cardio", mode: "time", durationSec: 30, restSec: 20, cue: "All out, chest to floor" },
      { id: "hi3", name: "Mountain climbers", type: "cardio", mode: "time", durationSec: 30, restSec: 20, cue: "Fast knees, tight core" },
      { id: "hi4", name: "Squat jumps", type: "cardio", mode: "time", durationSec: 30, restSec: 20, cue: "Explode up, land soft" },
      { id: "hi5", name: "Push-up to shoulder tap", type: "strength", mode: "time", durationSec: 30, restSec: 20, cue: "Keep hips still" },
      { id: "hi6", name: "Skaters", type: "cardio", mode: "time", durationSec: 30, restSec: 20, cue: "Bound side to side" },
      { id: "hi7", name: "Plank jacks", type: "cardio", mode: "time", durationSec: 30, restSec: 20, cue: "Jump feet in and out" },
      { id: "hi8", name: "Walk it out", type: "cardio", mode: "time", durationSec: 50, restSec: 0, cue: "Cool down, slow your breath" },
    ],
  },
];
