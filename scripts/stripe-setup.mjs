// One-time Stripe setup: creates the "Guided Reps Pro" product and its monthly
// ($5) + annual ($40) prices, then prints the price IDs to paste into .env.local.
// Idempotent — re-running reuses the existing product and matching prices.
//
//   npm run stripe:setup
//
// Reads STRIPE_SECRET_KEY from the environment or from .env.local (parsed below),
// so it works whether or not your Node version supports --env-file.

import Stripe from "stripe";
import fs from "node:fs";

// Load .env.local if the key isn't already in the environment.
if (!process.env.STRIPE_SECRET_KEY) {
  try {
    const txt = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    // no .env.local — fall through to the check below
  }
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY is not set. Add it to .env.local (sk_test_… for test mode).");
  process.exit(1);
}
if (key.startsWith("sk_live_")) {
  console.log("⚠  Using a LIVE key — this will create live products. Ctrl-C now if unintended.\n");
}

const stripe = new Stripe(key);
const APP = "guided-reps";

async function findOrCreateProduct() {
  try {
    const found = await stripe.products.search({
      query: `metadata['app']:'${APP}' AND active:'true'`,
    });
    if (found.data[0]) return { product: found.data[0], created: false };
  } catch {
    // product search may be unavailable on brand-new accounts; fall through to create
  }
  const product = await stripe.products.create({
    name: "Guided Reps Pro",
    description: "Unlimited AI-generated routines and early access to new features.",
    metadata: { app: APP, plan: "pro" },
  });
  return { product, created: true };
}

async function findOrCreatePrice(productId, amount, interval, nickname) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === amount && p.currency === "usd" && p.recurring?.interval === interval,
  );
  if (match) return { price: match, created: false };
  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: amount,
    recurring: { interval },
    nickname,
  });
  return { price, created: true };
}

const { product, created: pCreated } = await findOrCreateProduct();
const monthly = await findOrCreatePrice(product.id, 500, "month", "Pro Monthly");
const annual = await findOrCreatePrice(product.id, 4000, "year", "Pro Annual");

console.log(`\n${pCreated ? "Created" : "Reusing"} product: ${product.id} (${product.name})`);
console.log(`  monthly price: ${monthly.price.id} ${monthly.created ? "(created)" : "(reused)"}`);
console.log(`  annual  price: ${annual.price.id} ${annual.created ? "(created)" : "(reused)"}`);

console.log("\n──────────────────────────────────────────────");
console.log("Add these to your .env.local:\n");
console.log(`STRIPE_PRICE_PRO_MONTHLY=${monthly.price.id}`);
console.log(`STRIPE_PRICE_PRO_ANNUAL=${annual.price.id}`);
console.log("──────────────────────────────────────────────\n");
