/**
 * 収集・表示の許可ポリシー(リリースゲートG4 法務整備)。
 * 根拠: 20_ビジネス/進行中/ビジネス戦略/POCKET_DIVE_法務整備_G4.md 3章。
 * 収集(lib/sources)とフィード表示(app/api, app/actions 等)の両方がこのファイルを参照する。
 * 弁護士ではないAIによるリスク整理に基づく暫定ポリシーであり、適法性の断定ではない(要確認)。
 */

// ── ニュースRSS ───────────────────────────────────────────────────────────

/**
 * 許可するニュース情報源(source_name)。法務整備書で「許諾が明確・低リスク」と
 * 評価できる公的機関のみ(3-3 / 3-6: NASA, NSF。第2版G-1 #3〜#5: ESO, ESA/Webb, ESA/Hubble=CC BY 4.0)。
 * CERN は 2026-11-10 に除外(下記参照)。国立天文台は確認連絡の要否が未決のため未追加。
 * SQL側(migration 014)の news_public_read はこの配列のコピー。
 * 評価が書かれていない・リスクが高い・条件が重い情報源は除外側に倒している。
 * 除外理由は NEWS_EXCLUDED_REASONS を参照。追加は法務確認後に行うこと。
 * 要確認: NASAは第三者権利の素材が混ざりうる(画像は表示しないため本文のみ対象)。
 */
export const NEWS_ALLOWED_SOURCES: readonly string[] = ["NASA", "NSF", "ESO", "ESA/Webb", "ESA/Hubble"];

/**
 * 上記のうち、2026-11 に法務整備書 第2版 G章(G-1 #3〜#5)で追加した CC BY 4.0 の機関。
 * 1回の収集あたりの新規件数に上限を設けるGroq枠ガードの対象(lib/pipeline/openAccessBudget.ts)。
 * 国立天文台は確認連絡の要否が未決のため追加していない。
 */
export const NEWS_CC_BY_SOURCES: readonly string[] = ["ESO", "ESA/Webb", "ESA/Hubble"];

/** 除外している情報源と理由(ドキュメント目的。ロジックでは使わない)。 */
export const NEWS_EXCLUDED_REASONS: Record<string, string> = {
  "Phys.org": "Science X系。複製・公衆送信・AI目的の利用に書面許可が必要と読める(高リスク)",
  TechXplore: "Science X系(同上)",
  "Medical Xpress": "Science X系(同上)",
  "Science Daily": "RSSコンテンツのDB格納禁止と読める(高リスク)",
  "MIT News": "CC BY-NC-ND(改変不可)で、AIによる翻案要約と衝突しうる。法務整備書は低リスクと明記していないため除外",
  CERN: "許諾の条文を確認できず△に格下げ(2026-11-10 オーナー方針)。条文確認後に許可リストへ戻す",
  "Space.com": "Future plc。RSS・複製条項が未確認(評価なし)",
  "Live Science": "Future plc(同上)",
  "Popular Science": "民間媒体。個別規約の評価なし",
  "Science News": "民間媒体。個別規約の評価なし",
  "Quanta Magazine": "民間媒体。個別規約の評価なし",
  "Ars Technica": "民間媒体。個別規約の評価なし",
  Smithsonian: "評価なし",
  EarthSky: "評価なし",
  "New Atlas": "民間媒体。個別規約の評価なし",
  "Neuroscience News": "評価なし",
  PsyPost: "評価なし",
  "Universe Today": "評価なし",
  ScienceAlert: "過去に収集した分のみDBに残る(現在フィード対象外)。評価なし",
};

/** ニュース1件が表示対象か(許可リスト方式。SQL側は applyNewsVisibility で同じ基準) */
export function isAllowedNewsSource(sourceName: string | null | undefined): boolean {
  return !!sourceName && NEWS_ALLOWED_SOURCES.includes(sourceName);
}

/** RSSタイトルとして保存・プロンプトに入れる最大文字数(R2-04) */
export const NEWS_TITLE_MAX_CHARS = 300;

/** RSS説明文として保存する最大文字数(ニュース本文の複製を避けるため短く保つ) */
export const NEWS_DESCRIPTION_MAX_CHARS = 300;

// ── bioRxiv / medRxiv ライセンス ──────────────────────────────────────────

/**
 * bioRxiv API が返す license 値のうち、要約(翻案)して表示してよいもの。
 * CC BY と CC0 のみ。cc0_ng は CC0 系の表記(要確認: 一次情報で意味を再確認)。
 * 空欄・"cc_no"(許可なき再利用不可)・ND/NC系・過去に補完した "CC BY" 文字列は不明扱いで除外。
 */
export const PREPRINT_ALLOWED_LICENSES: readonly string[] = ["cc_by", "cc0", "cc0_ng"];

/**
 * 表示を許可する論文の source(許可リスト方式。DBの値と完全一致=大文字小文字も区別)。
 * PubMed・未知の source・null・小文字表記などは全て非表示。
 * フィード(PAPER_VISIBILITY_OR)と isPaperDisplayable は必ずこの定数から導く。
 */
