// Read-only Stripe inspection: lists products, their tax_code, and active prices,
// plus the account's tax settings. Prints NO secret values. Run:
//   node scripts/stripe-inspect.mjs

import Stripe from "stripe";
import fs from "node:fs";

if (!process.env.STRIPE_SECRET_KEY) {
  try {
    const txt = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    // no .env.local
  }
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY not set.");
  process.exit(1);
}
console.log(`Mode: ${key.startsWith("sk_live_") ? "LIVE" : "TEST"}\n`);

const stripe = new Stripe(key);

// Which price IDs is the app actually wired to?
const wanted = {
  STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || "(unset)",
  STRIPE_PRICE_PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL || "(unset)",
};

const products = await stripe.products.list({ active: true, limit: 100 });
console.log(`Active products: ${products.data.length}\n`);
for (const p of products.data) {
  console.log(`• ${p.name}  [${p.id}]`);
  console.log(`    tax_code: ${p.tax_code ?? "(none — blank)"}`);
  console.log(`    metadata: ${JSON.stringify(p.metadata)}`);
  const prices = await stripe.prices.list({ product: p.id, active: true, limit: 100 });
  for (const pr of prices.data) {
    const amt = pr.unit_amount != null ? `$${(pr.unit_amount / 100).toFixed(2)}` : "?";
    const iv = pr.recurring ? `/${pr.recurring.interval}` : " one-time";
    const flags = Object.entries(wanted)
      .filter(([, id]) => id === pr.id)
      .map(([k]) => `← ${k}`)
      .join(" ");
    console.log(`    price ${pr.id}  ${amt}${iv} ${flags}`);
  }
  console.log("");
}

// Account-level tax posture.
try {
  const settings = await stripe.tax.settings.retrieve();
  console.log(`Tax settings status: ${settings.status}`);
  console.log(`  default tax_code: ${settings.defaults?.tax_code ?? "(none)"}`);
  console.log(`  tax_behavior:     ${settings.defaults?.tax_behavior ?? "(none)"}`);
  if (settings.status_details?.pending?.missing_fields?.length) {
    console.log(`  pending/missing:  ${settings.status_details.pending.missing_fields.join(", ")}`);
  }
} catch (e) {
  console.log(`Tax settings: could not retrieve (${e.message})`);
}
