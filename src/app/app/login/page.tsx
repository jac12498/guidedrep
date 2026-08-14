"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import BrandMark from "@/components/BrandMark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setPhase("code");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't send the code.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      // Return to where they were headed (e.g. /app/go-pro), else the app home.
      // Only same-app relative paths are honored, to avoid open redirects.
      const next = new URLSearchParams(window.location.search).get("next");
      const dest = next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";
      // Hard navigation so the server (middleware) sees the new session cookie.
      window.location.assign(dest);
    } catch {
      setMessage("That code didn't work. Double-check it and try again.");
      setVerifying(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
      <div>
        <BrandMark className="mx-auto h-14 w-14" />
        <h1 className="mt-2 text-2xl font-bold">Guided Reps</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in or create your account. New here? We&apos;ll set you up after you confirm your
          email.
        </p>
      </div>

      {!supabaseConfigured ? (
        <div className="max-w-xs rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
          Cloud accounts aren&apos;t configured yet. Add your Supabase keys to
          <code className="mx-1 rounded bg-surface-2 px-1">.env.local</code> to enable sign-in.
          Until then the app runs locally without an account.
        </div>
      ) : phase === "email" ? (
        <form onSubmit={sendCode} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-2xl bg-brand py-3.5 font-bold text-black disabled:opacity-60"
          >
            {sending ? "Sending…" : "Email me a sign-in code"}
          </button>
          {message ? <p className="text-sm text-red-400">{message}</p> : null}
          <p className="text-xs text-muted">No password — we email you a sign-in code.</p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex w-full max-w-xs flex-col gap-3">
          <div className="rounded-2xl border border-brand/40 bg-surface p-4 text-sm text-muted">
            📧 We emailed a sign-in code to{" "}
            <span className="text-foreground">{email}</span>. Enter it here to stay in this window.
          </div>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter code"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-xl tracking-[0.3em] tnum outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={verifying || code.length < 6}
            className="w-full rounded-2xl bg-brand py-3.5 font-bold text-black disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify & continue"}
          </button>
          {message ? <p className="text-sm text-red-400">{message}</p> : null}
          <p className="text-xs text-muted">
            The email also has a magic link — but on this device, entering the code keeps you right
            here.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("email");
              setCode("");
              setMessage("");
            }}
            className="text-xs text-muted underline"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
