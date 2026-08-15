// The 12-week progressive full-body program (3 strength days + 3 walks per week).
//
// Design goal: progressively HARDER, not longer. Each strength day is built as a
// full guided session: dynamic warm-up -> strength movements (multiple sets with
// rest between) -> static stretches. Prescriptions get harder by phase, mostly via
// harder variations and tempo rather than ever-higher rep counts. Target effort is
// 6-7/10 throughout ("could do 3-4 more good reps").
//
// The program itself is defined in code (not stored). Only per-day *progress* is
// persisted (see store.ts). buildRoutine() turns a program day into a plain Routine
// the existing Player can run.

import type { Exercise, ExerciseType, Routine } from "./types";
import { DEFAULT_SCHEDULE, WEEKDAYS, strengthDayCodes, type WeekdayActivity } from "./fitness";

// ---- Prescription authoring helpers ----

export interface Rx {
  name: string;
  type: ExerciseType;
  sets: number;
  reps?: number; // per set (per side when perSide)
  perSide?: boolean;
  holdSec?: number; // present => a timed hold instead of reps
  restSec?: number; // rest between sets
  secPerRep?: number; // tempo override for time-boxing rep sets
  cue?: string; // short spoken form/effort cue
  setup?: string; // short spoken "get into position" line
}

const strengthRest = 45;
const calfRest = 30;
const coreRest = 20;
const holdRest = 25;
const balRest = 15;

interface RxOpts {
  type?: ExerciseType;
  perSide?: boolean;
  restSec?: number;
  secPerRep?: number;
  cue?: string;
  setup?: string;
}

/** A rep-based movement. */
function R(name: string, sets: number, reps: number, o: RxOpts = {}): Rx {
  return {
    name,
    type: o.type ?? "strength",
    sets,
    reps,
    perSide: o.perSide,
    restSec: o.restSec ?? strengthRest,
    secPerRep: o.secPerRep,
    cue: o.cue,
    setup: o.setup,
  };
}

/** A timed hold. */
function H(name: string, sets: number, holdSec: number, o: RxOpts = {}): Rx {
  return {
    name,
    type: o.type ?? "mobility",
    sets,
    holdSec,
    perSide: o.perSide,
    restSec: o.restSec ?? holdRest,
    cue: o.cue,
    setup: o.setup,
  };
}

// Time-box a rep set. `oneSide` returns the duration for a single side (used when
// a per-side move is split into left/right segments); otherwise per-side moves
// count both sides.
function repTime(rx: Rx, oneSide = false): number {
  const spr = rx.secPerRep ?? 4;
  const sides = rx.perSide && !oneSide ? 2 : 1;
  const t = (rx.reps ?? 12) * spr * sides;
  return Math.min(120, Math.max(oneSide ? 10 : 20, Math.round(t)));
}

function composeCue(rx: Rx): string | undefined {
  if (rx.perSide && !rx.holdSec) return rx.cue ? `Each leg. ${rx.cue}` : "Do each leg.";
  return rx.cue;
}

