"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { getRoutine } from "@/lib/store";
import Player from "@/components/Player";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);

  useEffect(() => {
    getRoutine(params.id).then((r) => setRoutine(r ?? null));
  }, [params.id]);

  if (routine === undefined) {
    return <p className="pt-20 text-center text-muted">Loading…</p>;
  }
  if (routine === null) {
    return (
      <div className="pt-20 text-center">
        <p className="text-muted">That routine no longer exists.</p>
        <Link href="/app" className="mt-4 inline-block text-brand">
          ← Back to Today
        </Link>
      </div>
    );
  }
  return <Player routine={routine} />;
}
