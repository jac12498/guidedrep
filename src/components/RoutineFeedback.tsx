"use client";

import { useRef, useState } from "react";
import { saveRoutineFeedback } from "@/lib/store";
import type { Routine } from "@/lib/types";

const RATINGS = [
  { key: "too_easy", label: "Too easy", emoji: "😌" },
  { key: "just_right", label: "Just right", emoji: "💪" },
  { key: "too_hard", label: "Too hard", emoji: "🥵" },
];

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

// Optional end-of-workout feedback: a quick rating + a note you can type or
// dictate. Reviewed later to improve the routines/program.
export default function RoutineFeedback({ routine }: { routine: Routine }) {
  const [rating, setRating] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);

  function dictate() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: unknown) => {
      const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      const text = ev.results?.[0]?.[0]?.transcript ?? "";
      if (text) setNote((n) => (n ? n + " " : "") + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  async function submit() {
    if (!rating) return;
    setSaved(true); // optimistic — feedback is best-effort
    await saveRoutineFeedback({
      routineId: routine.id,
      routineName: routine.name,
      rating,
      note: note.trim() || undefined,
    });
  }

  if (saved) {
    return (
      <div className="w-full rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Thanks for the feedback! 🙌
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-4 text-left">
      <p className="text-sm font-semibold">How was that?</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {RATINGS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRating(r.key)}
            className={`rounded-xl border px-2 py-2 text-center text-sm transition ${
              rating === r.key ? "border-brand bg-brand/10" : "border-border bg-surface-2"
            }`}
          >
            <div className="text-lg">{r.emoji}</div>
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anything to add? (optional)"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={dictate}
          aria-label="Dictate a note"
          title="Dictate"
          className={`shrink-0 rounded-xl border px-3 py-2 ${
            listening ? "animate-pulse border-brand text-brand" : "border-border text-muted"
          }`}
        >
          🎙️
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!rating}
        className="mt-3 w-full rounded-2xl bg-brand py-2.5 font-bold text-black disabled:opacity-50"
      >
        Send feedback
      </button>
    </div>
  );
}