// A short spoken "get into position" line for a movement, by name. Used as a
// fallback when a prescription (or the AI) didn't supply its own `setup`. Ordered
// most-specific first so "split squat" and push-up variants don't fall into the
// generic buckets below them.
const SETUP_BY_NAME: Array<[RegExp, string]> = [
  [/march/i, "Stand tall, feet hip-width apart."],
  [/neck roll/i, "Sit or stand tall, shoulders relaxed and down."],
  [/shoulder roll/i, "Stand tall, arms relaxed at your sides."],
  [/ankle circle/i, "Stand near support and lift one foot off the floor."],
  [/arm circle/i, "Feet shoulder-width, arms out to your sides."],
  [/torso rotation/i, "Feet shoulder-width, soft knees, hands at your chest."],
  [/hip circle/i, "Feet a little wider than your hips, hands on your hips."],
  [/leg swing/i, "Stand beside a wall or chair and hold it for support."],
  [/split squat/i, "Step into a split stance, one foot forward, a chair beside you."],
  [/heel raise|calf raise/i, "Stand tall near a wall or chair for balance."],
  [/squat/i, "Stand in front of a chair, feet shoulder-width apart."],
  [/wall push-?up/i, "Face a wall, hands flat on it at shoulder height."],
  [/(incline|table|bench|counter(top)?) push-?up/i, "Hands on a sturdy surface, body in a straight line."],
  [/push-?up/i, "Down on the floor, hands under your shoulders."],
  [/glute bridge/i, "Lie on your back, knees bent, feet flat on the floor."],
  [/bird dog/i, "On all fours — hands under your shoulders, knees under your hips."],
  [/plank/i, "Forearms down, body in one straight line."],
  [/band row|resistance-band/i, "Anchor the band and hold an end in each hand."],
  [/single-leg balance/i, "Stand tall near something you can grab."],
  [/narrow-stance balance/i, "Stand with your feet together."],
  [/heel-to-toe balance/i, "Place one foot directly in front of the other."],
  [/hip-flexor stretch/i, "Kneel on one knee, the other foot flat in front."],
  [/hamstring stretch/i, "Extend one leg out straight and hinge toward it."],
  [/quad stretch/i, "Stand near support and hold one ankle behind you."],
  [/calf stretch/i, "Step one foot back, toes forward, hands on a wall."],
  [/chest stretch/i, "Stand in a doorway, forearm on the frame."],
  [/upper-back stretch/i, "Clasp your hands in front and round your upper back."],
  [/spinal rotation/i, "Sit or stand tall, hands at your chest."],
  [/walk|brisk|recovery/i, "Head outside or step onto a treadmill."],
];

export function setupFor(name: string): string {
  for (const [re, line] of SETUP_BY_NAME) if (re.test(name)) return line;
  return "Get into position.";
}

// ---- Expansion: prescriptions -> flat Exercise[] the Player understands ----

export function expand(
  list: Rx[],
  counter: { i: number },
  opts: { flow?: boolean } = {},
): Exercise[] {
  const out: Exercise[] = [];
  for (const rx of list) {
    const between = rx.restSec ?? (rx.holdSec ? holdRest : strengthRest);
    for (let s = 1; s <= rx.sets; s++) {
      const isLast = s === rx.sets;
      const after = isLast ? Math.min(between, 15) : between;
      // Displayed suffix is compact ("set 1/2"); spoken suffix is unabbreviated.
      const setSuffix = rx.sets > 1 ? ` — set ${s}/${rx.sets}` : "";
      const saySuffix = rx.sets > 1 ? `, set ${s} of ${rx.sets}` : "";

      if (rx.perSide) {
        // A per-side move becomes two segments (left, then right) so each side is
        // counted / held on its own — with a short switch-over between them.
        const perSideDur = rx.holdSec ?? repTime(rx, true);
        for (const side of ["left", "right"] as const) {
          const lastSide = side === "right";
          out.push({
            id: `ex-${counter.i++}`,
            name: `${rx.name} (${side})${setSuffix}`,
            sayName: `${rx.name}, ${side} side${saySuffix}`,
            type: rx.type,
            mode: rx.holdSec ? "time" : "reps",
            durationSec: perSideDur,
            reps: rx.holdSec ? undefined : rx.reps,
            restSec: isLast && lastSide ? after : lastSide ? between : 3,
            cue: rx.cue,
            setup: rx.setup ?? setupFor(rx.name),
            flow: opts.flow,
          });
        }
      } else {
        out.push({
          id: `ex-${counter.i++}`,
          name: `${rx.name}${setSuffix}`,
          sayName: `${rx.name}${saySuffix}`,
          type: rx.type,
          mode: rx.holdSec ? "time" : "reps",
          durationSec: rx.holdSec ?? repTime(rx),
          reps: rx.holdSec ? undefined : rx.reps,
          restSec: after,
          cue: composeCue(rx),
          setup: rx.setup ?? setupFor(rx.name),
          flow: opts.flow,
        });
      }
    }
  }
  return out;
}

// ---- Warm-up (before every strength session) ----

/** True when the person flagged their neck as an area to avoid loading. */
export function avoidsNeck(avoid: string[] = []): boolean {
  return avoid.some((a) => /neck/i.test(a));
}

