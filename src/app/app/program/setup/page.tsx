import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isProUser } from "@/lib/stripe/gate";
import UpgradeGate from "@/components/UpgradeGate";
import ProgramSetupClient from "./ProgramSetupClient";
import type { FitnessProfile } from "@/lib/fitness";

export default async function ProgramSetupPage() {
  if (!(await isProUser())) {
    return (
      <UpgradeGate
        title="Your 12-week program"
        benefit="A structured plan built and calibrated around you — from where you are today."
        bullets={[
          "Calibrated to what you can do right now",
          "Progresses across 4 phases over 12 weeks",
          "Fully guided and hands-free, like every workout",
        ]}
      />
    );
  }

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
  return <ProgramSetupClient initial={initial} />;
}
