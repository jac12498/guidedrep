import "server-only";
import Stripe from "stripe";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe, stripeConfigured, priceIdFor } from "./server";
import { TRIAL_DAYS } from "@/lib/site";

/** Absolute origin for building Stripe return URLs (works in dev and prod). */
export async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Create a Stripe Checkout session for the Pro subscription and return its URL
 * (or null if billing isn't set up). Reuses an existing Stripe customer or
 * creates and persists one. Shared by the account page's Upgrade form and the
 * marketing "Go Pro" flow.
 */
export async function createProCheckoutSession(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  plan: "monthly" | "annual",
  baseUrl: string,
): Promise<string | null> {
  if (!stripeConfigured || !stripe) return null;
  const priceId = priceIdFor(plan);
  if (!priceId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, display_name")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = (profile?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? (profile?.email as string | undefined),
      name: (profile?.display_name as string | undefined) ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: TRIAL_DAYS },
    client_reference_id: user.id,
    allow_promotion_codes: true,
    success_url: `${baseUrl}/app/account?checkout=success`,
    cancel_url: `${baseUrl}/app/account?checkout=cancel`,
  };
  // This account has Stripe Managed Payments on by default, which requires a
  // per-product tax code. Disable it on the session so checkout works without
  // tax setup. (See billing memory for enabling automatic tax later.)
  (params as Record<string, unknown>).managed_payments = { enabled: false };

  const session = await stripe.checkout.sessions.create(params);
  return session.url ?? null;
}
