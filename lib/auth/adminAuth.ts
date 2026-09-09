/**
 * Shared auth check for admin/cron routes (fix-summaries, collect, inquiries).
 *
 * Two things the ad-hoc per-route checks used to get wrong:
 *  - Fail-open: `if ((cronSecret || adminPassword) && !isAuthorized)` skips the
 *    401 entirely when NEITHER env var is set (e.g. accidentally cleared in the
 *    Vercel dashboard), leaving the route wide open to anyone. This fails closed
 *    instead: no configured secret means no access, full stop.
 *  - Timing leak: comparing secrets with `===` leaks how many leading bytes
 *    matched via response-time differences. `timingSafeEqual` doesn't.
 */

import { timingSafeEqual as nodeTimingSafeEqual } from "crypto";

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch; comparing against a same-length
  // buffer of the other value first keeps the check itself constant-time-ish
  // (a real length leak here is low-value to an attacker vs. the token itself).
  if (bufA.length !== bufB.length) return false;
  return nodeTimingSafeEqual(bufA, bufB);
}

/**
 * Returns true only if at least one of CRON_SECRET / ADMIN_PASSWORD is
 * configured AND the candidate matches one of them. Returns false (never
 * throws) for a missing/empty candidate or missing env config.
 */
export function isAuthorizedAdmin(candidate: string | null | undefined): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!cronSecret && !adminPassword) return false; // fail closed, not open
  if (!candidate) return false;

  if (cronSecret && timingSafeEqualString(candidate, cronSecret)) return true;
  if (adminPassword && timingSafeEqualString(candidate, adminPassword)) return true;
  return false;
}

/** Extracts the bearer token from an Authorization header, or null. */
export function bearerToken(authHeader: string | null): string | null {
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}
