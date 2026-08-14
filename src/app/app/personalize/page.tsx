import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import PersonalizeClient from "./PersonalizeClient";
import type { FitnessProfile } from "@/lib/fitness";

// Free users can re-run the questionnaire any time to refresh their routines.
export default async function PersonalizePage() {
  let initial: Partial<FitnessProfile> | undefined;
  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("fitness_profile")
        .eq("id", user.id)
        .maybeSingle();
      initial = (data?.fitness_profile as FitnessProfile | null) ?? undefined;
    }
  }
  return <PersonalizeClient initial={initial} />;
}
