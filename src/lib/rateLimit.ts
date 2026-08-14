// Minimal in-memory rate limiter for public endpoints (e.g. the pre-signup
// routine preview). State is per server instance and resets on redeploy — fine
// for a single-instance deployment. Move to a shared store (Redis) if you scale
// horizontally.
//
// Split into peek + record so callers can check *before* doing expensive work
// and only count it against the limit when the work actually succeeds.

const hits = new Map<string, number[]>();

/** True if the key is under the limit right now (does not record the attempt). */
export function rateLimitPeek(key: string, max: number, windowMs: number, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent.length < max;
}

/** Record one successful use against the key. */
export function rateLimitRecord(key: string, now: number): void {
  const arr = hits.get(key) ?? [];
  arr.push(now);
  hits.set(key, arr);
}
