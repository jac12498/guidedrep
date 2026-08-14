import type { FitnessProfile } from "./fitness";
import type { AIRoutine } from "./aiRoutine";

// Bridges the pre-signup quiz (public /start) to post-signup onboarding: the
// answers (and any generated routines) are stashed in localStorage, then picked
// up on the first authenticated onboarding load and migrated into the account.

const KEY = "ec:pending_onboarding";

export interface PendingOnboarding {
  profile: FitnessProfile;
  routines?: AIRoutine[];
}

export function setPendingOnboarding(p: PendingOnboarding): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full / disabled — the user simply re-answers after signup
  }
}

export function getPendingOnboarding(): PendingOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingOnboarding) : null;
  } catch {
    return null;
  }
}

export function clearPendingOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
