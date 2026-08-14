import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Local-only mode (no Supabase env): don't enforce auth — app works as before.
  if (!supabaseConfigured) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // Run on pages, but skip API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)"],
};
