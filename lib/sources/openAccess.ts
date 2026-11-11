/**
 * CC BY のオープンアクセス論文の取得(2026-11 追加。法務整備書 第2版 G-1 #6〜#8)。
 *
 *   - Europe PMC REST API  : 神経科学OA誌(固定リスト)と固定語(意識・麻酔・睡眠)の検索。source="EuropePMC"
 *   - Crossref API         : Frontiers for Young Minds(アブストラクトは Crossref に含まれる)。source="FrontiersYoungMinds"
 *   - Europe PMC 全文XML   : PLOS Computational Biology の "Author summary" だけを抜き出す。source="PLOS"
 *
 * ゲート(G-4 #5): ライセンス値の「完全一致」のみ収集する。
 *   Europe PMC は license が文字列 "cc by"、Crossref は license URL が CC BY 4.0 の URL と一致するものだけ。
 *   空欄・不明・cc by-nc/-nd/-sa 等は取り込まない。保存する license は取り込み時に検証済みの印として "cc_by"。
 * 保存するのはアブストラクト/著者要約のテキストのみ。全文XMLは要約の抜き出しに一時的に使うだけで保存しない。
 * 訂正記事(Correction/Erratum/Retraction 等)は除外。外部fetchには必ず短いタイムアウトを付ける
 * (1つの遅いサービスが cron の maxDuration=300秒を食い潰さないため)。
 * 許可する source / license は lib/sources/policy.ts が単一の真実。
 */

import { CONTACT_EMAIL } from "../site/contact";
import { fetchJsonBounded, fetchTextBounded } from "../http/boundedFetch";
import { CROSSREF_CC_BY_4_URL, EUROPEPMC_LICENSE_RAW } from "./policy";

export type OpenAccessPaper = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt?: string;
  url: string;
  journal?: string;
  pmcid?: string;
  license: "cc_by";
  source: "EuropePMC" | "FrontiersYoungMinds" | "PLOS";
  /** 取得元の区分(キャップ・ログ用。DBには保存しない) */
  stream: OpenAccessStream;
};

export type OpenAccessStream = "epmc_journals" | "epmc_topics" | "frontiers_young_minds" | "plos_author_summary";

const EPMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
const EPMC_FULLTEXT = (pmcid: string) => `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`;
const CROSSREF_WORKS = "https://api.crossref.org/works";

/** 外部サービス1回あたりのタイムアウト(ms)。 */
export const FETCH_TIMEOUT_MS = 10_000;
const FULLTEXT_TIMEOUT_MS = 15_000;
/** 応答サイズ上限(R2-05)。検索JSONは通常数百KB、PLOSの全文XMLは数MBに達しうる。 */
export const SEARCH_MAX_BYTES = 4 * 1024 * 1024;
export const FULLTEXT_MAX_BYTES = 8 * 1024 * 1024;
/** cleanText が見る生テキストの上限(タグ除去の正規表現が二次的に遅くならないように。R2-05) */
export const CLEAN_TEXT_MAX_RAW = 30_000;

/** 連絡先付き User-Agent(Crossref の polite pool / Europe PMC への礼儀) */
const USER_AGENT = `PocketDive_Bot/1.0 (https://pocketdive.vercel.app; mailto:${CONTACT_EMAIL})`;

const ABSTRACT_MAX_CHARS = 3000;
const ABSTRACT_MIN_CHARS = 100;

/** 検索対象の神経科学OA誌(Europe PMC の JOURNAL: 検索で使う誌名。法務整備書 D-3) */
export const EPMC_JOURNALS: readonly string[] = ["Brain Commun", "eNeuro", "J Neurosci", "Neurosci Conscious"];

/** 意識・麻酔・睡眠の固定語(ユーザー入力や個人情報は含めない) */
const TOPIC_TITLE_TERMS = [
  "consciousness",
  "anesthesia",
  "anesthetic*",
  "anaesthe*",
  "sleep",
  "coma",
  "propofol",
  "isoflurane",
  "ketamine",
];
const NEURO_ABSTRACT_TERMS = ["brain", "neuron*", "cortex", "cortical", "EEG"];

const orGroup = (field: string, terms: readonly string[]) =>
  "(" + terms.map((t) => `${field}:"${t}"`).join(" OR ") + ")";

// ── 純粋関数(テスト対象) ────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
};

