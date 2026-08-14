import "server-only";
import Stripe from "stripe";

// Stripe is optional infrastructure, just like Supabase. Without a secret key
// and at least a monthly price, billing is considered "not configured" and the
// UI hides upgrade paths (the app still runs as a free product).
const secret = process.env.STRIPE_SECRET_KEY;

export const STRIPE_PRICE_PRO_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY;
export const STRIPE_PRICE_PRO_ANNUAL = process.env.STRIPE_PRICE_PRO_ANNUAL;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const stripeConfigured = Boolean(secret && STRIPE_PRICE_PRO_MONTHLY);

// One shared client. Pinned to the SDK's default API version.
export const stripe = secret ? new Stripe(secret) : null;

export function priceIdFor(plan: "monthly" | "annual"): string | undefined {
  return plan === "annual" ? STRIPE_PRICE_PRO_ANNUAL : STRIPE_PRICE_PRO_MONTHLY;
}
