"use client";

// Keeps the screen awake during a workout (so your phone doesn't sleep mid-set)
// and re-acquires the lock when the tab becomes visible again. Best-effort: on
// browsers without the Wake Lock API it simply does nothing.

import { useCallback, useEffect, useRef } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> } | null;

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike>(null);

  const acquire = useCallback(async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      };
      if (!nav.wakeLock) return;
      sentinelRef.current = await nav.wakeLock.request("screen");
    } catch {
      // denied or unsupported — ignore
    }
  }, []);

  const release = useCallback(async () => {
    try {
      await sentinelRef.current?.release();
    } catch {
      /* ignore */
    }
    sentinelRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      void release();
      return;
    }
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void release();
    };
  }, [active, acquire, release]);
}
