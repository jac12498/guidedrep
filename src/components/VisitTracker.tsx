"use client";

import { useEffect } from "react";

// Fire-and-forget first-party visit ping. Assigns a random per-browser id
// (localStorage) and records one visit per browser session (sessionStorage),
// so distinct ids ≈ unique visitors. No cookies, no PII, no third party.
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("gr_visited")) return; // once per session
      let vid = localStorage.getItem("gr_vid");
      if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem("gr_vid", vid);
      }
      sessionStorage.setItem("gr_visited", "1");
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vid,
          path: window.location.pathname,
          referrer: document.referrer || null,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // storage blocked / privacy mode — skip silently
    }
  }, []);

  return null;
}
