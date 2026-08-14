import type { SessionLog } from "./types";

// Pure, client-safe analytics over the workout log. All dates are local-time.

const DAY_MS = 86400000;

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Monday 00:00 local for the week containing `ms`. */
export function startOfWeek(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export interface WeekBucket {
  start: number;
  label: string; // e.g. "Aug 4"
  count: number;
  minutes: number;
}

/** Last `weeks` weeks (including empty ones), oldest → newest. */
export function weeklyBuckets(sessions: SessionLog[], weeks = 12): WeekBucket[] {
  const thisWeek = startOfWeek(Date.now());
  const buckets: WeekBucket[] = [];
  const index = new Map<number, WeekBucket>();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeek - i * 7 * DAY_MS;
    const b: WeekBucket = {
      start,
      label: new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: 0,
      minutes: 0,
    };
    buckets.push(b);
    index.set(start, b);
  }
  for (const s of sessions) {
    const b = index.get(startOfWeek(s.date));
    if (b) {
      b.count += 1;
      b.minutes += Math.round(s.durationSec / 60);
    }
  }
  return buckets;
}

/** Counts per weekday, Monday → Sunday. */
export function dayOfWeekCounts(sessions: SessionLog[]): { label: string; count: number }[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = new Array(7).fill(0);
  for (const s of sessions) {
    const dow = (new Date(s.date).getDay() + 6) % 7;
    counts[dow] += 1;
  }
  return labels.map((label, i) => ({ label, count: counts[i] }));
}

/** Longest run of consecutive calendar days with at least one workout. */
export function longestStreak(sessions: SessionLog[]): number {
  if (sessions.length === 0) return 0;
  const days = [...new Set(sessions.map((s) => dayKey(s.date)))]
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((days[i] - days[i - 1]) / DAY_MS);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export interface Totals {
  workouts: number;
  minutes: number;
  avgMinutes: number;
  thisWeek: number;
  activeWeeks: number;
}

export function totals(sessions: SessionLog[]): Totals {
  const minutes = Math.round(sessions.reduce((s, x) => s + x.durationSec, 0) / 60);
  const thisWeekStart = startOfWeek(Date.now());
  const thisWeek = sessions.filter((s) => startOfWeek(s.date) === thisWeekStart).length;
  const activeWeeks = new Set(sessions.map((s) => startOfWeek(s.date))).size;
  return {
    workouts: sessions.length,
    minutes,
    avgMinutes: sessions.length ? Math.round(minutes / sessions.length) : 0,
    thisWeek,
    activeWeeks,
  };
}
