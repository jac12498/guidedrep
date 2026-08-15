import { NextResponse } from "next/server";
import { proPurchaseEnabled } from "@/lib/site";

// TEMPORARY diagnostic — remove after confirming the soft-launch flag.
// Exposes only the NEXT_PUBLIC_PRO_ENABLED flag (already public by design)
// and a build marker so we can tell which commit is actually deployed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    buildMarker: "flags-debug-2026-08-15-a",
    proPurchaseEnabled: proPurchaseEnabled(),
    rawValue: process.env.NEXT_PUBLIC_PRO_ENABLED ?? null,
    rawLength: (process.env.NEXT_PUBLIC_PRO_ENABLED ?? "").length,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  });
}
