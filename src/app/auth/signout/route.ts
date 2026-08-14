import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  // Behind a proxy (Railway) request.url is the internal container address,
  // so honor the configured public URL when set.
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.redirect(`${base}/app/login`, { status: 303 });
}