/** HTML/JATSタグを除去し、実体参照を戻し、空白を畳む(二重エスケープ `&lt;i&gt;` も処理) */
export function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.slice(0, CLEAN_TEXT_MAX_RAW);
  for (let i = 0; i < 2; i++) {
    s = s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m).replace(/<\/?[a-zA-Z][^>]*>/g, " ");
  }
  return s.replace(/\s+/g, " ").trim();
}

const CORRECTION_TITLE = /^\s*(correction|corrigendum|erratum|retraction|retracted|expression of concern|addendum)\b/i;
const EXCLUDED_PUB_TYPES = ["published erratum", "correction", "retraction of publication", "retracted publication", "comment", "editorial", "news", "letter"];

/** 症例報告(Case Reports)か。固定語検索(意識・麻酔・睡眠)で Cureus 等の症例報告が多く混ざるため除外する。 */
export function isCaseReport(pubTypes: readonly string[] | undefined): boolean {
  return (pubTypes ?? []).some((t) => /^case reports?$/i.test(t.trim()));
}

/** 訂正・撤回・コメント類か */
export function isCorrectionLike(title: string, pubTypes: readonly string[] | undefined): boolean {
  if (CORRECTION_TITLE.test(title)) return true;
  return (pubTypes ?? []).some((t) => EXCLUDED_PUB_TYPES.includes(t.toLowerCase()));
}

/** Europe PMC の license 値が許可値(完全一致)か。 */
export function isEuropePmcLicenseAllowed(license: unknown): boolean {
  return license === EUROPEPMC_LICENSE_RAW;
}

/** Crossref の license 配列に CC BY 4.0 の URL が(完全一致で)あるか。 */
export function hasCrossrefCcBy4(licenses: unknown): boolean {
  return Array.isArray(licenses) && licenses.some((l) => l && (l as { URL?: unknown }).URL === CROSSREF_CC_BY_4_URL);
}

/**
 * `YYYY-MM-DD` だけを受け付け(実在する日付で)、未来日は今日に丸めて `...T00:00:00Z` を返す(R2-06)。
 * 形式が違えば undefined(呼び出し側の既定=取得時刻になる)。
 */
export function toPublishedAt(ymdStr: string | undefined | null, now: Date = new Date()): string | undefined {
  if (!ymdStr || !/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) return undefined;
  const d = new Date(`${ymdStr}T00:00:00Z`);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== ymdStr) return undefined;
  const today = now.toISOString().slice(0, 10);
  return `${ymdStr > today ? today : ymdStr}T00:00:00Z`;
}

/** `id` に使える文字だけか(existing.ts の SAFE_ID と同じ範囲) */
const SAFE = /^[A-Za-z0-9._:/~+-]+$/;

type EpmcRecord = {
  id?: string;
  source?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  abstractText?: string;
  license?: string;
  isOpenAccess?: string;
  firstPublicationDate?: string;
  pubTypeList?: { pubType?: string[] };
  journalInfo?: { journal?: { title?: string } };
};

