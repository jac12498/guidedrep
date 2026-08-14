import UpgradeGate from "@/components/UpgradeGate";
import StatsDashboard from "@/components/StatsDashboard";
import { isProUser } from "@/lib/stripe/gate";

export default async function StatsPage() {
  if (!(await isProUser())) {
    return (
      <UpgradeGate
        title="Insights & export"
        benefit="See your training trends over time and take your data with you."
        bullets={[
          "Charts: workouts and minutes per week",
          "Streaks, weekday patterns, program progress",
          "Export your history as CSV or a full JSON backup",
        ]}
      />
    );
  }
  return <StatsDashboard />;
}