/** Slow, gentle neck rolls — first thing in a warm-up, unless the neck is avoided. */
function neckRolls(): Rx {
  return R("Neck rolls", 1, 6, {
    type: "mobility",
    secPerRep: 2.5,
    restSec: 0,
    cue: "Slow and gentle — chin to chest, ear toward each shoulder.",
  });
}

export function warmupRx(week: number, avoid: string[] = []): Rx[] {
  const march = week <= 3 ? 60 : 90;
  const list: Rx[] = [];
  if (!avoidsNeck(avoid)) list.push(neckRolls());
  list.push(
    H("March in place", 1, march, { type: "cardio", restSec: 0, cue: "Warm up. Pump your arms." }),
    R("Shoulder rolls", 1, 10, { type: "mobility", secPerRep: 1.6, restSec: 0, cue: "Slow rolls — back and down." }),
    R("Arm circles", 1, 12, { type: "mobility", secPerRep: 1.4, restSec: 0, cue: "Open your chest; reverse halfway." }),
    R("Torso rotations", 1, 8, { type: "mobility", perSide: true, secPerRep: 1.5, restSec: 0, cue: "Gentle twist." }),
    R("Hip circles", 1, 8, { type: "mobility", secPerRep: 1.8, restSec: 0, cue: "Big circles; reverse halfway." }),
    R("Leg swings", 1, 10, { type: "mobility", perSide: true, secPerRep: 1.2, restSec: 0, cue: "Front to back; hold support." }),
    R("Heel raises", 1, 15, { secPerRep: 2, restSec: 0, cue: "Rise onto your toes." }),
    R("Chair squats", 1, 10, { restSec: 0, cue: "Easy — find your groove." }),
  );
  return list;
}

// ---- Walk-day warm-up & cool-down (lighter, leg-focused) ----

/** A short dynamic warm-up to prime the legs before a walk. */
export function walkWarmupRx(_week: number, avoid: string[] = []): Rx[] {
  const list: Rx[] = [];
  if (!avoidsNeck(avoid)) list.push(neckRolls());
  list.push(
    R("Shoulder rolls", 1, 8, { type: "mobility", secPerRep: 1.6, restSec: 0, cue: "Loosen up — back and down." }),
    R("Hip circles", 1, 8, { type: "mobility", secPerRep: 1.8, restSec: 0, cue: "Big circles; reverse halfway." }),
    R("Leg swings", 1, 8, { type: "mobility", perSide: true, secPerRep: 1.2, restSec: 0, cue: "Front to back; hold support." }),
    R("Ankle circles", 1, 8, { type: "mobility", perSide: true, secPerRep: 1.2, restSec: 0, cue: "Trace circles, each ankle." }),
    R("Heel raises", 1, 12, { secPerRep: 2, restSec: 0, cue: "Rise onto your toes." }),
  );
  return list;
}

/** A leg-focused cool-down for after a walk. */
export function walkCooldownRx(): Rx[] {
  const cue = "Ease in, breathe, don't bounce.";
  return [
    H("Hamstring stretch", 1, 30, { perSide: true, restSec: 0, cue: "Soft knee, hinge at the hips." }),
    H("Quad stretch", 1, 30, { perSide: true, restSec: 0, cue: "Hold support, knees together." }),
    H("Calf stretch", 1, 30, { perSide: true, restSec: 0, cue: "Back heel down, lean in." }),
    H("Hip-flexor stretch", 1, 30, { perSide: true, restSec: 0, cue }),
  ];
}

// ---- Cool-down stretches (after every strength session) ----

export function cooldownRx(): Rx[] {
  const cue = "Ease in, breathe, don't bounce.";
  return [
    H("Hip-flexor stretch", 1, 30, { perSide: true, restSec: 0, cue }),
    H("Hamstring stretch", 1, 30, { perSide: true, restSec: 0, cue: "Soft knee, hinge at the hips." }),
    H("Quad stretch", 1, 30, { perSide: true, restSec: 0, cue: "Hold support, knees together." }),
    H("Calf stretch", 1, 30, { perSide: true, restSec: 0, cue: "Back heel down, lean in." }),
    H("Chest stretch", 1, 30, { perSide: true, restSec: 0, cue: "Open across the chest." }),
    H("Upper-back stretch", 1, 30, { restSec: 0, cue: "Round forward, reach ahead." }),
    H("Spinal rotation", 1, 30, { restSec: 0, cue: "Gentle twists, five each side." }),
  ];
}

