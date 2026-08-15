"use client";

import { useEffect, useState } from "react";
import { completeOnboarding } from "@/app/app/onboarding/actions";
import { DISCLAIMER_ACK, DISCLAIMER_PARAGRAPHS, DISCLAIMER_TITLE } from "@/lib/disclaimer";
import FitnessQuestionnaire from "@/components/FitnessQuestionnaire";
import GenerationLoader from "@/components/GenerationLoader";
import CoachPicker from "@/components/CoachPicker";
import { aiToRoutine, type AIRoutine } from "@/lib/aiRoutine";
import { getSettings, saveRoutine, saveSettings } from "@/lib/store";
import { setCoachVoice } from "@/lib/audio";
import { getCoach } from "@/lib/coaches";
import {
  clearPendingOnboarding,
  getPendingOnboarding,
  type PendingOnboarding,
} from "@/lib/pendingOnboarding";
import type { FitnessProfile } from "@/lib/fitness";

type Step = "basics" | "questionnaire" | "generating";

export default function OnboardingForm({
  email,
  initialName,
}: {
  email: string;
  initialName: string;
}) {
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState(initialName);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Answers (and maybe routines) carried over from the pre-signup /start quiz.
  const [pending, setPending] = useState<PendingOnboarding | null>(null);
  const [coachId, setCoachId] = useState("sam");

  useEffect(() => {
    setPending(getPendingOnboarding());
    const s = getSettings();
    setCoachId(s.coachId);
    setCoachVoice(getCoach(s.coachId).voice);
  }, []);

  function chooseCoach(id: string) {
    setCoachId(id);
    saveSettings({ ...getSettings(), coachId: id });
    setCoachVoice(getCoach(id).voice);
  }

  async function finish(profile: FitnessProfile, preRoutines?: AIRoutine[]) {
    setStep("generating");
    setError(null);

    const res = await completeOnboarding({ name, agreed: agree, profile });
    if (res.error) {
      setError(res.error);
      setStep(pending ? "basics" : "questionnaire");
      return;
    }

    // Prefer routines already generated during the quiz (no second AI call).
    try {
      let routines = preRoutines;
      if (!routines?.length) {
        const r = await fetch("/api/onboarding/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        if (r.ok) routines = ((await r.json()) as { routines: AIRoutine[] }).routines;
      }
      if (routines?.length) {
        const now = Date.now();
        await Promise.all(routines.map((ai) => saveRoutine(aiToRoutine(ai, now))));
      }
    } catch {
      // proceed regardless
    }
    clearPendingOnboarding();
    window.location.assign("/app");
  }

  if (step === "generating") {
    return (
      <GenerationLoader
        variant="routine"
        title="Setting up your account…"
        subtitle="Personalizing your starter routines."
      />
    );
  }

  if (step === "questionnaire") {
    return (
      <div className="py-6">
        <h1 className="text-2xl font-bold">Let&apos;s personalize it</h1>
        <p className="mt-1 text-sm text-muted">
          A few quick questions so your coach builds the right routines for you.
        </p>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <div className="mt-6">
          <FitnessQuestionnaire submitLabel="Create my routines" onSubmit={(p) => finish(p)} />
        </div>
        <button
          onClick={() => setStep("basics")}
          className="mt-4 text-sm text-muted underline"
          type="button"
        >
          ← Back
        </button>
      </div>
    );
  }

  // step === "basics"
  return (
    <div className="py-6">
      <p className="text-xs font-medium uppercase tracking-widest text-brand">
        {pending ? "Last step" : "Step 1 of 2"}
      </p>
      <h1 className="mt-1 text-2xl font-bold">Welcome 👋</h1>
      <p className="mt-1 text-sm text-muted">
        {pending
          ? "Confirm your details and we'll save the routines from your quiz."
          : "Just two quick things before we personalize your plan."}
      </p>

      {pending ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-brand/40 bg-surface p-3 text-sm">
          <span className="text-muted">✓ We kept your answers from the quiz.</span>
          <button
            type="button"
            onClick={() => {
              clearPendingOnboarding();
              setPending(null);
            }}
            className="shrink-0 text-brand underline"
          >
            Redo
          </button>
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            value={email}
            readOnly
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-muted"
          />
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="e.g. Alex Rivera"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">Choose your coach</span>
          <p className="mb-2 text-xs text-muted">
            Who talks you through your workouts. Tap ▶ to hear each one — you can change this
            anytime.
          </p>
          <CoachPicker coachId={coachId} onChange={chooseCoach} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">{DISCLAIMER_TITLE}</span>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            {DISCLAIMER_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
          />
          <span className="text-sm">{DISCLAIMER_ACK}</span>
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          onClick={() => {
            setError(null);
            if (pending?.profile) finish(pending.profile, pending.routines);
            else setStep("questionnaire");
          }}
          disabled={!name.trim() || !agree}
          className="w-full rounded-2xl bg-brand py-4 font-bold text-black disabled:opacity-50"
        >
          {pending ? "Agree & finish" : "Agree & continue"}
        </button>
      </div>

      <form action="/auth/signout" method="post" className="mt-4 text-center">
        <button type="submit" className="text-sm text-muted hover:text-foreground">
          Sign out
        </button>
      </form>
    </div>
  );
}
