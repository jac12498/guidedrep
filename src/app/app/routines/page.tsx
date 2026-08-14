"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { deleteRoutine, getRoutines } from "@/lib/store";
import { routineMinutes, targetLabel } from "@/lib/format";

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getRoutines().then(setRoutines);
  }, []);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await deleteRoutine(id);
    setRoutines(await getRoutines());
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routines</h1>
        <div className="flex gap-2">
          <Link
            href="/app/routines/new"
            className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-bold"
          >
            ✎ Build
          </Link>
          <Link
            href="/app/personalize"
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-black"
          >
            ✨ Refresh
          </Link>
        </div>
      </div>

      {routines === null ? (
        <p className="text-muted">Loading…</p>
      ) : routines.length === 0 ? (
        <p className="text-muted">No routines yet.</p>
      ) : (
        <div className="space-y-3">
          {routines.map((r) => {
            const open = expanded === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpanded(open ? null : r.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h3 className="truncate text-lg font-semibold">{r.name}</h3>
                    <p className="text-xs text-muted">
                      {r.exercises.length} exercises · {routineMinutes(r)} ·{" "}
                      {r.source === "ai" ? "AI" : r.source === "seed" ? "Built-in" : "Custom"}
                    </p>
                  </button>
                  <Link
                    href={`/app/session/${r.id}`}
                    className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-black"
                  >
                    Start
                  </Link>
                </div>

                {open ? (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <ol className="space-y-1 text-sm">
                      {r.exercises.map((e, i) => (
                        <li key={e.id} className="flex justify-between py-1">
                          <span>
                            <span className="mr-2 text-muted/60">{i + 1}.</span>
                            {e.name}
                            {e.cue ? <span className="ml-1 text-muted"> — {e.cue}</span> : null}
                          </span>
                          <span className="tnum shrink-0 text-muted">{targetLabel(e)}</span>
                        </li>
                      ))}
                    </ol>
                    {r.source !== "seed" ? (
                      <button
                        onClick={() => remove(r.id, r.name)}
                        className="mt-3 text-sm text-red-400 hover:text-red-300"
                      >
                        Delete routine
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
