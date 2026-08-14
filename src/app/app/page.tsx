"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { currentStreak, getActiveProgramBlock, getRoutines, getSessions } from "@/lib/store";
import { activeDays, type ProgramDay } from "@/lib/program";
import RoutineCard from "@/components/RoutineCard";

const KIND_ICON: Record<string, string> = { strength: "💪", walk: "🚶", rest: "🌙" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [didToday, setDidToday] = useState(false);
  const [nextDay, setNextDay] = useState<ProgramDay | null | undefined>(undefined);
  const [programStarted, setProgramStarted] = useState(false);
  const [hasBlock, setHasBlock] = useState(false);
  const [checkinDue, setCheckinDue] = useState(false);
  const [programLoaded, setProgramLoaded] = useState(false);
  // Computed after mount so SSR and client agree (time-of-day differs otherwise).
  const [greetingText, setGreetingText] = useState("Hello");

  useEffect(() => {
    setGreetingText(greeting());
    (async () => {
      const [routinesData, sessions, block] = await Promise.all([
        getRoutines(),
        getSessions(),
        getActiveProgramBlock(),
      ]);
      setRoutines(routinesData);
      setStreak(currentStreak(sessions));
      const today = new Date().toDateString();
      setDidToday(sessions.some((s) => new Date(s.date).toDateString() === today));
      if (block) {
        setHasBlock(true);
        setProgramStarted(block.startedAt != null);
        const done = new Set(block.completedDays);
        const nd = activeDays().find((d) => !done.has(d.id)) ?? null;
        setNextDay(nd);
        setCheckinDue(block.startedAt != null && !block.midblock && !!nd && nd.week >= 4);
      } else {
        setHasBlock(false);
        setNextDay(null);
        setCheckinDue(false);
      }
      setProgramLoaded(true);
    })();
  }, []);

  return (
    <div>
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">{greetingText} 👋</p>
            <h1 className="text-2xl font-bold">Let&apos;s move.</h1>
          </div>
          <Link
            href="/app/account"
            aria-label="Account"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-lg"
          >
            👤
          </Link>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl border border-border bg-surface p-3">
            <div className="text-2xl font-bold text-brand tnum">{streak}</div>
            <div className="text-xs text-muted">day streak</div>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-surface p-3">
            <div className="text-2xl">{didToday ? "✅" : "⬜"}</div>
            <div className="text-xs text-muted">
              {didToday ? "done today" : "not yet today"}
            </div>
          </div>
        </div>
      </header>

      {programLoaded && hasBlock && checkinDue ? (
        <Link
          href="/app/program"
          className="mb-6 block rounded-2xl border border-brand/50 bg-surface p-4 transition active:scale-[0.99]"
        >
          <p className="text-xs uppercase tracking-widest text-brand">Program check-in</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">🗓️ How are the first 3 weeks?</h2>
              <p className="text-sm text-muted">A quick check so we can tune the weeks ahead.</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-black">
              Check in
            </span>
          </div>
        </Link>
      ) : null}

      {programLoaded && hasBlock && nextDay ? (
        <Link
          href={`/app/program/day/${nextDay.id}`}
          className="mb-6 block rounded-2xl border border-brand/50 bg-surface p-4 transition active:scale-[0.99]"
        >
          <p className="text-xs uppercase tracking-widest text-brand">
            {programStarted ? "12-week program · up next" : "Start your 12-week program"}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">
                {KIND_ICON[nextDay.kind]} Week {nextDay.week} · {nextDay.label.split(" · ")[0]}
              </h2>
              <p className="text-sm text-muted">{nextDay.summary}</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-black">
              Start
            </span>
          </div>
        </Link>
      ) : programLoaded && hasBlock && nextDay === null ? (
        <Link
          href="/app/program"
          className="mb-6 block rounded-2xl border border-brand/50 bg-surface p-4 text-center"
        >
          <span className="text-2xl">🏆</span>{" "}
          <span className="font-bold">12-week program complete!</span>
        </Link>
      ) : programLoaded && !hasBlock ? (
        <Link
          href="/app/program"
          className="mb-6 block rounded-2xl border border-brand/50 bg-surface p-4 transition active:scale-[0.99]"
        >
          <p className="text-xs uppercase tracking-widest text-brand">Your 12-week program</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">🗓️ Build your program</h2>
              <p className="text-sm text-muted">Personalized and calibrated to where you are today.</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-black">
              Start
            </span>
          </div>
        </Link>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Or pick a routine</h2>
        <Link href="/app/personalize" className="text-sm font-medium text-brand">
          ✨ New routines
        </Link>
      </div>

      {routines === null ? (
        <p className="text-muted">Loading…</p>
      ) : routines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          No routines yet.
          <br />
          <Link href="/app/personalize" className="mt-2 inline-block text-brand">
            Personalize your routines →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((r) => (
            <RoutineCard key={r.id} routine={r} />
          ))}
        </div>
      )}
    </div>
  );
}
