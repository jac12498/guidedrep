import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";

// Server-rendered so identity comes from the reliable server session (same one
// the middleware reads) — no client-side "Loading" state that can hang.
export default async function OnboardingPage() {
  if (!supabaseConfigured) redirect("/app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, disclaimer_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.display_name && profile?.disclaimer_accepted_at) redirect("/app");

  return (
    <OnboardingForm
      email={user.email ?? ""}
      initialName={(profile?.display_name as string | null) ?? ""}
    />
  );
}