/** Europe PMC の1レコードを論文に変換。ゲートに落ちたら null。 */
export function parseEpmcRecord(r: EpmcRecord, stream: "epmc_journals" | "epmc_topics" | "plos_author_summary"): OpenAccessPaper | null {
  if (!isEuropePmcLicenseAllowed(r.license)) return null;
  if (r.isOpenAccess !== "Y" || r.source !== "MED") return null; // プレプリント(PPR)等は対象外
  const pmcid = r.pmcid;
  if (!pmcid || !/^PMC\d+$/.test(pmcid)) return null;
  const title = cleanText(r.title);
  if (!title || isCorrectionLike(title, r.pubTypeList?.pubType)) return null;
  if (stream === "epmc_topics" && isCaseReport(r.pubTypeList?.pubType)) return null; // 固定語検索のみ症例報告を除外
  const abstract = cleanText(r.abstractText).slice(0, ABSTRACT_MAX_CHARS);
  if (abstract.length < ABSTRACT_MIN_CHARS) return null;
  const doi = r.doi && SAFE.test(r.doi) ? r.doi : null;
  const authors = (r.authorString ?? "")
    .replace(/\.$/, "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 10);
  return {
    id: `${stream === "plos_author_summary" ? "plos" : "epmc"}:${pmcid}`,
    title,
    abstract,
    authors,
    publishedAt: toPublishedAt(r.firstPublicationDate),
    url: doi ? `https://doi.org/${doi}` : `https://europepmc.org/article/PMC/${pmcid}`,
    journal: cleanText(r.journalInfo?.journal?.title) || undefined,
    pmcid,
    license: "cc_by",
    source: stream === "plos_author_summary" ? "PLOS" : "EuropePMC",
    stream,
  };
}

type CrossrefItem = {
  DOI?: string;
  title?: string[];
  type?: string;
  abstract?: string;
  license?: unknown;
  author?: { given?: string; family?: string }[];
  "container-title"?: string[];
  published?: { "date-parts"?: number[][] };
};

/** Crossref の1件を Frontiers for Young Minds の論文に変換。ゲートに落ちたら null。 */
export function parseCrossrefItem(it: CrossrefItem): OpenAccessPaper | null {
  if (it.type !== "journal-article") return null;
  if ((it["container-title"]?.[0] ?? "") !== "Frontiers for Young Minds") return null; // フィルタは曖昧一致なので厳密に再確認
  if (!hasCrossrefCcBy4(it.license)) return null;
  const doi = it.DOI;
  if (!doi || !SAFE.test(doi)) return null;
  const title = cleanText(it.title?.[0]);
  if (!title || isCorrectionLike(title, undefined)) return null;
  const abstract = cleanText(it.abstract).slice(0, ABSTRACT_MAX_CHARS);
  if (abstract.length < ABSTRACT_MIN_CHARS) return null;
  const dp = it.published?.["date-parts"]?.[0];
  const publishedAt =
    dp && dp[0] ? toPublishedAt(`${dp[0]}-${String(dp[1] ?? 1).padStart(2, "0")}-${String(dp[2] ?? 1).padStart(2, "0")}`) : undefined;
  const authors = (it.author ?? [])
    .map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .slice(0, 10);
  return {
    id: `frym:${doi}`,
    title,
    abstract,
    authors,
    publishedAt,
    url: `https://doi.org/${doi}`,
    journal: "Frontiers for Young Minds",
    license: "cc_by",
    source: "FrontiersYoungMinds",
    stream: "frontiers_young_minds",
  };
}

/** 全文XMLから Author summary だけを取り出す。見つからない/CC BY 4.0の記載が無ければ null。全文は返さない。 */
export function extractAuthorSummary(xml: string): string | null {
  if (!xml.includes("creativecommons.org/licenses/by/4.0")) return null;
  // 正規表現ではなく indexOf で切り出す(閉じタグが無い巨大入力でも線形時間。R2-05)
  const OPEN = '<abstract abstract-type="summary">';
  const start = xml.indexOf(OPEN);
  if (start < 0) return null;
  const end = xml.indexOf("</abstract>", start + OPEN.length);
  if (end < 0) return null;
  const text = cleanText(xml.slice(start + OPEN.length, end)).replace(/^Author summary\s*/i, "").slice(0, ABSTRACT_MAX_CHARS);
  return text.length >= ABSTRACT_MIN_CHARS ? text : null;
}

// ── 検索クエリ ────────────────────────────────────────────────────────────

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function baseEpmcQuery(daysBack: number, now: Date): string {
  const from = new Date(now.getTime() - daysBack * 86_400_000);
  return `LICENSE:"${EUROPEPMC_LICENSE_RAW}" AND OPEN_ACCESS:y AND SRC:MED AND FIRST_PDATE:[${ymd(from)} TO ${ymd(now)}]`;
}

export function buildJournalsQuery(daysBack = 14, now = new Date()): string {
  return `${baseEpmcQuery(daysBack, now)} AND ${orGroup("JOURNAL", EPMC_JOURNALS)}`;
}

export function buildTopicsQuery(daysBack = 14, now = new Date()): string {
  return `${baseEpmcQuery(daysBack, now)} AND ${orGroup("TITLE", TOPIC_TITLE_TERMS)} AND ${orGroup("ABSTRACT", NEURO_ABSTRACT_TERMS)} AND NOT PUB_TYPE:"Case Reports"`;
}

export function buildPlosQuery(daysBack = 14, now = new Date()): string {
  return `${baseEpmcQuery(daysBack, now)} AND JOURNAL:"PLoS Comput Biol" AND PUB_TYPE:"research-article" AND ${orGroup("ABSTRACT", [...NEURO_ABSTRACT_TERMS, "neural", "synap*"])}`;
}

// ── 取得(ネットワーク) ───────────────────────────────────────────────────

const headersFor = (accept: string) => ({ "User-Agent": USER_AGENT, Accept: accept });

async function searchEuropePmc(query: string, pageSize: number): Promise<EpmcRecord[]> {
  const params = new URLSearchParams({
    query,
    format: "json",
    resultType: "core",
    pageSize: String(pageSize),
    sort: "P_PDATE_D desc",
  });
  const data = await fetchJsonBounded<{ resultList?: { result?: EpmcRecord[] } }>(`${EPMC_SEARCH}?${params}`, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: SEARCH_MAX_BYTES,
    headers: headersFor("application/json"),
  });
  return data.resultList?.result ?? [];
}

