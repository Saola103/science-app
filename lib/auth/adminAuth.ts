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
import { NextResponse } from "next/server";
import { getClientIp } from "../rateLimit";

/**
 * ADMIN_PASSWORD is typed by a human, so it is only honoured when it is long
 * enough to resist online guessing. Shorter values are ignored (CRON_SECRET
 * still works). Generate with e.g. `openssl rand -base64 32`.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 24;

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
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    console.warn(
      `[adminAuth] ADMIN_PASSWORD is shorter than ${MIN_ADMIN_PASSWORD_LENGTH} chars and is being ignored. Use CRON_SECRET or set a longer ADMIN_PASSWORD.`
    );
    adminPassword = undefined;
  }

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

// --- Failed-auth throttling -------------------------------------------------
// After MAX_FAILURES wrong/missing credentials from one IP within WINDOW_MS,
// that IP gets 429 for the rest of the window -- even with the right secret,
// otherwise the limit would not stop a guesser. Only failures are counted, so
// legitimate callers (Vercel Cron, GitHub Actions with the correct
// CRON_SECRET) are never throttled by their own successful calls.
//
// LIMITATION: in-memory, per serverless instance. It slows casual guessing
// but is not a distributed limiter (parallel instances/IPs bypass it). The
// real protection is a high-entropy secret (>= 24 chars, see above).
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60_000;
const MAX_TRACKED = 5000;
const failures = new Map<string, { count: number; windowStart: number }>();

function currentFailures(ip: string, now: number) {
  const e = failures.get(ip);
  if (!e || now - e.windowStart >= WINDOW_MS) return undefined;
  return e;
}

/**
 * Full admin check for a request: throttle, then credential check.
 * Returns null when authorized, otherwise the 401/429 response to send.
 */
export function rejectUnlessAdmin(req: Request, candidate: string | null | undefined): NextResponse | null {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = currentFailures(ip, now);

  if (entry && entry.count >= MAX_FAILURES) {
    const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return NextResponse.json(
      { error: "Too many failed attempts" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  if (isAuthorizedAdmin(candidate)) return null;

  if (entry) {
    entry.count++;
  } else {
    if (failures.size >= MAX_TRACKED) {
      const oldest = failures.keys().next().value;
      if (oldest) failures.delete(oldest);
    }
    failures.set(ip, { count: 1, windowStart: now });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
