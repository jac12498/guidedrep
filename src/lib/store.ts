// Data layer. Dual-mode:
//   • Supabase configured  → per-user cloud storage (routines, history, program).
//   • Not configured       → localStorage (the original local-first experience).
// All data functions are async so callers await uniformly in either mode.
// Device-level settings (voice/beeps/prep) always stay in localStorage.

import { DEFAULT_SETTINGS, type Routine, type SessionLog, type Settings } from "./types";
import { SEED_ROUTINES } from "./seed";
import { supabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/client";
import type { MidblockCheckin, ProgramBlock, ProgramPlan } from "./programPlan";
import type { FitnessProfile } from "./fitness";

const K_ROUTINES = "ec:routines";
const K_SESSIONS = "ec:sessions";
const K_SETTINGS = "ec:settings";
const K_PROGRAM = "ec:program";
const K_BLOCK = "ec:program_block";
const K_FEEDBACK = "ec:routine_feedback";
const K_MIGRATED = "ec:migrated";

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/unavailable */
  }
}

export function newId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

// ---- Supabase client (lazy, browser-only) ----

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient();
  return _sb;
}
async function uid(): Promise<string | null> {
  const { data } = await sb().auth.getUser();
  return data.user?.id ?? null;
}

// ---- row <-> app mapping ----

interface RoutineRow {
  id: string;
  name: string;
  focus: string | null;
  description: string | null;
  source: string | null;
  exercises: Routine["exercises"];
  created_at: string;
}
function rowToRoutine(r: RoutineRow): Routine {
  return {
    id: r.id,
    name: r.name,
    focus: r.focus ?? "",
    description: r.description ?? undefined,
    exercises: r.exercises ?? [],
    createdAt: new Date(r.created_at).getTime(),
    source: (r.source as Routine["source"]) ?? "custom",
  };
}

interface SessionRow {
  id: string;
  routine_id: string | null;
  routine_name: string | null;
  performed_at: string;
  duration_sec: number | null;
  completed_count: number | null;
  total_count: number | null;
}
function rowToSession(r: SessionRow): SessionLog {
  return {
    id: r.id,
    routineId: r.routine_id ?? "",
    routineName: r.routine_name ?? "Workout",
    date: new Date(r.performed_at).getTime(),
    durationSec: r.duration_sec ?? 0,
    completedCount: r.completed_count ?? 0,
    totalCount: r.total_count ?? 0,
  };
}

// ---- Routines ----
// Seed routines are code constants shown to everyone (never stored per user).

function localCustomRoutines(): Routine[] {
  return read<Routine[]>(K_ROUTINES, []).filter((r) => r.source !== "seed");
}

export async function getRoutines(): Promise<Routine[]> {
  if (!supabaseConfigured) {
    return [...localCustomRoutines().sort((a, b) => b.createdAt - a.createdAt), ...SEED_ROUTINES];
  }
  const { data } = await sb()
    .from("routines")
    .select("*")
    .order("created_at", { ascending: false });
  const cloud = (data ?? []).map((r) => rowToRoutine(r as RoutineRow));
  return [...cloud, ...SEED_ROUTINES];
}

export async function getRoutine(id: string): Promise<Routine | undefined> {
  const seed = SEED_ROUTINES.find((r) => r.id === id);
  if (seed) return seed;
  if (!supabaseConfigured) return localCustomRoutines().find((r) => r.id === id);
  const { data } = await sb().from("routines").select("*").eq("id", id).maybeSingle();
  return data ? rowToRoutine(data as RoutineRow) : undefined;
}