// ---- Strength prescriptions by phase ----

// Foundation (weeks 1-3): same M/W/F within a week; deliberately conservative.
function foundation(week: number): Rx[] {
  const secondSet = week === 3 ? 2 : 1;
  const bump = week === 2 ? 2 : 0; // week 2 adds ~2 reps to most movements
  return [
    R("Chair squat", secondSet, 10 + bump, { cue: "Sit back, chest up. Effort about 6 out of 10." }),
    R("Wall push-up", secondSet, 10 + bump, { cue: "Body in a straight line, elbows tucked." }),
    R("Supported split squat", 1, 6 + bump, { perSide: true, cue: "Hold a chair, lower straight down." }),
    R("Glute bridge", secondSet, 12 + bump, { cue: "Squeeze at the top." }),
    R("Calf raise", secondSet, 15 + bump, { secPerRep: 3, restSec: calfRest, cue: "Slow down each rep." }),
    R("Bird dog", 1, 6 + bump, { type: "mobility", perSide: true, restSec: coreRest, cue: "Opposite arm and leg, stay level." }),
    H("Countertop plank", 1, 20, { type: "strength", cue: "Straight line from head to heels." }),
    H("Single-leg balance", 2, 20, { perSide: true, restSec: balRest, cue: "Stand near something to grab." }),
  ];
}

// Build (weeks 4-6): M/W/F differ; band row enters here.
function build(week: number, code: string): Rx[] {
  const bump = week === 4 ? 0 : 1; // weeks 5-6 add ~1 rep
  const rowReps = week === 4 ? 10 : week === 5 ? 12 : 15;
  const pushName = week === 6 ? "Countertop push-up" : "Incline push-up";
  const squatName = week === 6 ? "Free-standing squat" : "Bodyweight squat";
  const plankBonus = week === 6 ? 5 : 0;
  const effort = "Effort 6 to 7 out of 10.";

  if (code === "wed") {
    return [
      R(squatName, 2, 10 + bump, { cue: `Chest up, controlled. ${effort}` }),
      R(pushName, 2, 10 + bump, { cue: "Straight line, elbows tucked." }),
      R("Supported split squat", 2, 8 + bump, { perSide: true, cue: "Lower straight down." }),
      R("Resistance-band row", 2, rowReps, { cue: "Elbows back, squeeze shoulder blades." }),
      R("Glute bridge", 2, 12 + bump, { cue: "Squeeze hard at the top." }),
      R("Calf raise", 2, 15 + bump, { secPerRep: 3, restSec: calfRest, cue: "Slow and controlled." }),
      R("Bird dog", 2, 8 + bump, { type: "mobility", perSide: true, restSec: coreRest, cue: "Stay level, no rocking." }),
      H("Plank", 2, 25 + plankBonus, { type: "strength", cue: "Brace your core." }),
      H("Single-leg balance", 3, 20, { perSide: true, restSec: balRest, cue: "Stand near support." }),
    ];
  }
  if (code === "fri") {
    return [
      R(squatName, 2, 12 + bump, { cue: `Your slightly harder day. ${effort}` }),
      R(pushName, 2, 12 + bump, { cue: "Full range, controlled." }),
      R("Supported split squat", 2, 10 + bump, { perSide: true, cue: "Lighten your grip on the chair." }),
      R("Resistance-band row", 2, rowReps, { cue: "Elbows back, slow return." }),
      R("Glute bridge", 2, 15 + bump, { cue: "Pause and squeeze." }),
      R("Calf raise", 2, 18 + bump, { secPerRep: 3, restSec: calfRest, cue: "Full range." }),
      R("Bird dog", 2, 10 + bump, { type: "mobility", perSide: true, restSec: coreRest, cue: "Slow and steady." }),
      H("Plank", 2, 30 + plankBonus, { type: "strength", cue: "Three excellent holds." }),
      H("Single-leg balance", 3, 30, { perSide: true, restSec: balRest, cue: "Near support." }),
    ];
  }
  // Monday (default)
  return [
    R(squatName, 2, 12 + bump, { cue: `Chest up, sit back. ${effort}` }),
    R(pushName, 2, 10 + bump, { cue: "Straight line, elbows tucked." }),
    R("Supported split squat", 2, 8 + bump, { perSide: true, cue: "Hold a chair, lower straight down." }),
    R("Resistance-band row", 2, rowReps, { cue: "Elbows back, squeeze shoulder blades." }),
    R("Glute bridge", 2, 15 + bump, { cue: "Squeeze hard at the top." }),
    R("Calf raise", 2, 15 + bump, { secPerRep: 3, restSec: calfRest, cue: "Slow down each rep." }),
    R("Bird dog", 2, 8 + bump, { type: "mobility", perSide: true, restSec: coreRest, cue: "Opposite arm and leg, stay level." }),
    H("Plank", 2, 22 + plankBonus, { type: "strength", cue: "Straight line, brace your core." }),
    H("Single-leg balance", 2, 30, { perSide: true, restSec: balRest, cue: "Stand near support." }),
  ];
}

