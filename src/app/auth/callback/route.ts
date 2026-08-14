import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing: exchange the one-time code for a session, then go home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/app";

  // Behind a proxy (Railway) `origin` is the internal container address
  // (e.g. localhost:8080), so honor the configured public URL when set.
  const base = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (supabaseConfigured && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }
  return NextResponse.redirect(`${base}/app/login?error=auth`);
}
