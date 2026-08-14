"use client";

import { useEffect } from "react";
import { ensureMigrated } from "@/lib/store";

// On first load after signing in, push any on-device data into the account.
// No-ops when Supabase isn't configured or after migration has run once.
export default function CloudSync() {
  useEffect(() => {
    void ensureMigrated();
  }, []);
  return null;
}
