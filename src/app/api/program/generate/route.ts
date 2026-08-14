import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getEntitlement } from "@/lib/stripe/entitlements";
import { generateProgram } from "@/lib/generateProgram";
import { GenerationError } from "@/lib/generateRoutines";
import type { FitnessProfile } from "@/lib/fitness";

export const runtime = "nodejs";
export const maxDuration = 120; // program generation can take ~a minute

export async function POST(req: Request) {
  // Pro-gated when accounts are on.
  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const ent = await getEntitlement(supabase, user.id);
    if (!ent.isPro) {
      return NextResponse.json(
        { error: "The 12-week program is a Pro feature.", code: "upgrade_required" },
        { status: 402 },
      );
    }
  }

  let profile: FitnessProfile;
  let blockNumber = 1;
  try {
    const body = (await req.json()) as { profile: FitnessProfile; blockNumber?: number };
    profile = body.profile;
    if (!profile || typeof profile !== "object") throw new Error("bad");
    if (typeof body.blockNumber === "number" && body.blockNumber > 0) blockNumber = body.blockNumber;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const plan = await generateProgram(profile, { blockNumber });
    return NextResponse.json({ plan });
  } catch (err) {
    const status = err instanceof GenerationError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate the program." },
      { status },
    );
  }
}
