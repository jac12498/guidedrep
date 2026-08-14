import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getEntitlement } from "@/lib/stripe/entitlements";
import { adaptProgram } from "@/lib/generateProgram";
import { GenerationError } from "@/lib/generateRoutines";
import type { FitnessProfile } from "@/lib/fitness";
import type { ProgramPlan } from "@/lib/programPlan";

export const runtime = "nodejs";
export const maxDuration = 120;

// Mid-block check-in: re-tune the remaining phases of the active program.
export async function POST(req: Request) {
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
  let plan: ProgramPlan;
  let direction: "easier" | "harder";
  let note: string | undefined;
  try {
    const body = (await req.json()) as {
      profile: FitnessProfile;
      plan: ProgramPlan;
      direction: "easier" | "harder";
      note?: string;
    };
    profile = body.profile;
    plan = body.plan;
    direction = body.direction;
    note = body.note?.trim() || undefined;
    if (!profile || !plan?.phases || (direction !== "easier" && direction !== "harder")) {
      throw new Error("bad");
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const adjusted = await adaptProgram(profile, plan, direction, note);
    return NextResponse.json({ plan: adjusted });
  } catch (err) {
    const status = err instanceof GenerationError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to adjust the program." },
      { status },
    );
  }
}
