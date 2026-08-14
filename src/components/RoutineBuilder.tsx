"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Exercise, ExerciseType, Routine } from "@/lib/types";
import { newId, saveRoutine } from "@/lib/store";
import { mmss, routineDuration } from "@/lib/format";

const FOCUS_OPTIONS = ["Full body", "Strength", "Mobility", "Cardio / HIIT"];
const TYPE_OPTIONS: ExerciseType[] = ["strength", "cardio", "mobility"];

interface Row {
  key: string;
  name: string;
  type: ExerciseType;
  mode: "time" | "reps";
  durationSec: number;
  reps: number;
  restSec: number;
  cue: string;
}

function blankRow(): Row {
  return {
    key: newId(),
    name: "",
    type: "strength",
    mode: "reps",
    durationSec: 30,
    reps: 10,
    restSec: 20,
    cue: "",
  };
}

// A Row → the timed Exercise the coach runs. Reps mode gets a time box (~3s/rep)
// so the hands-free timer can auto-advance, matching the AI generator's shape.
function toExercise(r: Row): Exercise {
  const reps = r.mode === "reps" ? Math.max(1, Math.round(r.reps)) : undefined;
  const durationSec =
    r.mode === "reps" ? Math.max(6, (reps ?? 1) * 3) : Math.max(5, Math.round(r.durationSec));
  return {
    id: newId(),
    name: r.name.trim(),
    type: r.type,
    mode: r.mode,
    durationSec,
    reps,
    restSec: Math.max(0, Math.round(r.restSec)),
    cue: r.cue.trim() || undefined,
  };
}

export default function RoutineBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [focus, setFocus] = useState(FOCUS_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }
  function move(key: string, dir: -1 | 1) {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const named = rows.filter((r) => r.name.trim());
  const preview: Routine = {
    id: "preview",
    name: name || "Custom routine",
    focus,
    createdAt: 0,
    source: "custom",
    exercises: named.map(toExercise),
  };
  const totalLabel = named.length ? mmss(routineDuration(preview)) : "0:00";

  async function save(startNow: boolean) {
    setError(null);
    if (!name.trim()) return setError("Give your routine a name.");
    if (named.length === 0) return setError("Add at least one exercise with a name.");
    setSaving(true);
    try {
      const routine: Routine = {
        id: newId(),
        name: name.trim(),
        focus,
        description: description.trim() || undefined,
        createdAt: Date.now(),
        source: "custom",
        exercises: named.map(toExercise),
      };
      const stored = await saveRoutine(routine);
      router.push(startNow ? `/app/session/${stored.id}` : "/app/routines");
    } catch {
      setError("Couldn't save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Build a routine</h1>
      <p className="mb-5 text-sm text-muted">
        Add your moves and the coach will time you through them hands-free.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Core Circuit"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Focus</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFocus(f)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  focus === f ? "bg-brand text-black" : "bg-surface-2 text-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One line about this routine"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="font-semibold">
          Exercises <span className="text-muted">· {totalLabel}</span>
        </h2>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.key} className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted tnum">{i + 1}</span>
              <input
                value={r.name}
                onChange={(e) => update(r.key, { name: e.target.value })}
                placeholder="Exercise name"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                onClick={() => move(r.key, -1)}
                disabled={i === 0}
                className="px-1.5 text-muted disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => move(r.key, 1)}
                disabled={i === rows.length - 1}
                className="px-1.5 text-muted disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => remove(r.key)}
                className="px-1.5 text-red-400"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <select
                value={r.type}
                onChange={(e) => update(r.key, { type: e.target.value as ExerciseType })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 capitalize outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div className="flex overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => update(r.key, { mode: "reps" })}
                  className={`px-3 py-1.5 ${r.mode === "reps" ? "bg-brand text-black" : "bg-background text-muted"}`}
                >
                  Reps
                </button>
                <button
                  onClick={() => update(r.key, { mode: "time" })}
                  className={`px-3 py-1.5 ${r.mode === "time" ? "bg-brand text-black" : "bg-background text-muted"}`}
                >
                  Time
                </button>
              </div>

              {r.mode === "reps" ? (
                <NumField
                  label="reps"
                  value={r.reps}
                  min={1}
                  onChange={(v) => update(r.key, { reps: v })}
                />
              ) : (
                <NumField
                  label="sec"
                  value={r.durationSec}
                  min={5}
                  step={5}
                  onChange={(v) => update(r.key, { durationSec: v })}
                />
              )}

              <NumField
                label="rest s"
                value={r.restSec}
                min={0}
                step={5}
                onChange={(v) => update(r.key, { restSec: v })}
              />
            </div>

            <input
              value={r.cue}
              onChange={(e) => update(r.key, { cue: e.target.value })}
              placeholder="Form cue (optional), e.g. keep your back flat"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => setRows((rs) => [...rs, blankRow()])}
        className="mt-3 w-full rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted hover:border-brand/60 hover:text-foreground"
      >
        + Add exercise
      </button>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="w-full rounded-2xl bg-brand py-3.5 font-bold text-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save & start"}
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="w-full rounded-2xl bg-surface-2 py-3 font-semibold disabled:opacity-60"
        >
          Save for later
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  min,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1">
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 bg-transparent text-center outline-none tnum"
      />
      <span className="text-xs text-muted">{label}</span>
    </label>
  );
}
