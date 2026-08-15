"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FitnessQuestionnaire from "@/components/FitnessQuestionnaire";
import GenerationLoader from "@/components/GenerationLoader";
import { updateFitnessProfile } from "./actions";
import { supabaseConfigured } from "@/lib/supabase/config";
import { aiToRoutine, type AIRoutine } from "@/lib/aiRoutine";
import { saveRoutine } from "@/lib/store";
import type { FitnessProfile } from "@/lib/fitness";

export default function PersonalizeClient({ initial }: { initial?: Partial<FitnessProfile> }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(profile: FitnessProfile) {
    setWorking(true);
    setError(null);

    if (supabaseConfigured) {
      const res = await updateFitnessProfile(profile);
      if (res.error) {
        setError(res.error);
        setWorking(false);
        return;
      }
    }

    try {
      const r = await fetch("/api/onboarding/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Couldn't generate routines.");
      }
      const { routines } = (await r.json()) as { routines: AIRoutine[] };
      const now = Date.now();
      await Promise.all((routines ?? []).map((ai) => saveRoutine(aiToRoutine(ai, now))));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate routines.");
      setWorking(false);
      return;
    }

    router.push("/app/routines");
  }

  if (working) {
    return (
      <GenerationLoader
        variant="routine"
        title="Building your routines…"
        subtitle="Tailoring a fresh set to your answers. This takes a few seconds."
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Refresh your routines</h1>
      <p className="mb-6 text-sm text-muted">
        Update your answers and we&apos;ll add three fresh routines built for you.
      </p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <FitnessQuestionnaire
        initial={initial}
        submitLabel="Generate new routines"
        submitting={working}
        onSubmit={submit}
      />
    </div>
  );
}
