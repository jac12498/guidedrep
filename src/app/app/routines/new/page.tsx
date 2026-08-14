import UpgradeGate from "@/components/UpgradeGate";
import RoutineBuilder from "@/components/RoutineBuilder";
import { isProUser } from "@/lib/stripe/gate";

export default async function NewRoutinePage() {
  if (!(await isProUser())) {
    return (
      <UpgradeGate
        title="Custom routine builder"
        benefit="Build your own routines exactly the way you want and run them hands-free."
        bullets={[
          "Add any exercises, in any order",
          "Set reps or timed work, rest, and form cues",
          "Save and start — the coach times you through it",
        ]}
      />
    );
  }
  return <RoutineBuilder />;
}