// Develop (weeks 7-9): a legitimate strength workout; same each day, harder by week.
function develop(week: number): Rx[] {
  const squatSets = week === 7 ? 2 : 3;
  const squatReps = week === 9 ? 15 : 12;
  const pushSets = week === 9 ? 3 : 2;
  const pushReps = week === 8 ? 12 : 10;
  const pushName = week === 7 ? "Table push-up" : "Bench push-up";
  const bridgeReps = week === 7 ? 12 : week === 8 ? 14 : 15;
  const calfReps = week === 7 ? 15 : week === 8 ? 18 : 20;
  const plankSets = week === 7 ? 2 : 3;
  const plankHold = week === 9 ? 40 : 30;
  return [
    R("Bodyweight squat", squatSets, squatReps, { cue: "Slow, 3-second descent when it feels easy. Effort 6 to 7." }),
    R(pushName, pushSets, pushReps, { cue: "Pick the level where 8 to 12 are hard but clean." }),
    R("Split squat", 2, 10, { perSide: true, cue: "One hand on the chair — lighten your grip." }),
    R("Resistance-band row", 3, week === 7 ? 10 : 12, { cue: "Elbows back, squeeze, slow return." }),
    R("Glute bridge", 3, bridgeReps, { cue: "Hold two seconds at the top." }),
    R("Calf raise", 3, calfReps, { secPerRep: 3, restSec: calfRest, cue: "Start shifting toward one leg." }),
    R("Bird dog", 2, 10, { type: "mobility", perSide: true, restSec: coreRest, cue: "Hold each rep three seconds." }),
    H("Plank", plankSets, plankHold, { type: "strength", cue: "Excellent holds beat one long one." }),
    H("Narrow-stance balance", 2, 30, { cue: "Feet together, stand tall." }),
    H("Heel-to-toe balance", 2, 30, { cue: "One foot directly in front of the other." }),
    H("Single-leg balance", 2, 25, { perSide: true, cue: "Near support, both legs." }),
  ];
}

