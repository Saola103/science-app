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
 * IDs are interpolated into a PostgREST `.in()` filter, so anything outside this
 * set (quotes, commas, parentheses, whitespace...) could break or inject into
 * the filter. Covers arXiv URLs (http://arxiv.org/abs/...v1), bioRxiv
 * (server:doi) and RSS (rss-...). Non-matching IDs are excluded and never sent
 * to the LLM (fail-safe).
 */
const SAFE_ID = /^[A-Za-z0-9._:\/~+-]+$/;
export function isSafeId(id: string): boolean {
  return typeof id === "string" && SAFE_ID.test(id);
}

export type ChunkQuery = (ids: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;

export type FetchResult = {
  rows: ExistingRow[];
  /** IDs rejected by SAFE_ID (excluded from processing). */
  invalidIds: string[];
  /** Valid IDs whose lookup still failed after per-ID retry (excluded, counted as errors). */
  failedIds: string[];
};

function truncId(id: string): string {
  return JSON.stringify(id.length > 80 ? id.slice(0, 80) + "..." : id);
}

/**
 * Validates IDs, then one query per CHUNK_SIZE ids. A failed chunk is retried
 * per ID; only IDs that still fail are returned in failedIds. NEVER treats a
 * failure as "nothing exists" -- that would re-summarize everything and burn
 * the daily token budget.
 */
export async function fetchExistingRowsWith(query: ChunkQuery, ids: string[]): Promise<FetchResult> {
  const unique = [...new Set(ids)];
  const invalidIds = unique.filter((id) => !isSafeId(id));
  if (invalidIds.length > 0) {
    console.warn(
      `[existing] excluded ${invalidIds.length} id(s) with unsafe characters: ${invalidIds.slice(0, 3).map(truncId).join(", ")}`
    );
  }
  const valid = unique.filter(isSafeId);
  const rows: ExistingRow[] = [];
  const failedIds: string[] = [];
  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk = valid.slice(i, i + CHUNK_SIZE);
    const res = await query(chunk);
    if (!res.error) {
      rows.push(...((res.data ?? []) as ExistingRow[]));
      continue;
    }
    console.warn(`[existing] chunk lookup failed (${chunk.length} ids), retrying per id: ${res.error.message}`);
    for (const id of chunk) {
      const r = await query([id]);
      if (r.error) failedIds.push(id);
      else rows.push(...((r.data ?? []) as ExistingRow[]));
    }
  }
  if (failedIds.length > 0) {
    console.error(
      `[existing] ${failedIds.length} id(s) failed lookup even individually; skipped: ${failedIds.slice(0, 3).map(truncId).join(", ")}`
    );
  }
  return { rows, invalidIds, failedIds };
}

export async function fetchExistingRows(table: "papers" | "news", ids: string[]): Promise<FetchResult> {
  const supabase = getSupabaseServerClient();
  const schema = process.env.SUPABASE_SCHEMA ?? "public";
  const columns = table === "papers" ? "id, summary_general, summary_expert" : "id, summary_general";
  return fetchExistingRowsWith(
    async (chunk) => {
      const { data, error } = await supabase.schema(schema).from(table).select(columns).in("id", chunk);
      return { data: data as unknown[] | null, error: error ? { message: error.message } : null };
    },
    ids
  );
}

/** Convenience: look up and classify in one go. Unsafe/unresolved ids are excluded and counted in errorCount. */
export async function classifyAgainstDb<T extends { id: string }>(
  table: "papers" | "news",
  items: T[]
): Promise<{ toProcess: T[]; newCount: number; repairCount: number; skipped: number; errorCount: number }> {
  const { rows, invalidIds, failedIds } = await fetchExistingRows(table, items.map((i) => i.id));
  const exclude = new Set([...invalidIds, ...failedIds]);
  const ok = items.filter((i) => !exclude.has(i.id));
  const c = classifyCandidates(table, ok.map((i) => i.id), rows);
  const skip = new Set(c.skipIds);
  const seen = new Set<string>();
  const toProcess = ok.filter((i) => {
    if (skip.has(i.id) || seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  return {
    toProcess,
    newCount: c.newIds.length,
    repairCount: c.repairIds.length,
    skipped: c.skipIds.length,
    errorCount: exclude.size,
  };
}