/** Insert a routine; returns the stored routine (with its real id). */
export async function saveRoutine(routine: Routine): Promise<Routine> {
  if (!supabaseConfigured) {
    const all = localCustomRoutines();
    const idx = all.findIndex((r) => r.id === routine.id);
    if (idx >= 0) all[idx] = routine;
    else all.push(routine);
    write(K_ROUTINES, all);
    return routine;
  }
  const { data } = await sb()
    .from("routines")
    .insert({
      name: routine.name,
      focus: routine.focus,
      description: routine.description ?? null,
      source: routine.source,
      exercises: routine.exercises,
    })
    .select()
    .single();
  return data ? rowToRoutine(data as RoutineRow) : routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  if (SEED_ROUTINES.some((r) => r.id === id)) return; // built-ins aren't deletable
  if (!supabaseConfigured) {
    write(K_ROUTINES, localCustomRoutines().filter((r) => r.id !== id));
    return;
  }
  await sb().from("routines").delete().eq("id", id);
}

// ---- Sessions / history ----

export async function getSessions(): Promise<SessionLog[]> {
  if (!supabaseConfigured) {
    return read<SessionLog[]>(K_SESSIONS, []).slice().sort((a, b) => b.date - a.date);
  }
  const { data } = await sb()
    .from("session_logs")
    .select("*")
    .order("performed_at", { ascending: false });
  return (data ?? []).map((r) => rowToSession(r as SessionRow));
}

export async function logSession(entry: SessionLog): Promise<void> {
  if (!supabaseConfigured) {
    const all = read<SessionLog[]>(K_SESSIONS, []);
    all.push(entry);
    write(K_SESSIONS, all);
    return;
  }
  await sb().from("session_logs").insert({
    routine_id: entry.routineId,
    routine_name: entry.routineName,
    performed_at: new Date(entry.date).toISOString(),
    duration_sec: entry.durationSec,
    completed_count: entry.completedCount,
    total_count: entry.totalCount,
  });
}

/** Consecutive-day streak from already-fetched sessions (pure — no I/O). */
export function currentStreak(sessions: SessionLog[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => new Date(s.date).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---- Settings (always device-local) ----

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K_SETTINGS, {}) };
}
export function saveSettings(settings: Settings): void {
  write(K_SETTINGS, settings);
}

// ---- 12-week program progress ----

export interface ProgramState {
  completed: string[];
  hasBand: boolean;
  startedAt: number | null;
}
const DEFAULT_PROGRAM_STATE: ProgramState = { completed: [], hasBand: true, startedAt: null };

function localProgramState(): ProgramState {
  return { ...DEFAULT_PROGRAM_STATE, ...read<Partial<ProgramState>>(K_PROGRAM, {}) };
}

export async function getProgramState(): Promise<ProgramState> {
  if (!supabaseConfigured) return localProgramState();
  const { data } = await sb().from("program_state").select("*").maybeSingle();
  if (!data) return { ...DEFAULT_PROGRAM_STATE };
  return {
    completed: data.completed ?? [],
    hasBand: data.has_band ?? true,
    startedAt: data.started_at ? new Date(data.started_at).getTime() : null,
  };
}

async function writeProgramState(state: ProgramState): Promise<void> {
  const id = await uid();
  if (!id) return;
  await sb()
    .from("program_state")
    .upsert({
      user_id: id,
      completed: state.completed,
      has_band: state.hasBand,
      started_at: state.startedAt ? new Date(state.startedAt).toISOString() : null,
    });
}

export async function markProgramDayComplete(dayId: string): Promise<void> {
  if (!supabaseConfigured) {
    const s = localProgramState();
    if (!s.completed.includes(dayId)) s.completed.push(dayId);
    if (s.startedAt == null) s.startedAt = Date.now();
    write(K_PROGRAM, s);
    return;
  }
  const s = await getProgramState();
  const completed = s.completed.includes(dayId) ? s.completed : [...s.completed, dayId];
  await writeProgramState({ ...s, completed, startedAt: s.startedAt ?? Date.now() });
}

export async function setHasBand(hasBand: boolean): Promise<void> {
  if (!supabaseConfigured) {
    write(K_PROGRAM, { ...localProgramState(), hasBand });
    return;
  }
  const s = await getProgramState();
  await writeProgramState({ ...s, hasBand });
}

