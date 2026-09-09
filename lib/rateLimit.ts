/**
 * Best-effort per-IP rate limiting for the routes that spend LLM/API budget
 * per request (chat, search). This is in-memory, so it only limits requests
 * hitting the same warm serverless instance — not a real distributed limiter.
 * That's a deliberate trade-off: a proper distributed limiter needs an
 * external store (e.g. Upstash Redis), which is a new paid-ish dependency the
 * project has otherwise avoided. This still stops casual scripted abuse from
 * quietly burning through the shared free-tier Groq/Gemini budget, which is
 * the realistic threat here (not a sophisticated distributed attacker).
 */

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

// Bound memory: if this ever fills up (many distinct IPs), drop the oldest.
const MAX_TRACKED_IPS = 5000;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns true if the request is within budget. `limit` requests per
 * `windowMs` per (key = ip + ":" + routeName).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    if (buckets.size >= MAX_TRACKED_IPS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count++;
  return true;
}
