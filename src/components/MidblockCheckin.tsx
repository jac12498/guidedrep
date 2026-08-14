"use client";

import { useState } from "react";
import GenerationLoader from "@/components/GenerationLoader";
import { recordMidblock } from "@/lib/store";
import type { MidblockCheckin, ProgramBlock, ProgramPlan } from "@/lib/programPlan";

const OPTIONS: Array<{ label: string; direction: "easier" | "harder" | null; hint: string }> = [
  { label: "Too easy", direction: "harder", hint: "we'll make it harder" },
  { label: "About right", direction: null, hint: "keep it as planned" },
  { label: "Too hard", direction: "easier", hint: "we'll ease it back" },
];

// Mid-block check-in (~week 3-4). "About right" just records; too easy/hard
// re-tunes the remaining phases via the AI. Calls onDone to refresh the parent.
export default function MidblockCheckinCard({
  block,
  onDone,
}: {
  block: ProgramBlock;
  onDone: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const opt = OPTIONS.find((o) => o.label === choice);
    if (!opt) return;
    setWorking(true);
    setError(null);
    const base: MidblockCheckin = {
      at: Date.now(),
      feedback: opt.label,
      note: note.trim() || undefined,
      adjusted: false,
    };

    // "About right", or no source answers to adapt from → just record, no AI call.
    if (!opt.direction || !block.sourceAnswers) {
      await recordMidblock(base);
      onDone();
      return;
    }

    try {
      const r = await fetch("/api/program/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: block.sourceAnswers,
          plan: block.plan,
          direction: opt.direction,
          note: note.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Couldn't adjust your program.");
      }
      const { plan } = (await r.json()) as { plan: ProgramPlan };
      await recordMidblock({ ...base, adjusted: true }, plan);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't adjust your program.");
      setWorking(false);
    }
  }

  async function skip() {
    setWorking(true);
    await recordMidblock({ at: Date.now(), feedback: "Skipped", adjusted: false });
    onDone();
  }

  if (working) {
    return (
      <div className="mb-5 rounded-2xl border border-brand/50 bg-surface p-4">
        <GenerationLoader
          variant="program"
          title="Fine-tuning the weeks ahead…"
          subtitle="Re-tuning Build, Develop, and Strengthen."
          compact
        />
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-brand/50 bg-surface p-4">
      <p className="text-xs uppercase tracking-widest text-brand">Check-in</p>
      <h2 className="mt-1 text-lg font-bold">How are the first 3 weeks feeling?</h2>
      <p className="mt-1 text-sm text-muted">
        We&apos;ll tune the rest of your program to match.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.label}
            onClick={() => setChoice(o.label)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left font-medium ${
              choice === o.label ? "border-brand bg-brand/10" : "border-border bg-surface-2"
            }`}
          >
            <span>{o.label}</span>
            <span className="text-xs text-muted">{o.hint}</span>
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything specific? (optional) — e.g. lunges bothered my knee"
        rows={2}
        className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!choice}
          className="flex-1 rounded-2xl bg-brand py-3 font-bold text-black disabled:opacity-50"
        >
          Save &amp; continue
        </button>
        <button onClick={skip} className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Skip
        </button>
      </div>
    </div>
  );
}
