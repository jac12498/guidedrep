import { NextResponse } from "next/server";
import { generateStarterRoutines, GenerationError } from "@/lib/generateRoutines";
import { rateLimitPeek, rateLimitRecord } from "@/lib/rateLimit";
import type { FitnessProfile } from "@/lib/fitness";

export const runtime = "nodejs";

const MAX_PER_HOUR = 5;
const HOUR = 60 * 60 * 1000;

// Public pre-signup routine preview. No auth (visitors haven't signed up yet),
// so it's rate-limited by IP to bound cost / abuse. Only *successful* generations
// count, and we only rate-limit real remote clients (a proxy sets x-forwarded-for)
// — local dev requests have none and aren't limited.
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "")
    .trim();
  const key = `start:${ip}`;
  const now = Date.now();

  if (ip && !rateLimitPeek(key, MAX_PER_HOUR, HOUR, now)) {
    return NextResponse.json(
      { error: "That's a few tries — create your free account to keep going.", code: "rate_limited" },
      { status: 429 },
    );
  }

  let profile: FitnessProfile;
  try {
    profile = ((await req.json()) as { profile: FitnessProfile }).profile;
    if (!profile || typeof profile !== "object") throw new Error("bad");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // Just one routine for the preview — it's all we show, and it keeps the
    // pre-signup wait short. The full set is built during onboarding.
    const routines = await generateStarterRoutines(profile, { count: 1 });
    if (ip) rateLimitRecord(key, now); // count only successful generations
    return NextResponse.json({ routines });
  } catch (err) {
    const status = err instanceof GenerationError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate routines." },
      { status },
    );
  }
}
