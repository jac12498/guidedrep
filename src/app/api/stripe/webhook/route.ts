import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Stripe → us. Verifies the signature, then mirrors subscription state onto the
// user's profile using the service-role client (no user session in a webhook).
export async function POST(req: Request) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured." }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = admin; // narrowed (non-null) capture for use inside the closure below

  // Write current subscription state onto whichever profile owns this customer.
  async function syncSubscription(sub: Stripe.Subscription) {
    const item = sub.items?.data?.[0];
    const periodEnd =
      item?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end;
    await db
      .from("profiles")
      .update({
        subscription_status: sub.status,
        price_id: item?.price?.id ?? null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("stripe_customer_id", sub.customer as string);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string | null;
        // Bind the customer to the user, creating the profile row if it's somehow
        // missing (upsert; service-role client, so RLS doesn't apply) — this is the
        // billing-side backstop for the sign-in self-heal.
        if (userId && customerId) {
          await db
            .from("profiles")
            .upsert({ id: userId, stripe_customer_id: customerId }, { onConflict: "id" });
        }
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch {
    // Returning 500 tells Stripe to retry the delivery.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
