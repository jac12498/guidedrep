"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROGRAM } from "@/lib/program";

// A "your plan is being built" loader shown during AI generation. The program
// variant fills a 12-week calendar cell-by-cell; the routine variant reveals an
// exercise list row-by-row. Both rotate step messages and ease a progress bar
// toward ~94% (never a fake 100%) so a 20-50s wait feels productive, not stuck.

const PROGRAM_MESSAGES = [
  "Reading your capability check…",
  "Calibrating your Foundation phase…",
  "Choosing your movement variations…",
  "Laying out three sessions a week…",
  "Progressing Build, Develop, Strengthen…",
  "Adding warm-ups and stretches…",
  "Finishing touches…",
];
const ROUTINE_MESSAGES = [
  "Reading your answers…",
  "Picking the right movements…",
  "Setting your pace and reps…",
  "Adding a warm-up and cool-down…",
  "Finishing touches…",
];

const KIND_COLOR: Record<string, string> = {
  strength: "var(--brand)",
  walk: "color-mix(in srgb, var(--brand) 45%, transparent)",
  rest: "var(--border)",
};

const CAP = 0.94;

export default function GenerationLoader({
  variant,
  title,
  subtitle,
  estimateSec = variant === "program" ? 50 : 22,
  compact = false,
}: {
  variant: "program" | "routine";
  title: string;
  subtitle?: string;
  estimateSec?: number;
  /** Fit inside a card (no full-viewport height). */
  compact?: boolean;
}) {
  const messages = variant === "program" ? PROGRAM_MESSAGES : ROUTINE_MESSAGES;
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const tau = estimateSec / 3; // time constant for the eased approach to CAP
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const e = (t - startRef.current) / 1000;
      setElapsed(e);
      setProgress(CAP * (1 - Math.exp(-e / tau)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [estimateSec]);

  const msgIndex = Math.min(
    messages.length - 1,
    Math.floor(elapsed / (estimateSec / messages.length)),
  );

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 px-2 text-center ${
        compact ? "py-4" : "min-h-[70dvh] gap-7 px-5"
      }`}
    >
      <div>
        <p className="text-lg font-semibold">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>

      {variant === "program" ? (
        <CalendarBuild progress={progress} />
      ) : (
        <RoutineBuild progress={progress} />
      )}

      <div className="w-full max-w-xs">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {messages[msgIndex]}
        </p>
      </div>
    </div>
  );
}

function CalendarBuild({ progress }: { progress: number }) {
  const cells = useMemo(() => PROGRAM.flatMap((w) => w.days.map((d) => d.kind)), []);
  const filled = Math.round((progress / CAP) * cells.length);
  return (
    <div
      className="grid grid-cols-7 gap-1"
      aria-hidden
      style={{ width: "min(280px, 80vw)" }}
    >
      {cells.map((kind, i) => {
        const on = i < filled;
        return (
          <div
            key={i}
            className="aspect-square rounded-[3px] transition-colors duration-300"
            style={{
              backgroundColor: on ? KIND_COLOR[kind] : "var(--surface-2)",
              opacity: on ? 1 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

function RoutineBuild({ progress }: { progress: number }) {
  const ROWS = 6;
  const shown = Math.min(ROWS, Math.ceil((progress / CAP) * ROWS));
  return (
    <div className="w-full max-w-xs space-y-2" aria-hidden>
      {Array.from({ length: ROWS }).map((_, i) => {
        const on = i < shown;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-500 ${
              on ? "translate-y-0 border-border bg-surface opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            <div className="h-6 w-6 shrink-0 rounded-full bg-brand/30" />
            <div className={`h-3 flex-1 rounded bg-surface-2 ${i === shown - 1 ? "animate-pulse" : ""}`} />
            <div className="h-3 w-8 rounded bg-surface-2" />
          </div>
        );
      })}
    </div>
  );
}
