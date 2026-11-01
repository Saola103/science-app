/**
 * Already-processed detection for the collection pipeline.
 *
 * Before this existed, collectNews()/processPaper() re-summarized every
 * fetched candidate on every run and overwrote the row via upsert(onConflict:id),
 * wasting Groq TPD (papers: 2 summaries each) and reverting any category that
 * had been fixed in the DB afterwards.
 *
 * "Processed" is defined to match what cron/fix-summaries considers healthy,
 * so the two jobs never fight over the same row:
 *   papers: summary_general AND summary_expert present, and
 *           hasValidHeadline(summary_general)
 *   news:   hasValidHeadline(summary_general)
 * Anything else that exists (null / old-format summary) is classified
 * "repair" and is re-summarized; absent IDs are "new".
 * Missing embeddings are NOT part of the definition: backfilling those is
 * fix-summaries' job (Gemini quota is separate from Groq tokens).
 */
import { hasValidHeadline } from "../format/summaryText";
import { getSupabaseServerClient } from "../supabase/serviceClient";

export type ExistingRow = {
  id: string;
  summary_general: string | null;
  summary_expert?: string | null;
};

export type Classification = {
  newIds: string[];
  repairIds: string[];
  skipIds: string[];
};

const CHUNK_SIZE = 50; // keeps the .in() URL comfortably short

export function isProcessedRow(table: "papers" | "news", row: ExistingRow): boolean {
  if (!hasValidHeadline(row.summary_general)) return false;
  if (table === "papers" && !row.summary_expert) return false;
  return true;
}

/** Pure: split candidate ids by what the DB already holds. */
export function classifyCandidates(
  table: "papers" | "news",
  candidateIds: string[],
  existing: ExistingRow[]
): Classification {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const out: Classification = { newIds: [], repairIds: [], skipIds: [] };
  const seen = new Set<string>();
  for (const id of candidateIds) {
    if (seen.has(id)) continue; // duplicate within the same fetch
    seen.add(id);
    const row = byId.get(id);
    if (!row) out.newIds.push(id);
    else if (isProcessedRow(table, row)) out.skipIds.push(id);
    else out.repairIds.push(id);
  }
  return out;
}

/**
 * One query per CHUNK_SIZE ids. THROWS on any DB error: callers must treat that
 * as "skip this batch" (fail-safe), never as "nothing exists" -- the latter
 * would re-summarize everything and burn the daily token budget.
 */
export async function fetchExistingRows(table: "papers" | "news", ids: string[]): Promise<ExistingRow[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const schema = process.env.SUPABASE_SCHEMA ?? "public";
  const columns = table === "papers" ? "id, summary_general, summary_expert" : "id, summary_general";
  const rows: ExistingRow[] = [];
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.schema(schema).from(table).select(columns).in("id", chunk);
    if (error) throw new Error(`existing-id lookup failed (${table}): ${error.message}`);
    rows.push(...((data ?? []) as unknown as ExistingRow[]));
  }
  return rows;
}

/** Convenience: look up and classify in one go (throws on DB error). */
export async function classifyAgainstDb<T extends { id: string }>(
  table: "papers" | "news",
  items: T[]
): Promise<{ toProcess: T[]; newCount: number; repairCount: number; skipped: number }> {
  const existing = await fetchExistingRows(table, items.map((i) => i.id));
  const c = classifyCandidates(table, items.map((i) => i.id), existing);
  const skip = new Set(c.skipIds);
  const seen = new Set<string>();
  const toProcess = items.filter((i) => {
    if (skip.has(i.id) || seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  return { toProcess, newCount: c.newIds.length, repairCount: c.repairIds.length, skipped: c.skipIds.length };
}
