import "server-only";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "./entitlements";

// Server-side Pro check for gating whole pages. In local-only mode (no Supabase)
// there's no billing, so Pro features are simply open for development.
export async function isProUser(): Promise<boolean> {
  if (!supabaseConfigured) return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");
  const ent = await getEntitlement(supabase, user.id);
  return ent.isPro;
}
