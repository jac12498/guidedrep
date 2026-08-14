import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { stripeConfigured } from "@/lib/stripe/server";
import { getEntitlement } from "@/lib/stripe/entitlements";
import { createProCheckoutSession, getBaseUrl } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

/**
 * Direct "Go Pro" entry point for the marketing CTAs: sends a visitor straight
 * into Stripe Checkout for the Pro subscription. Signed-out visitors are routed
 * through sign-in first (with the intent preserved via ?next), then land back
 * here to complete checkout.
 */
export default async function GoProPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planParam } = await searchParams;
  const plan: "monthly" | "annual" = planParam === "annual" ? "annual" : "monthly";
  const self = `/app/go-pro?plan=${plan}`;

  // No accounts configured → nothing to subscribe to.
  if (!supabaseConfigured) redirect("/app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → sign in first, then come back here to check out.
  if (!user) redirect(`/app/login?next=${encodeURIComponent(self)}`);
  if (!stripeConfigured) redirect("/app/account?checkout=unavailable");

  // Already Pro → send them to manage billing instead of a second subscription.
  const ent = await getEntitlement(supabase, user.id);
  if (ent.isPro) redirect("/app/account");

  const base = await getBaseUrl();
  let url: string | null = null;
  try {
    url = await createProCheckoutSession(supabase, user, plan, base);
  } catch {
    redirect("/app/account?checkout=error");
  }
  if (!url) redirect("/app/account?checkout=error");
  redirect(url);
}
