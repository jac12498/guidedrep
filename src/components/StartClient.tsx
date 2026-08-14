"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import FitnessQuestionnaire from "@/components/FitnessQuestionnaire";
import GenerationLoader from "@/components/GenerationLoader";
import { aiToRoutine, type AIRoutine } from "@/lib/aiRoutine";
import { routineMinutes, targetLabel } from "@/lib/format";
import { setPendingOnboarding } from "@/lib/pendingOnboarding";
import type { FitnessProfile } from "@/lib/fitness";

type Step = "quiz" | "generating" | "preview" | "error";

export default function StartClient() {
  const [step, setStep] = useState<Step>("quiz");
  const [routines, setRoutines] = useState<AIRoutine[]>([]);

  async function run(profile: FitnessProfile) {
    setStep("generating");
    // Stash answers immediately so signup works even if generation fails.
    setPendingOnboarding({ profile });
    try {
      const r = await fetch("/api/start/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = (await r.json()) as { routines?: AIRoutine[]; error?: string };
      if (!r.ok || !data.routines?.length) {
        setStep("error");
        return;
      }
      setRoutines(data.routines);
      // Carry the answers (not the single preview) — onboarding builds the full set.
      setStep("preview");
    } catch {
      setStep("error");
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-5 pb-16 pt-5">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <BrandMark className="h-7 w-7" />
          <span>Guided Reps</span>
        </Link>
        <Link href="/app/login" className="text-sm text-muted hover:text-foreground">
          Sign in
        </Link>
      </div>

      {step === "quiz" ? (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Free · no card</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Let&apos;s build your routine.</h1>
          <p className="mt-2 text-muted">
            Answer a few quick questions and we&apos;ll create a workout tailored to you — free to
            keep.
          </p>
          <div className="mt-7">
            <FitnessQuestionnaire submitLabel="Build my routine" onSubmit={run} />
          </div>
        </>
      ) : null}

      {step === "generating" ? (
        <GenerationLoader
          variant="routine"
          title="Building your routine…"
          subtitle="Tailoring it to your answers."
        />
      ) : null}

      {step === "preview" && routines.length ? (
        <Preview routines={routines} />
      ) : null}

      {step === "error" ? (
        <div className="pt-8 text-center">
          <div className="text-4xl">💪</div>
          <h1 className="mt-3 text-2xl font-bold">Let&apos;s finish setting you up</h1>
          <p className="mt-2 text-muted">
            Create your free account to save your plan — we&apos;ll get your routines ready inside.
          </p>
          <Link
            href="/app/login"
            className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3.5 font-bold text-black"
          >
            Create my free account
          </Link>
          <div>
            <button
              onClick={() => setStep("quiz")}
              className="mt-4 text-sm text-muted underline"
              type="button"
            >
              ← Change my answers
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Preview({ routines }: { routines: AIRoutine[] }) {
  const primary = aiToRoutine(routines[0], 0);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Your routine is ready</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
        Here&apos;s one built for you.
      </h1>
      <p className="mt-1 text-sm text-muted">
        Create your free account to save it and have the coach walk you through it, hands-free.
      </p>

      <div className="mt-5 rounded-2xl border border-brand/40 bg-surface p-4">
        <h2 className="text-lg font-bold">{primary.name}</h2>
        <p className="text-sm text-muted">
          {primary.exercises.length} exercises · {routineMinutes(primary)} · {primary.focus}
        </p>
        {primary.description ? (
          <p className="mt-1 text-sm text-muted">{primary.description}</p>
        ) : null}
        <ol className="mt-3 space-y-1 text-sm">
          {primary.exercises.map((e, i) => (
            <li key={e.id} className="flex justify-between border-b border-border/60 py-1.5">
              <span>
                <span className="mr-2 text-muted/60">{i + 1}.</span>
                {e.name}
              </span>
              <span className="tnum text-muted">{targetLabel(e)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        <span className="font-semibold text-foreground">Create your free account</span> and
        we&apos;ll set up your full set of tailored routines to choose from.
      </div>

      <Link
        href="/app/login"
        className="mt-5 block rounded-2xl bg-brand py-4 text-center font-bold text-black transition hover:brightness-110"
      >
        Create my free account & save this
      </Link>
      <p className="mt-2 text-center text-xs text-muted">
        Free forever · no card. You&apos;ll agree to a short safety disclaimer — this isn&apos;t
        medical advice.
      </p>
    </div>
  );
}
