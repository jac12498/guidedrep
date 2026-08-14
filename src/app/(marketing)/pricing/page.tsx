import type { Metadata } from "next";
import PricingCards from "@/components/marketing/PricingCards";
import { FAQS, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Guided Reps is free to train — personalized routines and the hands-free coach cost nothing. Pro adds your personalized, adaptive 12-week program, progress charts, and more.",
};

const COMPARE: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: "Personalized routines (from a quiz)", free: true, pro: true },
  { label: "Hands-free voice coach & timers", free: true, pro: true },
  { label: "Choose your coach (voice & style)", free: true, pro: true },
  { label: "Voice commands & how-tos", free: true, pro: true },
  { label: "Built-in routines", free: "3", pro: "3" },
  { label: "History, streaks & synced account", free: true, pro: true },
  { label: "Installable PWA, offline", free: true, pro: true },
  { label: "Personalized 12-week program", free: false, pro: true },
  { label: "Calibrated & adaptive (mid-program + rebuild)", free: false, pro: true },
  { label: "Progress charts & detailed stats", free: false, pro: true },
  { label: "Custom routine builder", free: false, pro: true },
  { label: "Data export (CSV & JSON)", free: false, pro: true },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Simple pricing.</h1>
        <p className="mt-3 text-muted">
          The hands-free coach and personalized routines are free. Upgrade when you want your own
          adaptive 12-week program.
        </p>
      </div>

      <div className="mt-12">
        <PricingCards />
      </div>

      <p className="mx-auto mt-6 max-w-xl text-center text-xs text-muted">
        Paid billing is rolling out now — start free today and early members lock in founder
        pricing. Questions?{" "}
        <a href={`mailto:${SITE.email}`} className="text-brand hover:underline">
          {SITE.email}
        </a>
      </p>

      {/* Comparison table */}
      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 pr-4 font-semibold">Compare plans</th>
              <th className="px-4 py-3 text-center font-semibold">Free</th>
              <th className="px-4 py-3 text-center font-semibold text-brand">Pro</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row.label} className="border-b border-border/50">
                <td className="py-3 pr-4 text-foreground/90">{row.label}</td>
                <td className="px-4 py-3 text-center">
                  <Cell value={row.free} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Cell value={row.pro} pro />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-20 max-w-2xl">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">Questions</h2>
        <div className="mt-8 divide-y divide-border/60 border-y border-border/60">
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
      </div>
    </div>
  );
}

function Cell({ value, pro }: { value: string | boolean; pro?: boolean }) {
  if (value === true) return <span className={pro ? "text-brand" : "text-work"}>✓</span>;
  if (value === false) return <span className="text-muted/40">—</span>;
  return <span className="text-foreground/90">{value}</span>;
}