// Strengthen (weeks 10-12): quality strength; distinct M/W/F emphasis.
function strengthen(code: string): Rx[] {
  if (code === "wed") {
    // Control & mobility day
    return [
      R("Slow squat", 2, 10, { secPerRep: 6, cue: "Three seconds down, brief pause, stand normally." }),
      R("Push-up", 2, 10, { cue: "Controlled tempo, best level." }),
      R("Split squat", 2, 8, { perSide: true, cue: "Slow and balanced." }),
      R("Resistance-band row", 2, 15, { cue: "Light, high reps, perfect form." }),
      R("Bird dog", 2, 10, { type: "mobility", perSide: true, restSec: coreRest, cue: "Hold three seconds." }),
      R("Glute bridge", 2, 15, { cue: "Pause at the top." }),
      H("Plank", 2, 30, { type: "strength", cue: "Steady and braced." }),
      H("Narrow-stance balance", 2, 45, { cue: "Tall and still." }),
      H("Heel-to-toe balance", 2, 45, { cue: "One foot in front." }),
      H("Single-leg balance", 2, 40, { perSide: true, cue: "Near support." }),
    ];
  }
  if (code === "fri") {
    // Full workout
    return [
      R("Squat", 3, 12, { cue: "Strong and controlled. Effort 6 to 7." }),
      R("Push-up", 3, 11, { cue: "Best level for clean reps." }),
      R("Split squat", 3, 10, { perSide: true, cue: "Minimal chair support." }),
      R("Resistance-band row", 3, 13, { cue: "Full squeeze, slow return." }),
      R("Glute bridge", 3, 15, { cue: "Squeeze hard; single-leg if easy." }),
      R("Calf raise", 3, 19, { secPerRep: 3, restSec: calfRest, cue: "Toward single-leg." }),
      R("Bird dog", 3, 8, { type: "mobility", perSide: true, restSec: coreRest, cue: "Slow, level, controlled." }),
      H("Plank", 3, 40, { type: "strength", cue: "Brace hard, breathe." }),
      H("Single-leg balance", 3, 30, { perSide: true, cue: "Near support." }),
    ];
  }
  // Monday — strength emphasis
  return [
    R("Squat", 3, 12, { cue: "Strong and controlled. Effort 6 to 7." }),
    R("Push-up", 3, 10, { cue: "Best level for 8 to 12 clean reps." }),
    R("Split squat", 3, 8, { perSide: true, cue: "Minimal chair support." }),
    R("Resistance-band row", 3, 12, { cue: "Full squeeze, slow return." }),
    R("Glute bridge", 3, 15, { cue: "Squeeze; single-leg if easy." }),
    R("Calf raise", 3, 15, { secPerRep: 3, restSec: calfRest, cue: "Toward single-leg." }),
    H("Plank", 3, 35, { type: "strength", cue: "Brace hard, breathe." }),
    H("Single-leg balance", 3, 30, { perSide: true, cue: "Near support." }),
  ];
}

export function strengthRx(week: number, code: string): Rx[] {
  if (week <= 3) return foundation(week);
  if (week <= 6) return build(week, code);
  if (week <= 9) return develop(week);
  return strengthen(code);
}

// ---- Walking prescriptions ----

export function walkRx(week: number): Rx[] {
  const easy = (name: string, sec: number, cue = "Easy, conversational pace.") =>
    H(name, 1, sec, { type: "cardio", restSec: 0, cue });
  const brisk = (sec: number) =>
    H("Brisk interval", 1, sec, { type: "cardio", restSec: 0, cue: "Push — 'I'm exercising', not 'catching a bus'." });

  if (week <= 3) return [easy("Comfortable walk", 1800)];
  if (week <= 6) {
    return [
      easy("Easy walk", 720),
      H("Brisk middle", 1, 660, { type: "cardio", restSec: 0, cue: "Pick up the pace." }),
      easy("Easy finish", 720),
    ];
  }
  const rounds = week <= 9 ? 5 : 7;
  const warm = week <= 9 ? 480 : 360;
  const finish = week <= 9 ? 1020 : 900;
  const out: Rx[] = [easy("Easy warm-up walk", warm)];
  for (let i = 0; i < rounds; i++) {
    out.push(brisk(60));
    out.push(easy("Easy recovery", 120, "Ease off, catch your breath."));
  }
  out.push(easy("Easy finish", finish));
  return out;
}

function walkSummary(week: number): string {
  if (week <= 3) return "30 min · comfortable pace";
  if (week <= 6) return "35 min · brisk middle 10";
  if (week <= 9) return "40 min · 5 × 1-min intervals";
  return "40–45 min · 7 × 1-min intervals";
}

// ---- Program structure ----

export type DayKind = "strength" | "walk" | "rest";

export interface ProgramDay {
  id: string; // e.g. "w3-wed"
  week: number;
  code: string; // mon/tue/.../sun
  dow: number; // 1=Mon .. 7=Sun
  label: string; // "Monday · Strength"
  kind: DayKind;
  summary: string;
  /** 0-based position among the week's strength days (for template variation). */
  strengthIndex?: number;
}

export interface ProgramWeek {
  week: number;
  phase: string;
  objective: string;
  days: ProgramDay[];
}

