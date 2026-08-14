"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Routine, SessionLog } from "@/lib/types";
import {
  currentStreak,
  getProgramState,
  getRoutines,
  getSessions,
  type ProgramState,
} from "@/lib/store";
import { activeDays } from "@/lib/program";
import { dayOfWeekCounts, longestStreak, totals, weeklyBuckets } from "@/lib/stats";
import { buildBackup, dateStamp, download, sessionsToCSV } from "@/lib/exportData";

type Metric = "count" | "minutes";

export default function StatsDashboard() {
  const [sessions, setSessions] = useState<SessionLog[] | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [program, setProgram] = useState<ProgramState | null>(null);
  const [metric, setMetric] = useState<Metric>("count");

  useEffect(() => {
    (async () => {
      const [s, r, p] = await Promise.all([getSessions(), getRoutines(), getProgramState()]);
      setSessions(s);
      setRoutines(r);
      setProgram(p);
    })();
  }, []);

  const stats = useMemo(() => {
    if (!sessions) return null;
    return {
      t: totals(sessions),
      streak: currentStreak(sessions),
      longest: longestStreak(sessions),
      weeks: weeklyBuckets(sessions, 12),
      dow: dayOfWeekCounts(sessions),
    };
  }, [sessions]);

  if (!sessions || !stats || !program) {
    return <p className="pt-20 text-center text-muted">Loading…</p>;
  }

  const programDone = program.completed.length;
  const programTotal = activeDays().length;
  const programPct = Math.round((programDone / programTotal) * 100);

  const weekData = stats.weeks.map((w) => ({
    label: w.label,
    value: metric === "count" ? w.count : w.minutes,
  }));

  function exportCSV() {
    download(`guided-reps-workouts-${dateStamp(Date.now())}.csv`, sessionsToCSV(sessions!), "text/csv");
  }
  function exportJSON() {
    const backup = buildBackup(routines, sessions!, program!, Date.now());
    download(
      `guided-reps-backup-${dateStamp(Date.now())}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
  }

  if (sessions.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No workouts yet — your charts appear here once you train.
          <br />
          <Link href="/app" className="mt-2 inline-block text-brand">
            Start today →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Insights</h1>
      <p className="mb-5 text-sm text-muted">Your training at a glance.</p>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile value={stats.t.workouts} label="workouts" />
        <Tile value={stats.t.minutes} label="total minutes" />
        <Tile value={stats.streak} label="current streak" />
        <Tile value={stats.longest} label="longest streak" />
      </div>

      {/* Weekly activity */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Last 12 weeks</h2>
          <div className="flex rounded-full bg-surface-2 p-0.5 text-xs">
            <Toggle active={metric === "count"} onClick={() => setMetric("count")}>
              Workouts
            </Toggle>
            <Toggle active={metric === "minutes"} onClick={() => setMetric("minutes")}>
              Minutes
            </Toggle>
          </div>
        </div>
        <Bars data={weekData} showValues />
      </Card>

      {/* Day of week */}
      <Card>
        <h2 className="mb-3 font-semibold">When you train</h2>
        <Bars data={stats.dow.map((d) => ({ label: d.label, value: d.count }))} />
      </Card>

      {/* Program progress */}
      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <h2 className="font-semibold">12-week program</h2>
          <span className="text-muted tnum">
            {programDone}/{programTotal} · {programPct}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand" style={{ width: `${programPct}%` }} />
        </div>
      </Card>

      {/* Export */}
      <Card>
        <h2 className="font-semibold">Export your data</h2>
        <p className="mt-1 text-sm text-muted">Download your history — it&apos;s yours.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={exportCSV}
            className="flex-1 rounded-2xl bg-surface-2 py-3 font-semibold transition hover:bg-border"
          >
            ⬇ Workouts (CSV)
          </button>
          <button
            onClick={exportJSON}
            className="flex-1 rounded-2xl bg-surface-2 py-3 font-semibold transition hover:bg-border"
          >
            ⬇ Everything (JSON)
          </button>
        </div>
      </Card>
    </div>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <div className="text-2xl font-bold text-brand tnum">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-2xl border border-border bg-surface p-4">{children}</div>;
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 font-medium transition ${
        active ? "bg-brand text-black" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Bars({ data, showValues }: { data: { label: string; value: number }[]; showValues?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-stretch gap-1">
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand/80"
              style={{ height: d.value > 0 ? `${Math.max(4, (d.value / max) * 100)}%` : "2px" }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          {showValues ? (
            <span className="mt-1 h-3 text-[9px] text-muted tnum">{d.value > 0 ? d.value : ""}</span>
          ) : null}
          <span className="mt-0.5 w-full truncate text-center text-[9px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
