"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROGRAM, activeDays, phaseFor, type ProgramDay } from "@/lib/program";
import { getActiveProgramBlock, markProgramBlockDaysComplete } from "@/lib/store";
import type { ProgramBlock } from "@/lib/programPlan";
import MidblockCheckinCard from "@/components/MidblockCheckin";

const IS_DEV = process.env.NODE_ENV !== "production";

const KIND_ICON: Record<string, string> = { strength: "💪", walk: "🚶", rest: "🌙" };

export default function ProgramClient() {
  const [block, setBlock] = useState<ProgramBlock | null | undefined>(undefined);
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  const load = useCallback(() => {
    getActiveProgramBlock().then((b) => {
      setBlock(b);
      if (b) {
        const done = new Set(b.completedDays);
        const next = activeDays().find((d) => !done.has(d.id));
        setOpenWeek(next?.week ?? 1);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completedSet = useMemo(() => new Set(block?.completedDays ?? []), [block]);
  const nextDay = useMemo<ProgramDay | undefined>(() => {
    if (!block) return undefined;
    return activeDays().find((d) => !completedSet.has(d.id));
  }, [block, completedSet]);

  // Mid-block check-in: once Foundation (weeks 1-3) is done, before Build, and
  // only if they've actually started and we haven't checked in yet.
  const checkinDue =
    !!block && block.startedAt != null && !block.midblock && !!nextDay && nextDay.week >= 4;

  if (block === undefined) return <p className="pt-20 text-center text-muted">Loading…</p>;

  // No program yet — invite them to build one.
  if (block === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Your 12-week program</h1>
        <p className="mb-6 text-sm text-muted">
          A structured plan, calibrated to where you are today and progressing across four phases.
        </p>
        <div className="rounded-2xl border border-brand/50 bg-surface p-6 text-center">
          <div className="text-4xl">🗓️</div>
          <h2 className="mt-2 text-lg font-bold">Let&apos;s build your program</h2>
          <p className="mt-1 text-sm text-muted">
            A few quick questions — including what you can do right now — and we&apos;ll tailor all
            12 weeks to you.
          </p>
          <Link
            href="/app/program/setup"
            className="mt-5 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-black"
          >
            Build my program
          </Link>
        </div>
      </div>
    );
  }

  const totalActive = activeDays().length;
  const doneCount = block.completedDays.length;
  const pct = Math.round((doneCount / totalActive) * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your 12-week program</h1>
        <Link href="/app/program/setup" className="text-xs text-muted hover:text-foreground">
          Rebuild
        </Link>
      </div>
      {block.plan.summary ? (
        <p className="mb-4 text-sm text-muted">{block.plan.summary}</p>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Progressively harder, not longer. 3 strength days + 3 walks each week.
        </p>
      )}

      {/* progress */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted tnum">
            {doneCount}/{totalActive} sessions · {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* dev-only: fast-forward completion to reach the week-3 check-in */}
      {IS_DEV ? (
        <div className="mb-4 flex gap-2">
          <button
            onClick={async () => {
              await markProgramBlockDaysComplete(
                activeDays().filter((d) => d.week <= 3).map((d) => d.id),
              );
              load();
            }}
            className="flex-1 rounded-xl border border-dashed border-border py-2 text-xs text-muted hover:text-foreground"
          >
            🧪 Dev: complete weeks 1–3
          </button>
          <button
            onClick={async () => {
              await markProgramBlockDaysComplete(activeDays().map((d) => d.id));
              load();
            }}
            className="flex-1 rounded-xl border border-dashed border-border py-2 text-xs text-muted hover:text-foreground"
          >
            🧪 Dev: complete all 12 weeks
          </button>
        </div>
      ) : null}

      {/* mid-block check-in */}
      {checkinDue && block ? <MidblockCheckinCard block={block} onDone={load} /> : null}

      {/* up next */}
      {nextDay ? (
        <Link
          href={`/app/program/day/${nextDay.id}`}
          className="mb-5 block rounded-2xl border border-brand/50 bg-surface p-4 transition active:scale-[0.99]"
        >
          <p className="text-xs uppercase tracking-widest text-brand">
            {block.startedAt ? "Up next" : "Start here"}
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
      ) : (
        <div className="mb-5 rounded-2xl border border-brand/50 bg-surface p-4 text-center">
          <div className="text-3xl">🏆</div>
          <p className="mt-1 font-bold">Program complete — all 12 weeks done!</p>
          <Link href="/app/program/setup" className="mt-2 inline-block text-sm text-brand">
            Build your next 12 weeks →
          </Link>
        </div>
      )}

      {/* weeks */}
      <div className="space-y-2">
        {PROGRAM.map((w) => {
          const open = openWeek === w.week;
          const weekDone = w.days
            .filter((d) => d.kind !== "rest")
            .every((d) => completedSet.has(d.id));
          return (
            <div key={w.week} className="rounded-2xl border border-border bg-surface">
              <button
                onClick={() => setOpenWeek(open ? null : w.week)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <div className="font-semibold">
                    Week {w.week} {weekDone ? "✅" : ""}
                  </div>
                  <div className="text-xs text-muted">
                    {phaseFor(w.week).name} · {w.objective}
                  </div>
                </div>
                <span className="text-muted">{open ? "▾" : "▸"}</span>
              </button>

              {open ? (
                <ul className="border-t border-border/60 px-4 py-2">
                  {w.days.map((d) => {
                    const done = completedSet.has(d.id);
                    const isRest = d.kind === "rest";
                    return (
                      <li key={d.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span>{KIND_ICON[d.kind]}</span>
                            <span className={done ? "text-muted line-through" : ""}>{d.label}</span>
                          </div>
                          {!isRest ? <div className="text-xs text-muted">{d.summary}</div> : null}
                        </div>
                        {isRest ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <Link
                            href={`/app/program/day/${d.id}`}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                              done ? "bg-surface-2 text-muted" : "bg-brand text-black"
                            }`}
                          >
                            {done ? "Redo" : "Start"}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
