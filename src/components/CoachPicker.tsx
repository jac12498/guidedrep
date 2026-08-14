"use client";

import { COACHES, getCoach } from "@/lib/coaches";
import { speakAs, unlockAudio } from "@/lib/audio";

// Pick a coach persona (voice + personality). The ▶ button previews the coach's
// actual voice + a sample line without changing the current selection.
export default function CoachPicker({
  coachId,
  onChange,
}: {
  coachId: string;
  onChange: (id: string) => void;
}) {
  function preview(id: string) {
    const c = getCoach(id);
    unlockAudio();
    speakAs(`${c.copy.intro} push-ups. ${c.copy.go}`, c.voice);
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Coach</span>
        <span className="text-xs text-muted">tap ▶ to hear</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {COACHES.map((c) => {
          const active = c.id === coachId;
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 ${
                active ? "border-brand bg-brand/10" : "border-border bg-surface"
              }`}
            >
              <button
                onClick={() => onChange(c.id)}
                className="min-w-0 flex-1 text-left"
                aria-pressed={active}
              >
                <div className="flex items-center gap-1.5">
                  <span aria-hidden>{c.emoji}</span>
                  <span className="font-semibold">{c.name}</span>
                  {active ? <span className="text-xs text-brand">✓</span> : null}
                </div>
                <div className="truncate text-xs text-muted">{c.blurb}</div>
              </button>
              <button
                onClick={() => preview(c.id)}
                aria-label={`Hear ${c.name}`}
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm active:scale-95"
              >
                ▶
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
