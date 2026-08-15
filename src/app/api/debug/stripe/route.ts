import { NextResponse } from "next/server";
import {
  stripe,
  stripeConfigured,
  STRIPE_PRICE_PRO_MONTHLY,
  STRIPE_PRICE_PRO_ANNUAL,
  STRIPE_WEBHOOK_SECRET,
} from "@/lib/stripe/server";

// TEMPORARY diagnostic — verifies the live Stripe config is internally
// consistent (prices resolve + are live-mode) WITHOUT exposing any secret.
// Reports only non-sensitive facts: booleans, price amounts (public at
// checkout anyway), and livemode flags. Remove after go-live is confirmed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkPrice(id: string | undefined) {
  if (!id) return { configured: false };
  if (!stripe) return { configured: true, id, error: "no stripe client" };
  try {
    const p = await stripe.prices.retrieve(id);
    return {
      configured: true,
      id,
      found: true,
      livemode: p.livemode,
      active: p.active,
      unitAmount: p.unit_amount,
      currency: p.currency,
      interval: p.recurring?.interval ?? null,
    };
  } catch (e) {
    return { configured: true, id, found: false, error: (e as Error).message };
  }
}

export async function GET() {
  const [monthly, annual] = await Promise.all([
    checkPrice(STRIPE_PRICE_PRO_MONTHLY),
    checkPrice(STRIPE_PRICE_PRO_ANNUAL),
  ]);
  // Infer key mode from a retrieved price's livemode (never expose the key).
  const keyLivemode =
    "livemode" in monthly ? monthly.livemode : "livemode" in annual ? annual.livemode : null;
  return NextResponse.json({
    buildMarker: "stripe-debug-2026-08-15-a",
    stripeConfigured,
    webhookSecretPresent: Boolean(STRIPE_WEBHOOK_SECRET),
    keyLivemode,
    monthly,
    annual,
  });
}