export const PAPER_ALLOWED_SOURCES: readonly string[] = [
  "arXiv",
  "bioRxiv",
  "medRxiv",
  // 2026-11 追加(法務整備書 第2版 G-1 #6〜#8)。いずれも CC BY のみ(下記 OPEN_ACCESS_*)
  "EuropePMC",
  "FrontiersYoungMinds",
  "PLOS",
];
/** 上記のうちライセンス判定が必要なもの(bioRxiv系) */
export const LICENSE_CHECKED_PAPER_SOURCES: readonly string[] = ["bioRxiv", "medRxiv"];

/**
 * Europe PMC / Crossref / PLOS 経由で収集する CC BY 論文の source 値。
 * 収集時に「Europe PMC の license が文字列 "cc by" と完全一致」または
 * 「Crossref の license URL が CC BY 4.0 の URL と完全一致」のものだけを取り込み、
 * papers.license には正規化した "cc_by" を保存する(取り込み時に検証済みの印)。
 * 空欄・不明・cc by-nc / by-nd / by-sa 等は収集しない。
 */
export const OPEN_ACCESS_PAPER_SOURCES: readonly string[] = ["EuropePMC", "FrontiersYoungMinds", "PLOS"];
export const OPEN_ACCESS_ALLOWED_LICENSES: readonly string[] = ["cc_by"];
/** 取り込み側(フェッチャー)が受け付ける生のライセンス値(完全一致・大文字小文字も区別) */
export const EUROPEPMC_LICENSE_RAW = "cc by";
export const CROSSREF_CC_BY_4_URL = "https://creativecommons.org/licenses/by/4.0/";

export function isPreprintLicenseAllowed(license: string | null | undefined): boolean {
  return !!license && PREPRINT_ALLOWED_LICENSES.includes(license.trim().toLowerCase());
}

/**
 * 論文1件が表示対象か(許可リスト方式)。
 * arXiv は表示、bioRxiv/medRxiv は CC BY/CC0 系ライセンスのみ表示、それ以外は全て非表示。
 * SQL側の PAPER_VISIBILITY_OR と同じ基準(source は完全一致)。
 */
export function isPaperDisplayable(p: { source?: string | null; license?: string | null }): boolean {
  const src = p.source;
  if (!src || !PAPER_ALLOWED_SOURCES.includes(src)) return false;
  if (LICENSE_CHECKED_PAPER_SOURCES.includes(src)) return isPreprintLicenseAllowed(p.license);
  // CC BY 系: SQL(完全一致)と同じく trim / 大文字小文字の寛容化をしない
  if (OPEN_ACCESS_PAPER_SOURCES.includes(src)) return !!p.license && OPEN_ACCESS_ALLOWED_LICENSES.includes(p.license);
  return true;
}

/**
 * Supabase(PostgREST)クエリ用の可視性条件。isPaperDisplayable と同じ基準。
 * `.or(PAPER_VISIBILITY_OR)` で使う(共通適用は lib/sources/visibility.ts の applyPaperVisibility)。
 */
export const PAPER_VISIBILITY_OR = `source.eq.arXiv,and(source.in.(${LICENSE_CHECKED_PAPER_SOURCES.join(",")}),license.in.(${PREPRINT_ALLOWED_LICENSES.join(",")})),and(source.in.(${OPEN_ACCESS_PAPER_SOURCES.join(",")}),license.in.(${OPEN_ACCESS_ALLOWED_LICENSES.join(",")}))`;

// ── 出典行の帰属表示(CC BY: 出典・ライセンス・変更の表示) ───────────────────

/** 内部の source 値 → 画面に出す出典名(それ以外はそのまま) */
export const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  EuropePMC: "Europe PMC",
  FrontiersYoungMinds: "Frontiers for Young Minds",
  PLOS: "PLOS",
};

export function sourceDisplayName(source: string | null | undefined): string | null {
  if (!source) return null;
  return SOURCE_DISPLAY_NAMES[source] ?? source;
}

const CC_BY_4_NOTE = "ライセンス: CC BY 4.0(https://creativecommons.org/licenses/by/4.0/)";
const CC_BY_GENERIC_NOTE = "ライセンス: CC BY(版は原文ページに記載)";
const CHANGE_NOTE = "原文をAIが要約・日本語化しています(変更あり)";

/**
 * 既存の「出典: …」行に足す帰属文言。CC BY の情報源だけ返し、それ以外は null
 * (NASA/NSF/arXiv/bioRxiv 等の表示は変えない)。
 * 機関のニュースには「推奨を意味しない」旨も付ける。
 */
export function attributionFor(source: string | null | undefined): string | null {
  switch (source) {
    case "ESO":
      return `${CC_BY_4_NOTE}・${CHANGE_NOTE}・ESOの推奨を意味しません`;
    case "ESA/Webb":
    case "ESA/Hubble":
      return `${CC_BY_4_NOTE}・${CHANGE_NOTE}・ESAの推奨を意味しません`;
    case "FrontiersYoungMinds":
      return `${CC_BY_4_NOTE}・${CHANGE_NOTE}`;
    case "EuropePMC":
    case "PLOS":
      return `${CC_BY_GENERIC_NOTE}・${CHANGE_NOTE}`;
    default:
      return null;
  }
}
