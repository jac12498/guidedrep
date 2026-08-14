"use server";

import { createClient } from "@/lib/supabase/server";
import type { FitnessProfile } from "@/lib/fitness";

// Update the saved questionnaire answers (used when a Free user re-runs the
// questionnaire to refresh their routines).
export async function updateFitnessProfile(profile: FitnessProfile): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };
  const { error } = await supabase
    .from("profiles")
    .update({ fitness_profile: { ...profile, updatedAt: Date.now() } })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return {};
}
