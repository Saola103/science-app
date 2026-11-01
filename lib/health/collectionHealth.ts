/**
 * Collection health: freshness of papers/news and today's Groq token usage.
 * Used by GET /api/health/collection and the optional Discord summary.
 * Returns only counts/timestamps/ratios -- never keys or env values.
 */
import { getSupabaseServerClient } from "../supabase/serviceClient";

export const GROQ_TPD_LIMIT = 200_000;
export const PAPERS_STALE_HOURS = 36;
export const NEWS_STALE_HOURS = 18;
export const BUDGET_HIGH_RATIO = 0.8;

export type HealthStatus = "ok" | "stale" | "budget_high";

export type CollectionHealth = {
  status: HealthStatus;
  reasons: string[];
  checkedAt: string;
  papers: { latestCreatedAt: string | null; ageHours: number | null; staleAfterHours: number };
  news: { latestCreatedAt: string | null; ageHours: number | null; staleAfterHours: number };
  groq: {
    limit: number;
    today: { date: string; tokens: number; ratio: number };
    yesterday: { date: string; tokens: number; ratio: number };
  };
};

/** Pure status decision. stale takes precedence over budget_high; both are listed in reasons. */
export function computeStatus(input: {
  papersAgeHours: number | null;
  newsAgeHours: number | null;
  todayRatio: number;
}): { status: HealthStatus; reasons: string[] } {
  const reasons: string[] = [];
  if (input.papersAgeHours === null || input.papersAgeHours > PAPERS_STALE_HOURS) reasons.push("papers_stale");
  if (input.newsAgeHours === null || input.newsAgeHours > NEWS_STALE_HOURS) reasons.push("news_stale");
  const stale = reasons.length > 0;
  if (input.todayRatio > BUDGET_HIGH_RATIO) reasons.push("budget_high");
  return { status: stale ? "stale" : reasons.length ? "budget_high" : "ok", reasons };
}

function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function latestCreatedAt(table: "papers" | "news"): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`health query failed (${table}): ${error.message}`);
  return data?.[0]?.created_at ?? null;
}

export async function getCollectionHealth(now: Date = new Date()): Promise<CollectionHealth> {
  const supabase = getSupabaseServerClient();
  const today = utcDate(now);
  const yesterday = utcDate(new Date(now.getTime() - 86_400_000));

  const [papersAt, newsAt, usage] = await Promise.all([
    latestCreatedAt("papers"),
    latestCreatedAt("news"),
    supabase.from("groq_daily_usage").select("usage_date, tokens_used").in("usage_date", [today, yesterday]),
  ]);
  if (usage.error) throw new Error(`health query failed (groq_daily_usage): ${usage.error.message}`);

  const tokensFor = (date: string) =>
    Number(usage.data?.find((r: { usage_date: string }) => r.usage_date === date)?.tokens_used ?? 0);
  const ageHours = (iso: string | null) =>
    iso ? Math.round(((now.getTime() - new Date(iso).getTime()) / 3_600_000) * 10) / 10 : null;
  const ratio = (t: number) => Math.round((t / GROQ_TPD_LIMIT) * 1000) / 1000;

  const papersAge = ageHours(papersAt);
  const newsAge = ageHours(newsAt);
  const todayTokens = tokensFor(today);
  const { status, reasons } = computeStatus({
    papersAgeHours: papersAge,
    newsAgeHours: newsAge,
    todayRatio: todayTokens / GROQ_TPD_LIMIT,
  });

  return {
    status,
    reasons,
    checkedAt: now.toISOString(),
    papers: { latestCreatedAt: papersAt, ageHours: papersAge, staleAfterHours: PAPERS_STALE_HOURS },
    news: { latestCreatedAt: newsAt, ageHours: newsAge, staleAfterHours: NEWS_STALE_HOURS },
    groq: {
      limit: GROQ_TPD_LIMIT,
      today: { date: today, tokens: todayTokens, ratio: ratio(todayTokens) },
      yesterday: { date: yesterday, tokens: tokensFor(yesterday), ratio: ratio(tokensFor(yesterday)) },
    },
  };
}
