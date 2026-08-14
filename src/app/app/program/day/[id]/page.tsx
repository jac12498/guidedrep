"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { getDay } from "@/lib/program";
import { buildBlockRoutine } from "@/lib/programPlan";
import { getActiveProgramBlock, markProgramBlockDayComplete } from "@/lib/store";
import Player from "@/components/Player";

export default function ProgramDayPage() {
  const params = useParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);

  useEffect(() => {
    const day = getDay(params.id);
    if (!day) {
      setRoutine(null);
      return;
    }
    getActiveProgramBlock().then((block) => {
      setRoutine(block ? buildBlockRoutine(day, block.plan) : null);
    });
  }, [params.id]);

  if (routine === undefined) {
    return <p className="pt-20 text-center text-muted">Loading…</p>;
  }
  if (routine === null) {
    return (
      <div className="pt-20 text-center">
        <p className="text-muted">This program day isn&apos;t available.</p>
        <Link href="/app/program" className="mt-4 inline-block text-brand">
          ← Back to Program
        </Link>
      </div>
    );
  }
  return (
    <Player routine={routine} programDayId={params.id} onProgramComplete={markProgramBlockDayComplete} />
  );
}
