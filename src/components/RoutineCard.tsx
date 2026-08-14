import Link from "next/link";
import type { Routine } from "@/lib/types";
import { routineMinutes } from "@/lib/format";

const FOCUS_EMOJI: Record<string, string> = {
  "Full body": "💪",
  Mobility: "🧘",
  "Cardio / HIIT": "🔥",
};

export default function RoutineCard({ routine }: { routine: Routine }) {
  const emoji = FOCUS_EMOJI[routine.focus] ?? "🏋️";
  return (
    <Link
      href={`/app/session/${routine.id}`}
      className="block rounded-2xl border border-border bg-surface p-4 transition active:scale-[0.99] hover:border-brand/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <h3 className="truncate text-lg font-semibold">{routine.name}</h3>
          </div>
          {routine.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{routine.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            {routine.exercises.length} exercises · {routineMinutes(routine)} ·{" "}
            {routine.source === "ai" ? "AI" : routine.source === "seed" ? "Built-in" : "Custom"}
          </p>
        </div>
        <span className="mt-1 shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-black">
          Start
        </span>
      </div>
    </Link>
  );
}
