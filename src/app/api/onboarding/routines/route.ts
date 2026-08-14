import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { generateStarterRoutines, GenerationError } from "@/lib/generateRoutines";
import type { FitnessProfile } from "@/lib/fitness";

export const runtime = "nodejs";

// Authenticated routine generation (in-app onboarding + /app/personalize).
export async function POST(req: Request) {
  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let profile: FitnessProfile;
  try {
    profile = ((await req.json()) as { profile: FitnessProfile }).profile;
    if (!profile || typeof profile !== "object") throw new Error("bad");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const routines = await generateStarterRoutines(profile);
    return NextResponse.json({ routines });
  } catch (err) {
    const status = err instanceof GenerationError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate routines." },
      { status },
    );
  }
}
