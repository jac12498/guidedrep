import type { Routine, SessionLog } from "./types";
import type { ProgramState } from "./store";

// Client-side data export. Builds CSV / JSON in the browser and triggers a
// download — no server round-trip, since the data is already fetched.

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function sessionsToCSV(sessions: SessionLog[]): string {
  const header = ["date", "routine", "duration_min", "completed", "total"];
  const rows = sessions.map((s) => [
    new Date(s.date).toISOString(),
    csvCell(s.routineName),
    (s.durationSec / 60).toFixed(1),
    s.completedCount,
    s.totalCount,
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export interface Backup {
  app: "guided-reps";
  exportedAt: string;
  routines: Routine[];
  sessions: SessionLog[];
  program: ProgramState;
}

export function buildBackup(
  routines: Routine[],
  sessions: SessionLog[],
  program: ProgramState,
  now: number,
): Backup {
  return {
    app: "guided-reps",
    exportedAt: new Date(now).toISOString(),
    routines,
    sessions,
    program,
  };
}

export function download(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** A filesystem-safe date stamp like 2026-08-11. */
export function dateStamp(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
