/**
 * 新ソース(CC BY のニュース3機関・Europe PMC・Frontiers for Young Minds・PLOS)の
 * Groq 日次枠ガード(2026-11 追加)。
 *
 * 背景: Groq 無料枠は 200,000 トークン/日(lib/llm/index.ts)。収集は既に毎日かなりの量を使う。
 * 新ソースは「1回の収集あたりの新規件数の上限」と「当日使用量が天井を超えそうなら止まる」
 * 2段で抑える。既存ソース(arXiv/bioRxiv/NASA/NSF)の処理は一切変えない。
 * 重複スキップは既存の lib/pipeline/existing.ts(classifyAgainstDb)に乗せる。
 *
 * 見積もり式(1日あたりの最大消費トークン):
 *   最大 = (論文キャップ × 論文1件のトークン + ニュースキャップ × ニュース1件のトークン) × 1日の収集回数
 *        = (6 × 3,500 + 3 × 1,500) × 2 = 51,000
 *   論文1件 = やさしく + くわしく の2回要約。1回 ≒ 入力(プロンプト約1,000 + 本文約400)+ 出力(最大700)で
 *   約1,400〜1,800 → 保守的に 3,500/件。ニュース1件 = 1回 → 1,500/件(いずれも実測ではなく仮定)。
 * 実際は供給が少ない(Europe PMC神経科学誌 約2件/日、固定語 約1件/日、FYM 約0.3件/日、PLOS 約0.3件/日)ので
 * 通常は 1日 約12,000〜16,000 トークン。
 */
import { getTodayGroqUsage } from "../llm/dailyUsage";

/** 1回の収集で新ソースから処理する論文の上限(合計) */
export const OPEN_ACCESS_PAPERS_PER_RUN = 6;
/** ストリームごとの上限(合計上限との二重の抑え) */
export const OPEN_ACCESS_STREAM_CAPS = {
  epmc_journals: 3,
  epmc_topics: 2,
  frontiers_young_minds: 1,
  plos_author_summary: 1,
} as const;
/** 1回の収集で新ニュース機関(ESO/ESA)から処理する記事の上限(合計) */
export const NEW_NEWS_PER_RUN = 3;

/** 見積もり用の1件あたりトークン(仮定) */
export const EST_TOKENS_PER_PAPER = 3_500;
export const EST_TOKENS_PER_NEWS = 1_500;

/** 当日の使用トークンがこれ以上なら新ソースの処理を始めない(残り80k以上を既存処理・公開機能・修復cronに残す) */
export const NEW_SOURCES_USAGE_CEILING = 120_000;
/** 使用量が読めない(migration未適用/読み取り失敗)ときに許す最大件数(保守的に少なく) */
export const UNKNOWN_USAGE_MAX_ITEMS = 2;
/** 収集開始からこの時間(ms)を超えたら新ソースの処理を始めない(maxDuration=300秒に余裕を残す) */
export const NEW_SOURCES_DEADLINE_MS = 200_000;

/** 収集開始からの経過が締切を超えたか。外部取得・DB照会の「前」にも使う(R2-08)。 */
export function isPastDeadline(startedAt: number, now: number = Date.now()): boolean {
  return now - startedAt > NEW_SOURCES_DEADLINE_MS;
}

/** arXiv取り込みの締切。maxDuration=300秒の手前(Groq/待機の1件分の余裕)で次回へ持ち越す(R3-01) */
export const ARXIV_DEADLINE_MS = 260_000;

export function isPastArxivDeadline(startedAt: number, now: number = Date.now()): boolean {
  return now - startedAt > ARXIV_DEADLINE_MS;
}

export type GateInput = {
  processed: number;
  cap: number;
  elapsedMs: number;
  estTokens: number;
  usage: { tokensUsed: number; available: boolean };
};
export type GateDecision = { ok: true } | { ok: false; reason: "cap" | "deadline" | "usage" };

/** 純粋関数: 次の1件を処理してよいか。 */
export function decideGate(i: GateInput): GateDecision {
  if (i.processed >= i.cap) return { ok: false, reason: "cap" };
  if (i.elapsedMs > NEW_SOURCES_DEADLINE_MS) return { ok: false, reason: "deadline" };
  if (i.usage.available) {
    if (i.usage.tokensUsed + i.estTokens > NEW_SOURCES_USAGE_CEILING) return { ok: false, reason: "usage" };
  } else if (i.processed >= UNKNOWN_USAGE_MAX_ITEMS) {
    return { ok: false, reason: "usage" };
  }
  return { ok: true };
}

/** 純粋関数: 候補を「ストリームごとの上限」と「合計上限」に収める(先頭=新しい順を優先)。 */
export function applyCaps<T extends { stream: string }>(
  items: T[],
  streamCaps: Record<string, number>,
  totalCap: number
): T[] {
  const perStream = new Map<string, number>();
  const out: T[] = [];
  for (const it of items) {
    if (out.length >= totalCap) break;
    const n = perStream.get(it.stream) ?? 0;
    if (n >= (streamCaps[it.stream] ?? 0)) continue;
    perStream.set(it.stream, n + 1);
    out.push(it);
  }
  return out;
}

/** 1回の収集の中で新ソースの処理可否を判定する(件数を数え、毎回その時点の日次使用量を読む)。 */
export class NewSourceGate {
  private processed = 0;
  public stoppedBy: "cap" | "deadline" | "usage" | null = null;
  constructor(
    private readonly startedAt: number,
    private readonly cap: number,
    private readonly estTokens: number,
    private readonly readUsage: typeof getTodayGroqUsage = getTodayGroqUsage
  ) {}

  /** 1件処理する直前に呼ぶ。false なら処理しない(以降も呼べば同じ理由で false になる)。 */
  async allow(): Promise<boolean> {
    if (this.stoppedBy) return false;
    const usage = await this.readUsage();
    const d = decideGate({
      processed: this.processed,
      cap: this.cap,
      elapsedMs: Date.now() - this.startedAt,
      estTokens: this.estTokens,
      usage,
    });
    if (d.ok === false) {
      this.stoppedBy = d.reason;
      console.warn(`[NewSources] stop (${d.reason}) after ${this.processed} item(s); usage=${usage.available ? usage.tokensUsed : "unknown"}`);
      return false;
    }
    this.processed++;
    return true;
  }

  get count(): number {
    return this.processed;
  }
}
