import UpgradeGate from "@/components/UpgradeGate";
import ProgramClient from "./ProgramClient";
import { isProUser } from "@/lib/stripe/gate";

export default async function ProgramPage() {
  if (!(await isProUser())) {
    return (
      <UpgradeGate
        title="Your personalized 12-week program"
        benefit="A structured plan built and calibrated around you — from where you are today."
        bullets={[
          "Calibrated to what you can do right now",
          "Four phases, progressing over 12 weeks",
          "Fully guided and hands-free, every session",
        ]}
      />
    );
  }
  return <ProgramClient />;
}
