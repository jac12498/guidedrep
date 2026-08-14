"use client";

import { useEffect, useState } from "react";
import CoachPicker from "@/components/CoachPicker";
import { getSettings, saveSettings } from "@/lib/store";
import { setCoachVoice } from "@/lib/audio";
import { getCoach } from "@/lib/coaches";

// Coach selection on the account page. Settings are device-local, so this reads/
// writes localStorage directly and syncs the audio voice on change.
export default function CoachSetting() {
  const [coachId, setCoachId] = useState("sam");

  useEffect(() => {
    const s = getSettings();
    setCoachId(s.coachId);
    setCoachVoice(getCoach(s.coachId).voice);
  }, []);

  function chooseCoach(id: string) {
    setCoachId(id);
    saveSettings({ ...getSettings(), coachId: id });
    setCoachVoice(getCoach(id).voice);
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
      <CoachPicker coachId={coachId} onChange={chooseCoach} />
      <p className="mt-2 text-xs text-muted">Saved on this device.</p>
    </div>
  );
}