export function phaseFor(week: number): { name: string; objective: string } {
  if (week <= 3) return { name: "Foundation", objective: "Technique, mobility, joint tolerance" };
  if (week <= 6) return { name: "Build", objective: "Strength & balance" };
  if (week <= 9) return { name: "Develop", objective: "More challenging variations" };
  return { name: "Strengthen", objective: "Functional strength & endurance" };
}

export type PhaseKey = "foundation" | "build" | "develop" | "strengthen";

export function phaseKey(week: number): PhaseKey {
  if (week <= 3) return "foundation";
  if (week <= 6) return "build";
  if (week <= 9) return "develop";
  return "strengthen";
}

function kindFor(activity: WeekdayActivity): DayKind {
  return activity === "strength" ? "strength" : activity === "aerobic" ? "walk" : "rest";
}

/**
 * Build the 12-week calendar from a weekly schedule (Mon..Sun activities).
 * Each strength day carries `strengthIndex` — its position among the week's
 * strength days — so both the free template and the personalized plan can pick
 * the matching session. Defaults to the standard M/W/F rhythm.
 */
export function buildProgram(schedule: WeekdayActivity[] = DEFAULT_SCHEDULE): ProgramWeek[] {
  const strengthCodes = strengthDayCodes(schedule);
  return Array.from({ length: 12 }, (_, i) => {
    const week = i + 1;
    const ph = phaseFor(week);
    return {
      week,
      phase: ph.name,
      objective: ph.objective,
      days: WEEKDAYS.map((w, idx) => {
        const kind = kindFor(schedule[idx] ?? "rest");
        const kindLabel = kind === "strength" ? "Strength" : kind === "walk" ? "Aerobic" : "Rest";
        return {
          id: `w${week}-${w.code}`,
          week,
          code: w.code,
          dow: w.dow,
          label: `${w.label} · ${kindLabel}`,
          kind,
          strengthIndex: kind === "strength" ? strengthCodes.indexOf(w.code) : undefined,
          summary:
            kind === "strength"
              ? "Warm-up · strength · stretch"
              : kind === "walk"
                ? walkSummary(week)
                : "Rest day",
        };
      }),
    };
  });
}

/** The default-schedule calendar (kept for back-compat with default consumers). */
export const PROGRAM: ProgramWeek[] = buildProgram();

/** All startable days (strength + walk), in program order, for a schedule. */
export function activeDays(schedule: WeekdayActivity[] = DEFAULT_SCHEDULE): ProgramDay[] {
  return buildProgram(schedule)
    .flatMap((w) => w.days)
    .filter((d) => d.kind !== "rest");
}

export function getDay(
  id: string,
  schedule: WeekdayActivity[] = DEFAULT_SCHEDULE,
): ProgramDay | undefined {
  return buildProgram(schedule)
    .flatMap((w) => w.days)
    .find((d) => d.id === id);
}

/** Map a strength day's position to one of the 3 authored template variants. */
function templateCode(strengthIndex: number | undefined): string {
  return ["mon", "wed", "fri"][(strengthIndex ?? 0) % 3];
}

/** Turn a program day into a concrete Routine the Player can run. */
export function buildRoutine(day: ProgramDay, hasBand: boolean): Routine | null {
  if (day.kind === "rest") return null;
  const counter = { i: 0 };
  let exercises: Exercise[];
  let focus: string;

  if (day.kind === "walk") {
    exercises = [
      ...expand(walkWarmupRx(day.week), counter, { flow: true }),
      ...expand(walkRx(day.week), counter),
      ...expand(walkCooldownRx(), counter, { flow: true }),
    ];
    focus = "Walking";
  } else {
    const strength = strengthRx(day.week, templateCode(day.strengthIndex)).filter(
      (rx) => hasBand || !/resistance-band row/i.test(rx.name),
    );
    exercises = [
      ...expand(warmupRx(day.week), counter, { flow: true }),
      ...expand(strength, counter),
      ...expand(cooldownRx(), counter, { flow: true }),
    ];
    focus = phaseFor(day.week).name;
  }

  return {
    id: day.id,
    name: `Week ${day.week} · ${day.label}`,
    focus,
    description: day.summary,
    exercises,
    createdAt: 0,
    source: "program",
  };
}
