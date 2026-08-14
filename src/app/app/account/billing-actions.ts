"use server";

import { redirect } from "next/navigation";
import { stripe, stripeConfigured } from "@/lib/stripe/server";
import { createProCheckoutSession, getBaseUrl } from "@/lib/stripe/checkout";
import { createClient } from "@/lib/supabase/server";

// Starts a Stripe Checkout session for the chosen plan and redirects to it.
// Invoked from a <form> on the account page (bound to the plan).
export async function startCheckout(plan: "monthly" | "annual"): Promise<void> {
  if (!stripeConfigured || !stripe) redirect("/app/account?checkout=unavailable");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");

  const base = await getBaseUrl();
  const url = await createProCheckoutSession(supabase, user, plan, base);
  if (!url) redirect("/app/account?checkout=error");
  redirect(url);
}

// Opens the Stripe Billing Portal so the user can update payment, or cancel.
export async function openBillingPortal(): Promise<void> {
  if (!stripeConfigured || !stripe) redirect("/app/account?checkout=unavailable");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const customerId = (profile?.stripe_customer_id as string | null) ?? null;
  if (!customerId) redirect("/app/account");

  const base = await getBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/app/account`,
  });
  redirect(portal.url);
}
