"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FitnessQuestionnaire from "@/components/FitnessQuestionnaire";
import GenerationLoader from "@/components/GenerationLoader";
import { updateFitnessProfile } from "@/app/app/personalize/actions";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getActiveProgramBlock, saveProgramBlock } from "@/lib/store";
import type { FitnessProfile } from "@/lib/fitness";
import type { ProgramPlan } from "@/lib/programPlan";

export default function ProgramSetupClient({ initial }: { initial?: Partial<FitnessProfile> }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 1 for a first program; higher when rebuilding after finishing a block.
  const [nextBlock, setNextBlock] = useState(1);

  useEffect(() => {
    getActiveProgramBlock().then((b) => setNextBlock((b?.blockNumber ?? 0) + 1));
  }, []);
  const isRebuild = nextBlock > 1;

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
      const r = await fetch("/api/program/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, blockNumber: nextBlock }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Couldn't build your program.");
      }
      const { plan } = (await r.json()) as { plan: ProgramPlan };
      await saveProgramBlock(plan, profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build your program.");
      setWorking(false);
      return;
    }

    router.push("/app/program");
  }

  if (working) {
    return (
      <GenerationLoader
        variant="program"
        title={isRebuild ? "Building your next 12 weeks…" : "Building your 12-week program…"}
        subtitle="Calibrating each phase to you. This takes about a minute — hang tight."
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {isRebuild ? `Build block ${nextBlock} — your next 12 weeks` : "Build your 12-week program"}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {isRebuild
          ? "You finished a block — nice work. A quick re-check of where you are now, and we'll build a harder 12 weeks that picks up where you left off."
          : "A few more questions so we calibrate where you start and how it progresses."}
      </p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <FitnessQuestionnaire
        initial={initial}
        showProgram
        submitLabel={isRebuild ? "Build my next block" : "Build my program"}
        onSubmit={submit}
      />
    </div>
  );
}
