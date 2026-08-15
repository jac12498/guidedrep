import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Records an anonymous first-party site visit (top-of-funnel analytics).
// No PII — just a random per-browser visitor id + path. Writes go through the
// service role, so the site_visits table is never directly client-writable.
export const runtime = "nodejs";

const clip = (v: unknown, max: number): string | null =>
  typeof v === "string" && v ? v.slice(0, max) : null;

export async function POST(req: Request) {
  const admin = createAdminClient();
  if (!admin) return new NextResponse(null, { status: 204 }); // analytics off — no-op

  let body: { vid?: string; path?: string; referrer?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const visitor_id = clip(body.vid, 64);
  if (!visitor_id) return new NextResponse(null, { status: 204 });

  const { error } = await admin.from("site_visits").insert({
    visitor_id,
    path: clip(body.path, 256),
    referrer: clip(body.referrer, 256),
  });

  // TEMP diagnostic: surface insert failures (non-sensitive schema errors) so we
  // can confirm the table/service-role are wired. Revert to a silent 204 after.
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message, code: error.code, details: error.details },
      { status: 200 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
