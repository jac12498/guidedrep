import Link from "next/link";
import PricingCards from "@/components/marketing/PricingCards";
import { FAQS, FEATURES, SITE, STEPS, proPurchaseEnabled } from "@/lib/site";

export default function LandingPage() {
  const proOn = proPurchaseEnabled();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0) 70%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
              🎧 Hands-free · installable · works offline
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {SITE.tagline}
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">{SITE.subtagline}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={SITE.startHref}
                className="rounded-2xl bg-brand px-6 py-3.5 font-bold text-black transition hover:brightness-110"
              >
                Start free
              </Link>
              <Link
                href="/#how"
                className="rounded-2xl border border-border bg-surface px-6 py-3.5 font-semibold transition hover:border-brand/60"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted">
              No credit card. Free forever plan. Upgrade any time.
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Social proof / value strip */}
      <section className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 text-center sm:grid-cols-4">
          <Stat big="12 wks" small="personalized program" />
          <Stat big="100%" small="hands-free" />
          <Stat big="0" small="equipment needed" />
          <Stat big="Adapts" small="to your progress" />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <SectionHead
          kicker="How it works"
          title="Three moving parts. You only do one of them."
          sub="Guided Reps handles the counting, cueing, and tracking. You just move."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-border bg-surface p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-black">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead
            kicker="Features"
            title="Everything a good coach does — out loud."
            sub="Built to be used with the phone across the room and your hands full."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-border bg-background p-6">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program highlight */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 rounded-3xl border border-border bg-surface p-8 md:grid-cols-2 md:p-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Pro · your 12-week program
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              Calibrated to you. Adapts as you go.
            </h2>
            <p className="mt-4 text-muted">
              A plan built around what you can do today — three different sessions a week across four
              phases, Foundation to Strengthen. It checks in around week three to re-tune the rest,
              and rebuilds into a harder block when you finish. Every session is fully guided:
              warm-up, the movements with timed rest, then stretches.
            </p>
            <Link
              href={proOn ? "/app/go-pro?plan=monthly" : SITE.startHref}
              prefetch={false}
              className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-black transition hover:brightness-110"
            >
              {proOn ? "Start your free trial" : "Get started free"}
            </Link>
          </div>
          <ul className="space-y-3">
            {[
              ["Foundation", "Weeks 1–3 · groove the movements"],
              ["Build", "Weeks 4–6 · harder variations"],
              ["Develop", "Weeks 7–9 · real strength work"],
              ["Strengthen", "Weeks 10–12 · peak effort, same time budget"],
            ].map(([phase, detail]) => (
              <li
                key={phase}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-5 py-4"
              >
                <span className="font-semibold">{phase}</span>
                <span className="text-sm text-muted">{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead
            kicker="Pricing"
            title="Free to train. Pro for your program."
            sub="The hands-free coach and personalized routines are free. Pro unlocks your personalized, adaptive 12-week program."
          />
          <div className="mt-12">
            <PricingCards />
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Want the details?{" "}
            <Link href="/pricing" className="text-brand hover:underline">
              Compare plans →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <SectionHead kicker="FAQ" title="Good questions." />
        <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {f.q}
                <span className="text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-brand/40 bg-surface p-10 text-center md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{
              background:
                "radial-gradient(70% 120% at 50% 0%, rgba(34,211,238,0.16) 0%, rgba(34,211,238,0) 70%)",
            }}
          />
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your next workout is one tap away.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Put the phone down and let the coach take it from here.
          </p>
          <Link
            href={SITE.startHref}
            className="mt-7 inline-block rounded-2xl bg-brand px-8 py-4 font-bold text-black transition hover:brightness-110"
          >
            Start free
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-brand">{kicker}</span>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {sub ? <p className="mt-3 text-muted">{sub}</p> : null}
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold text-brand">{big}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted">{small}</div>
    </div>
  );
}

// Pure-CSS phone showing a mini session screen — no external image assets.
function PhoneMockup() {
  return (
    <div className="relative w-[260px] rounded-[2.5rem] border-[6px] border-surface-2 bg-background p-4 shadow-2xl">
      <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-surface-2" />
      <div className="mt-4 rounded-2xl bg-surface p-4">
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>Week 3 · Wednesday</span>
          <span>62%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-[62%] rounded-full bg-brand" />
        </div>
        <div className="mt-6 text-center">
          <div className="text-xs uppercase tracking-widest text-work">Work</div>
          <div className="mt-1 text-6xl font-extrabold tnum">0:24</div>
          <div className="mt-1 text-sm font-semibold">Goblet Squats</div>
          <div className="text-xs text-muted">set 2 of 3</div>
        </div>
        <div className="mt-6 rounded-xl bg-surface-2 px-3 py-2 text-center text-xs text-muted">
          🔊 “Ten seconds left… then rest.”
        </div>
        <div className="mt-3 flex justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">⏮</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-black">
            ⏸
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">⏭</div>
        </div>
      </div>
    </div>
  );
}
