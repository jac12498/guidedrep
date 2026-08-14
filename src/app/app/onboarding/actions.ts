"use server";

import { createClient } from "@/lib/supabase/server";
import { DISCLAIMER_VERSION } from "@/lib/disclaimer";
import type { FitnessProfile } from "@/lib/fitness";

// Saves name + disclaimer agreement + fitness questionnaire using the server
// session (reliable). Returns an error string instead of throwing so the wizard
// can display it. No redirect — the client advances to routine generation, then
// navigates into the app.
export async function completeOnboarding(input: {
  name: string;
  agreed: boolean;
  profile: FitnessProfile;
}): Promise<{ error?: string }> {
  const name = input.name?.trim();
  if (!name) return { error: "Please enter your name." };
  if (!input.agreed) return { error: "Please agree to the disclaimer to continue." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name: name,
    disclaimer_accepted_at: new Date().toISOString(),
    disclaimer_version: DISCLAIMER_VERSION,
    fitness_profile: { ...input.profile, updatedAt: Date.now() },
  });
  if (error) return { error: error.message };
  return {};
}
