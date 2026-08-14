"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionLog } from "@/lib/types";
import { currentStreak, getSessions } from "@/lib/store";
import { mmss } from "@/lib/format";

function dayLabel(date: number): string {
  const d = new Date(date);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === yesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionLog[] | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getSessions().then((data) => {
      setSessions(data);
      setStreak(currentStreak(data));
    });
  }, []);

  const total = sessions?.length ?? 0;
  const totalMinutes = sessions
    ? Math.round(sessions.reduce((s, x) => s + x.durationSec, 0) / 60)
    : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
        <Link
          href="/app/stats"
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-brand"
        >
          📊 Insights
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat value={streak} label="day streak" />
        <Stat value={total} label="workouts" />
        <Stat value={totalMinutes} label="total min" />
      </div>

      {sessions === null ? (
        <p className="text-muted">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          No workouts logged yet.
          <br />
          <Link href="/app" className="mt-2 inline-block text-brand">
            Start one today →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{s.routineName}</div>
                <div className="text-xs text-muted">{dayLabel(s.date)}</div>
              </div>
              <div className="shrink-0 text-right text-sm text-muted">
                <div className="tnum">{mmss(s.durationSec)}</div>
                <div className="text-xs">{s.completedCount} moves</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className="text-2xl font-bold text-brand tnum">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
