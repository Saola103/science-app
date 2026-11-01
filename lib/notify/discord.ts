/**
 * Optional Discord summary for the collection cron. No-op unless
 * DISCORD_WEBHOOK_URL is set. Never throws (a notification problem must not
 * fail the cron) and never logs the webhook URL.
 */
import type { CollectionHealth } from "../health/collectionHealth";

export type CollectionSummary = {
  totalNew: number;
  totalRepaired: number;
  totalSkipped: number;
  totalErrors: number;
};

export function formatCollectionMessage(s: CollectionSummary, health: CollectionHealth | null): string {
  const lines: string[] = [];
  if (health && health.status !== "ok") {
    lines.push(`:warning: WARNING status=${health.status} (${health.reasons.join(", ")})`);
  } else if (!health) {
    lines.push(":warning: WARNING health check unavailable");
  }
  const tpd = health ? `${Math.round(health.groq.today.ratio * 100)}%` : "n/a";
  lines.push(
    `POCKET DIVE collect: new=${s.totalNew} repaired=${s.totalRepaired} skipped=${s.totalSkipped} errors=${s.totalErrors} / Groq TPD today=${tpd}`
  );
  return lines.join("\n");
}

export async function sendDiscord(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`[discord] webhook responded ${res.status}`);
  } catch {
    console.warn("[discord] webhook send failed");
  }
}
