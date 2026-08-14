import Link from "next/link";
import { proPurchaseEnabled } from "@/lib/site";

// Shown in place of a Pro-only feature when the signed-in user is on Free.
// Plain (no hooks) so it can render inside a server component.
export default function UpgradeGate({
  title,
  benefit,
  bullets,
}: {
  title: string;
  benefit: string;
  bullets?: string[];
}) {
  const proOn = proPurchaseEnabled();
  return (
    <div className="pt-10">
      <div className="mx-auto max-w-md rounded-3xl border border-brand/40 bg-surface p-8 text-center">
        <div className="text-4xl">✨</div>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <span className="mt-2 inline-block rounded-full bg-brand/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
          Pro feature
        </span>
        <p className="mt-4 text-muted">{benefit}</p>

        {bullets?.length ? (
          <ul className="mt-5 space-y-2 text-left text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2.5">
                <span className="mt-0.5 text-brand">✓</span>
                <span className="text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {proOn ? (
          <>
            <Link
              href="/app/account"
              className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-black transition hover:brightness-110"
            >
              See Pro
            </Link>
            <p className="mt-3 text-xs text-muted">Starts with a free trial. Cancel anytime.</p>
          </>
        ) : (
          <p className="mt-6 inline-block rounded-2xl bg-surface-2 px-6 py-3 font-bold text-muted">
            Coming soon
          </p>
        )}
      </div>
    </div>
  );
}