export async function resetProgram(): Promise<void> {
  if (!supabaseConfigured) {
    write(K_PROGRAM, { ...DEFAULT_PROGRAM_STATE, hasBand: localProgramState().hasBand });
    return;
  }
  const s = await getProgramState();
  await writeProgramState({ completed: [], hasBand: s.hasBand, startedAt: null });
}

// ---- personalized 12-week program (Pro) ----

interface BlockRow {
  id: string;
  block_number: number;
  plan: ProgramPlan;
  source_answers: FitnessProfile | null;
  completed_days: string[] | null;
  status: string;
  midblock: MidblockCheckin | null;
  started_at: string | null;
  created_at: string;
}
function rowToBlock(r: BlockRow): ProgramBlock {
  return {
    id: r.id,
    blockNumber: r.block_number,
    plan: r.plan,
    completedDays: r.completed_days ?? [],
    status: r.status,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : null,
    createdAt: new Date(r.created_at).getTime(),
    sourceAnswers: r.source_answers ?? null,
    midblock: r.midblock ?? null,
  };
}

/** The user's current personalized program block (most recent), or null. */
export async function getActiveProgramBlock(): Promise<ProgramBlock | null> {
  if (!supabaseConfigured) return read<ProgramBlock | null>(K_BLOCK, null);
  const { data } = await sb()
    .from("program_blocks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? rowToBlock(data as BlockRow) : null;
}

/**
 * Store a freshly generated program as the new active block. If a block already
 * exists it's marked complete and the new one gets the next block number (the
 * end-of-block rebuild → next 12 weeks). `startedAt` is left null so the first
 * completed day starts the clock.
 */
export async function saveProgramBlock(
  plan: ProgramPlan,
  sourceAnswers: FitnessProfile | unknown,
): Promise<ProgramBlock> {
  const now = Date.now();
  if (!supabaseConfigured) {
    const prev = read<ProgramBlock | null>(K_BLOCK, null);
    const block: ProgramBlock = {
      id: newId(),
      blockNumber: (prev?.blockNumber ?? 0) + 1,
      plan,
      completedDays: [],
      status: "active",
      startedAt: null,
      createdAt: now,
      sourceAnswers: (sourceAnswers as FitnessProfile) ?? null,
      midblock: null,
    };
    write(K_BLOCK, block);
    return block;
  }

  // Find the current block (if any): bump the number and complete it.
  const prev = await getActiveProgramBlock();
  const nextNumber = (prev?.blockNumber ?? 0) + 1;
  if (prev) {
    await sb()
      .from("program_blocks")
      .update({ status: "completed", completed_at: new Date(now).toISOString() })
      .eq("id", prev.id);
  }

  const { data } = await sb()
    .from("program_blocks")
    .insert({
      plan,
      source_answers: sourceAnswers ?? null,
      block_number: nextNumber,
      status: "active",
    })
    .select()
    .single();
  return data
    ? rowToBlock(data as BlockRow)
    : {
        id: newId(),
        blockNumber: nextNumber,
        plan,
        completedDays: [],
        status: "active",
        startedAt: null,
        createdAt: now,
        sourceAnswers: (sourceAnswers as FitnessProfile) ?? null,
        midblock: null,
      };
}

/**
 * Record a mid-block check-in on the active block. When `plan` is provided the
 * remaining phases were re-tuned, so it replaces the stored plan.
 */
export async function recordMidblock(
  feedback: MidblockCheckin,
  plan?: ProgramPlan,
): Promise<void> {
  if (!supabaseConfigured) {
    const b = read<ProgramBlock | null>(K_BLOCK, null);
    if (!b) return;
    b.midblock = feedback;
    if (plan) b.plan = plan;
    write(K_BLOCK, b);
    return;
  }
  const block = await getActiveProgramBlock();
  if (!block) return;
  const update: Record<string, unknown> = { midblock: feedback };
  if (plan) update.plan = plan;
  await sb().from("program_blocks").update(update).eq("id", block.id);
}

/** Mark several program days complete at once (used by the dev test shortcut). */
export async function markProgramBlockDaysComplete(dayIds: string[]): Promise<void> {
  if (!supabaseConfigured) {
    const b = read<ProgramBlock | null>(K_BLOCK, null);
    if (!b) return;
    const set = new Set(b.completedDays);
    dayIds.forEach((d) => set.add(d));
    b.completedDays = [...set];
    if (b.startedAt == null) b.startedAt = Date.now();
    write(K_BLOCK, b);
    return;
  }
  const block = await getActiveProgramBlock();
  if (!block) return;
  const set = new Set(block.completedDays);
  dayIds.forEach((d) => set.add(d));
  await sb()
    .from("program_blocks")
    .update({
      completed_days: [...set],
      started_at: block.startedAt ? new Date(block.startedAt).toISOString() : new Date().toISOString(),
    })
    .eq("id", block.id);
}

export async function markProgramBlockDayComplete(dayId: string): Promise<void> {
  if (!supabaseConfigured) {
    const b = read<ProgramBlock | null>(K_BLOCK, null);
    if (!b) return;
    if (!b.completedDays.includes(dayId)) b.completedDays.push(dayId);
    if (b.startedAt == null) b.startedAt = Date.now();
    write(K_BLOCK, b);
    return;
  }
  const block = await getActiveProgramBlock();
  if (!block) return;
  const completed = block.completedDays.includes(dayId)
    ? block.completedDays
    : [...block.completedDays, dayId];
  await sb()
    .from("program_blocks")
    .update({
      completed_days: completed,
      started_at: block.startedAt ? new Date(block.startedAt).toISOString() : new Date().toISOString(),
    })
    .eq("id", block.id);
}

export interface RoutineFeedbackInput {
  routineId: string;
  routineName: string;
  rating: string; // too_easy | just_right | too_hard
  note?: string;
}

/** Save an optional end-of-workout rating + note (for our review). */
export async function saveRoutineFeedback(fb: RoutineFeedbackInput): Promise<void> {
  if (!supabaseConfigured) {
    const list = read<Array<RoutineFeedbackInput & { id: string; date: number }>>(K_FEEDBACK, []);
    list.push({ ...fb, id: newId(), date: Date.now() });
    write(K_FEEDBACK, list);
    return;
  }
  // user_id is filled by the column default (auth.uid()).
  await sb().from("routine_feedback").insert({
    routine_id: fb.routineId,
    routine_name: fb.routineName,
    rating: fb.rating,
    note: fb.note ?? null,
  });
}

// ---- One-time migration of any on-device data into the signed-in account ----

export async function ensureMigrated(): Promise<void> {
  if (!supabaseConfigured || !isBrowser()) return;
  if (window.localStorage.getItem(K_MIGRATED)) return;
  const id = await uid();
  if (!id) return; // not signed in yet

  try {
    const routines = localCustomRoutines();
    if (routines.length) {
      await sb()
        .from("routines")
        .insert(
          routines.map((r) => ({
            name: r.name,
            focus: r.focus,
            description: r.description ?? null,
            source: r.source,
            exercises: r.exercises,
          })),
        );
    }

    const sessions = read<SessionLog[]>(K_SESSIONS, []);
    if (sessions.length) {
      await sb().from("session_logs").insert(
        sessions.map((s) => ({
          user_id: id,
          routine_id: s.routineId,
          routine_name: s.routineName,
          performed_at: new Date(s.date).toISOString(),
          duration_sec: s.durationSec,
          completed_count: s.completedCount,
          total_count: s.totalCount,
        })),
      );
    }

    const ps = read<ProgramState | null>(K_PROGRAM, null);
    if (ps && (ps.completed?.length || ps.startedAt)) {
      await writeProgramState({
        completed: ps.completed ?? [],
        hasBand: ps.hasBand ?? true,
        startedAt: ps.startedAt ?? null,
      });
    }

    window.localStorage.setItem(K_MIGRATED, "1");
  } catch {
    // best effort — will retry on next load if it failed partway
  }
}
