/**
 * 収集・表示の許可ポリシー(リリースゲートG4 法務整備)。
 * 根拠: 20_ビジネス/進行中/ビジネス戦略/POCKET_DIVE_法務整備_G4.md 3章。
 * 収集(lib/sources)とフィード表示(app/api, app/actions 等)の両方がこのファイルを参照する。
 * 弁護士ではないAIによるリスク整理に基づく暫定ポリシーであり、適法性の断定ではない(要確認)。
 */

// ── ニュースRSS ───────────────────────────────────────────────────────────

/**
 * 許可するニュース情報源(source_name)。法務整備書で「許諾が明確・低リスク」と
 * 評価できる公的機関のみ(3-3 / 3-6: NASA, NSF)。CERN は 2026-11-10 に除外(下記参照)。
 * 評価が書かれていない・リスクが高い・条件が重い情報源は除外側に倒している。
 * 除外理由は NEWS_EXCLUDED_REASONS を参照。追加は法務確認後に行うこと。
 * 要確認: NASAは第三者権利の素材が混ざりうる(画像は表示しないため本文のみ対象)。
 */
export const NEWS_ALLOWED_SOURCES: readonly string[] = ["NASA", "NSF"];

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
export const PAPER_ALLOWED_SOURCES: readonly string[] = ["arXiv", "bioRxiv", "medRxiv"];
/** 上記のうちライセンス判定が必要なもの */
const LICENSE_CHECKED_PAPER_SOURCES: readonly string[] = ["bioRxiv", "medRxiv"];

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
  return true;
}

/**
 * Supabase(PostgREST)クエリ用の可視性条件。isPaperDisplayable と同じ基準。
 * `.or(PAPER_VISIBILITY_OR)` で使う(共通適用は lib/sources/visibility.ts の applyPaperVisibility)。
 */
export const PAPER_VISIBILITY_OR = `source.eq.arXiv,and(source.in.(${LICENSE_CHECKED_PAPER_SOURCES.join(",")}),license.in.(${PREPRINT_ALLOWED_LICENSES.join(",")}))`;
