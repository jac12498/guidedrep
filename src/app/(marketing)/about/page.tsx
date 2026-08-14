import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Guided Reps exists: a hands-free coach that removes every reason not to work out today.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-4xl font-extrabold tracking-tight">About {SITE.name}</h1>
      <p className="mt-4 text-lg text-muted">{SITE.tagline}</p>

      <div className="mt-10 space-y-6 text-foreground/90">
        <p>
          Most workout apps are built to be watched. You end up tapping through screens, squinting
          at a timer, and losing your place the moment you pick up a weight. {SITE.name} started
          from a simple frustration: a workout should be something you <em>listen to</em>, not
          something you babysit.
        </p>
        <p>
          So the whole app is designed to be used with the phone across the room and your hands
          full. Spoken cues call every set, rep, and rest. Beeps mark the transitions. Optional
          voice commands let you pause, resume, and skip without touching anything. And because it
          installs to your home screen and works offline, it&apos;s there whether you&apos;re in a
          garage gym or a hotel room.
        </p>
        <p>
          Underneath the hands-free coach is a real, progressive 12-week program — three strength
          days and three walks a week, built to get harder without getting longer. When you want
          something different, AI drafts a complete routine around your time, focus, and equipment
          in seconds.
        </p>
        <p>
          {SITE.name} is built by {SITE.builtBy}. It began as one person&apos;s daily-use tool and
          grew into something worth sharing. The goal is unchanged: remove every reason not to work
          out today, and then get out of the way.
        </p>
      </div>

      <div className="mt-12 rounded-3xl border border-border bg-surface p-8 text-center">
        <h2 className="text-xl font-bold">Give it a try — it&apos;s free.</h2>
        <p className="mt-2 text-sm text-muted">
          The full program and the hands-free coach cost nothing.
        </p>
        <Link
          href={SITE.appHref}
          className="mt-5 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-black transition hover:brightness-110"
        >
          Open the app
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Questions or feedback?{" "}
        <a href={`mailto:${SITE.email}`} className="text-brand hover:underline">
          {SITE.email}
        </a>
      </p>
    </div>
  );
}
