"use client";

// Hands-free voice control via the Web Speech API (best-effort: Chrome/Edge and
// recent Safari, needs mic permission and a network connection). It ignores audio
// while the coach itself is speaking, so the coach's "Next up…" can't trigger a
// command.

import { useEffect, useRef, useState } from "react";

export type VoiceCommand =
  | "pause"
  | "resume"
  | "start"
  | "skip"
  | "back"
  | "restart"
  | "instructions";

function matchCommand(t: string): VoiceCommand | null {
  if (/\b(pause|hold on|wait|stop)\b/.test(t)) return "pause";
  if (/\b(resume|continue|unpause|keep going|carry on|play)\b/.test(t)) return "resume";
  if (/\b(ready|start|begin|lets go|let's go)\b/.test(t)) return "start";
  if (/\b(next|skip|move on)\b/.test(t)) return "skip";
  if (/\b(back|previous|go back)\b/.test(t)) return "back";
  if (/\b(restart|redo|again|repeat)\b/.test(t)) return "restart";
  if (/\b(instructions?|how (do|to)|explain|help|show me)\b/.test(t)) return "instructions";
  return null;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

export function useVoiceCommands(
  enabled: boolean,
  onCommand: (c: VoiceCommand) => void,
): { supported: boolean; listening: boolean; error: string | null } {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cmdRef = useRef(onCommand);
  cmdRef.current = onCommand;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const lastFireRef = useRef<{ cmd: VoiceCommand | null; at: number }>({ cmd: null, at: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!Ctor) return;

    if (!enabled) {
      recRef.current?.abort();
      recRef.current = null;
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: unknown) => {
      // Ignore anything picked up while the coach is speaking (avoids self-triggering).
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return;
      const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      const results = ev.results;
      const last = results[results.length - 1];
      if (!last) return;
      const text = (last[0]?.transcript || "").toLowerCase().trim();
      const cmd = matchCommand(text);
      if (!cmd) return;
      const now = Date.now();
      // Debounce: same command must be ~1.5s apart.
      if (lastFireRef.current.cmd === cmd && now - lastFireRef.current.at < 1500) return;
      lastFireRef.current = { cmd, at: now };
      cmdRef.current(cmd);
    };

    rec.onerror = (e: unknown) => {
      const err = (e as { error?: string }).error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("Microphone permission denied.");
        enabledRef.current = false;
      } else if (err === "no-speech" || err === "aborted") {
        // benign — the onend handler will restart
      } else if (err) {
        setError(err);
      }
    };

    rec.onend = () => {
      setListening(false);
      // Auto-restart while still enabled (recognition stops itself after pauses).
      if (enabledRef.current && recRef.current === rec) {
        try {
          rec.start();
          setListening(true);
        } catch {
          /* start() throws if already started — ignore */
        }
      }
    };

    recRef.current = rec;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      /* ignore */
    }

    return () => {
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      if (recRef.current === rec) recRef.current = null;
    };
  }, [enabled]);

  return { supported, listening, error };
}