/** 神経科学OA誌(固定リスト)の直近 CC BY 論文 */
export async function fetchEuropePmcJournalPapers(pageSize = 15): Promise<OpenAccessPaper[]> {
  try {
    const rows = await searchEuropePmc(buildJournalsQuery(), pageSize);
    return rows.map((r) => parseEpmcRecord(r, "epmc_journals")).filter((p): p is OpenAccessPaper => !!p);
  } catch (e) {
    console.warn("[OpenAccess] Europe PMC (journals) failed:", e);
    return [];
  }
}

/** 意識・麻酔・睡眠の固定語検索の直近 CC BY 論文 */
export async function fetchEuropePmcTopicPapers(pageSize = 15): Promise<OpenAccessPaper[]> {
  try {
    const rows = await searchEuropePmc(buildTopicsQuery(), pageSize);
    return rows.map((r) => parseEpmcRecord(r, "epmc_topics")).filter((p): p is OpenAccessPaper => !!p);
  } catch (e) {
    console.warn("[OpenAccess] Europe PMC (topics) failed:", e);
    return [];
  }
}

/** Frontiers for Young Minds の直近記事(Crossref。アブストラクトは Crossref 側にある) */
export async function fetchFrontiersYoungMindsPapers(rows = 10, daysBack = 30): Promise<OpenAccessPaper[]> {
  try {
    const from = ymd(new Date(Date.now() - daysBack * 86_400_000));
    const params = new URLSearchParams({
      filter: `prefix:10.3389,container-title:Frontiers for Young Minds,from-pub-date:${from}`,
      rows: String(rows),
      sort: "published",
      order: "desc",
      select: "DOI,title,license,published,abstract,author,container-title,type",
    });
    const data = await fetchJsonBounded<{ message?: { items?: CrossrefItem[] } }>(`${CROSSREF_WORKS}?${params}`, {
      timeoutMs: FETCH_TIMEOUT_MS,
      maxBytes: SEARCH_MAX_BYTES,
      headers: headersFor("application/json"),
    });
    return (data.message?.items ?? []).map(parseCrossrefItem).filter((p): p is OpenAccessPaper => !!p);
  } catch (e) {
    console.warn("[OpenAccess] Crossref (Frontiers for Young Minds) failed:", e);
    return [];
  }
}

/**
 * PLOS Computational Biology の候補(神経系の語を含む直近CC BY研究論文)。
 * Author summary の有無は全文XMLを見ないと分からないため、ここでは候補だけ返す。
 * PLOS本体(journals.plos.org, crawl-delay 30秒)にはアクセスせず、Europe PMC のみを使う。
 */
export async function fetchPlosCandidates(pageSize = 10): Promise<OpenAccessPaper[]> {
  try {
    const rows = await searchEuropePmc(buildPlosQuery(), pageSize);
    return rows.map((r) => parseEpmcRecord(r, "plos_author_summary")).filter((p): p is OpenAccessPaper => !!p);
  } catch (e) {
    console.warn("[OpenAccess] Europe PMC (PLOS candidates) failed:", e);
    return [];
  }
}

/**
 * 候補1件の Author summary を Europe PMC の全文XMLから取り出す。
 * 全文は保存せず、要約テキストだけを abstract に差し替えて返す。無ければ null(=収集しない)。
 */
export async function attachPlosAuthorSummary(candidate: OpenAccessPaper): Promise<OpenAccessPaper | null> {
  if (!candidate.pmcid) return null;
  try {
    const xml = await fetchTextBounded(EPMC_FULLTEXT(candidate.pmcid), {
      timeoutMs: FULLTEXT_TIMEOUT_MS,
      maxBytes: FULLTEXT_MAX_BYTES,
      headers: headersFor("application/xml"),
    });
    const summary = extractAuthorSummary(xml);
    return summary ? { ...candidate, abstract: summary } : null;
  } catch (e) {
    console.warn(`[OpenAccess] fullTextXML failed for ${candidate.pmcid}:`, e);
    return null;
  }
}
