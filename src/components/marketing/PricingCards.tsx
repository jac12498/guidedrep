import Link from "next/link";
import { TIERS, proPurchaseEnabled } from "@/lib/site";

export default function PricingCards() {
  const proOn = proPurchaseEnabled();
  return (
    <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
      {TIERS.map((t) => (
        <div
          key={t.name}
          className={`relative flex flex-col rounded-3xl border p-6 ${
            t.featured
              ? "border-brand bg-surface shadow-[0_0_0_1px_var(--brand)]"
              : "border-border bg-surface"
          }`}
        >
          {t.featured ? (
            <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-black">
              Most popular
            </span>
          ) : null}

          <h3 className="text-lg font-bold">{t.name}</h3>
          <p className="mt-1 text-sm text-muted">{t.blurb}</p>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tnum">{t.price}</span>
            <span className="text-sm text-muted">/ {t.cadence}</span>
          </div>
          {t.note ? <p className="mt-1 text-xs text-brand">{t.note}</p> : null}

          {t.featured && !proOn ? (
            <span className="mt-5 cursor-default rounded-2xl bg-surface-2 py-3 text-center font-bold text-muted">
              Coming soon
            </span>
          ) : (
            <Link
              href={t.href}
              prefetch={false}
              className={`mt-5 rounded-2xl py-3 text-center font-bold transition ${
                t.featured
                  ? "bg-brand text-black hover:brightness-110"
                  : "bg-surface-2 text-foreground hover:bg-border"
              }`}
            >
              {t.cta}
            </Link>
          )}

          <ul className="mt-6 space-y-2.5 text-sm">
            {t.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="mt-0.5 text-brand">✓</span>
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
