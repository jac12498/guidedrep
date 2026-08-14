import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { stripeConfigured } from "@/lib/stripe/server";
import { getEntitlement } from "@/lib/stripe/entitlements";
import { PRICE_PRO_ANNUAL, PRICE_PRO_MONTHLY, TRIAL_DAYS, proPurchaseEnabled } from "@/lib/site";
import CoachSetting from "@/components/CoachSetting";
import { openBillingPortal, startCheckout } from "./billing-actions";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  if (!supabaseConfigured) {
    return (
      <div className="pt-10">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-2 text-muted">
          Running in local mode — your data is stored on this device only. Configure Supabase to
          enable cloud accounts that sync across devices.
        </p>
        <Link href="/app" className="mt-6 inline-block text-brand">
          ← Back
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName: string | null = null;
  let disclaimerAcceptedAt: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin, display_name, disclaimer_accepted_at")
      .eq("id", user.id)
      .single();
    isAdmin = data?.is_admin ?? false;
    displayName = data?.display_name ?? null;
    disclaimerAcceptedAt = data?.disclaimer_accepted_at ?? null;
  }

  const ent = user ? await getEntitlement(supabase, user.id) : null;

  return (
    <div className="pt-6">
      <h1 className="mb-4 text-2xl font-bold">Account</h1>

      {checkout === "success" ? (
        <Banner tone="good">🎉 You&apos;re on Pro — thanks for the support! Your personalized 12-week program is unlocked.</Banner>
      ) : checkout === "cancel" ? (
        <Banner tone="muted">Checkout canceled — no charge was made.</Banner>
      ) : checkout === "unavailable" ? (
        <Banner tone="bad">Billing isn&apos;t available right now. Please try again later.</Banner>
      ) : checkout === "error" ? (
        <Banner tone="bad">Something went wrong starting checkout. Please try again.</Banner>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-black">
            {(displayName || user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{displayName || "Signed in"}</div>
            <div className="truncate text-sm text-muted">{user?.email}</div>
          </div>
        </div>
        {disclaimerAcceptedAt ? (
          <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted">
            ✓ Safety disclaimer agreed on {fmtDate(disclaimerAcceptedAt)}
          </p>
        ) : null}
      </div>

      {/* Plan / billing */}
      {ent ? (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Plan</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    ent.isPro ? "bg-brand/20 text-brand" : "bg-surface-2 text-muted"
                  }`}
                >
                  {ent.isPro ? (ent.status === "trialing" ? "Pro · trial" : "Pro") : "Free"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {ent.isPro
                  ? ent.status === "trialing"
                    ? `Free trial — first charge ${fmtDate(ent.currentPeriodEnd)}.`
                    : ent.currentPeriodEnd
                      ? `Renews ${fmtDate(ent.currentPeriodEnd)}.`
                      : "Active subscription."
                  : "Free plan — personalized routines included."}
              </p>
            </div>
          </div>

          {stripeConfigured ? (
            ent.isPro || ent.hasCustomer ? (
              <form action={openBillingPortal} className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-surface-2 py-3 font-semibold transition hover:bg-border"
                >
                  Manage billing
                </button>
              </form>
            ) : proPurchaseEnabled() ? (
              <div className="mt-4 flex flex-col gap-2">
                <form action={startCheckout.bind(null, "monthly")}>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-brand py-3 font-bold text-black transition hover:brightness-110"
                  >
                    Start {TRIAL_DAYS}-day free trial · ${PRICE_PRO_MONTHLY}/mo after
                  </button>
                </form>
                <form action={startCheckout.bind(null, "annual")}>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-surface-2 py-3 font-semibold transition hover:bg-border"
                  >
                    Go annual · ${PRICE_PRO_ANNUAL}/yr (save{" "}
                    {Math.round((1 - PRICE_PRO_ANNUAL / (PRICE_PRO_MONTHLY * 12)) * 100)}%)
                  </button>
                </form>
                <Link href="/pricing" className="mt-1 text-center text-xs text-muted hover:text-foreground">
                  Compare plans →
                </Link>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-center text-sm text-muted">
                Pro is coming soon — you&apos;re on the free plan with everything unlocked for now.
              </p>
            )
          ) : (
            <p className="mt-3 text-xs text-muted">Billing isn&apos;t configured on this deployment.</p>
          )}
        </div>
      ) : null}

      {/* Coach (device-local setting) */}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-muted">Coach</h2>
      <CoachSetting />

      {isAdmin ? (
        <Link
          href="/app/admin"
          className="mt-3 block rounded-2xl border border-border bg-surface p-4 font-medium"
        >
          🛠️ Admin dashboard <span className="text-muted">— manage users</span>
        </Link>
      ) : null}

      <form action="/auth/signout" method="post" className="mt-6">
        <button type="submit" className="w-full rounded-2xl bg-surface-2 py-3.5 font-semibold">
          Sign out
        </button>
      </form>
    </div>
  );
}

function Banner({ tone, children }: { tone: "good" | "bad" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "border-brand/50 bg-brand/10 text-foreground"
      : tone === "bad"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : "border-border bg-surface text-muted";
  return <div className={`mb-4 rounded-2xl border p-3 text-sm ${cls}`}>{children}</div>;
}
