/**
 * R3b-01: CC BY-NC 論文の出典行(ライセンス・変更あり)が、AI 要約を出す全ての面に出ること。
 * 実行: CRON_SECRET=x npx tsx scripts/tests/nc-surfaces.test.ts
 *  - スタブ描画(react-dom/server)できる面: トップ(HomeContent)、スワイプカード、詳細シート、/paper。
 *  - app/search・マイページの行はページ内ローカルのコンポーネントで単体描画できないため、
 *    出典行の配線(ガード付きで attributionFor / article.attribution を使う)をソースで確認する。
 *  - NC 以外(cc_by / 他ソース)の表示は変えていないこと(NC 文言が出ない)も確認。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import React from "react";

// next/navigation はアプリルーターが無いと使えないのでスタブ
const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, ...rest: unknown[]) {
  if (request === "next/navigation") {
    return { useRouter: () => ({ push() {}, replace() {}, back() {} }), useSearchParams: () => new URLSearchParams(), usePathname: () => "/" };
  }
  return origLoad.call(this, request, ...rest);
};

(async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { HomeContent } = await import("../../components/HomeContent");
  const { CardFrontContent } = await import("../../components/proto/SwipeCard");
  const { ArticleDetailSheet } = await import("../../components/proto/ArticleDetailSheet");
  const { default: PaperShareClient } = await import("../../app/paper/PaperShareClient");
  const { mapFeedItemToArticle } = await import("../../lib/proto/mapArticle");
  const { attributionFor } = await import("../../lib/sources/policy");

  const NC = "ライセンス: CC BY-NC";
  const CHANGE = "変更あり";
  const base = { id: "p1", type: "paper" as const, title: "T", summary_general: "要約です。", summary_expert: "専門", url: "https://www.biorxiv.org/x", authors: ["A"], published_at: "2026-11-01T00:00:00Z" };

  for (const source of ["bioRxiv", "medRxiv"]) {
    // トップ
    const home = renderToStaticMarkup(React.createElement(HomeContent, { papers: [{ ...base, source, license: "cc_by_nc" } as any], news: [] }));
    assert.ok(home.includes(NC) && home.includes(CHANGE), `トップ ${source}`);
    // マイページ/フィード/スタック/詳細は mapFeedItemToArticle → attribution
    const art = mapFeedItemToArticle({ ...base, source, license: "cc_by_nc" });
    assert.ok(renderToStaticMarkup(React.createElement(CardFrontContent, { article: art })).includes(CHANGE), `スワイプカード ${source}`);
    const sheet = renderToStaticMarkup(React.createElement(ArticleDetailSheet, { article: art, onClose() {} }));
    assert.ok(sheet.includes(NC) && sheet.includes(CHANGE), `詳細 ${source}`);
    // /paper
    const paper = renderToStaticMarkup(React.createElement(PaperShareClient, { paper: { ...base, source, license: "cc_by_nc" } }));
    assert.ok(paper.includes(NC) && paper.includes(CHANGE), `/paper ${source}`);
    // NC 以外は出さない
    for (const license of ["cc_by", "cc0", undefined]) {
      const h = renderToStaticMarkup(React.createElement(HomeContent, { papers: [{ ...base, source, license } as any], news: [] }));
      assert.ok(!h.includes(NC), `トップ非NC ${source}/${license}`);
      const a = mapFeedItemToArticle({ ...base, source, license });
      assert.ok(!renderToStaticMarkup(React.createElement(CardFrontContent, { article: a })).includes(NC));
      assert.ok(!renderToStaticMarkup(React.createElement(PaperShareClient, { paper: { ...base, source, license } })).includes(NC));
    }
  }
  assert.ok(!renderToStaticMarkup(React.createElement(HomeContent, { papers: [{ ...base, source: "arXiv" } as any], news: [] })).includes(NC));

  // フィード(FeedScroll)の出典行は article.attribution を出す(既存・不変)
  const feedSrc = readFileSync(new URL("../../components/proto/FeedScroll.tsx", import.meta.url), "utf8");
  assert.ok(/article\.attribution && ` ・ \$\{article\.attribution\}`/.test(feedSrc));

  // /search・マイページ・トップ取得の配線
  const searchSrc = readFileSync(new URL("../../app/search/page.tsx", import.meta.url), "utf8");
  assert.ok(/attributionFor\(item\.source, item\.license\)/.test(searchSrc) && /\{ncAttribution && /.test(searchSrc), "/search の配線");
  const mySrc = readFileSync(new URL("../../app/feedapp/mypage/page.tsx", import.meta.url), "utf8");
  assert.ok(/article\.attribution && \(/.test(mySrc), "マイページの配線");
  const actSrc = readFileSync(new URL("../../app/actions.ts", import.meta.url), "utf8");
  assert.ok(/source, category, image_url, license"\)/.test(actSrc), "トップの select に license");
  // /search が受け取る /api/search の行(keywordSearchPapers の select)にも license がある
  assert.ok(/image_url, source, license"\)/.test(readFileSync(new URL("../../lib/supabase/vectorSearch.ts", import.meta.url), "utf8")));
  assert.ok(attributionFor("bioRxiv", "cc_by_nc")!.includes(NC));
  // CC BY 系(NC以外の許可ソース)にも出典行が出る(トップ・スワイプ)。NC文言は出ない
  const CCBY = "ライセンス: CC BY";
  for (const source of ["EuropePMC", "PLOS", "FrontiersYoungMinds"]) {
    const it = { ...base, source, license: "cc_by" } as any;
    const h = renderToStaticMarkup(React.createElement(HomeContent, { papers: [it], news: [] }));
    assert.ok(h.includes(CCBY) && h.includes(CHANGE) && !h.includes(NC), `トップ CC BY ${source}`);
    const s = renderToStaticMarkup(React.createElement(CardFrontContent, { article: mapFeedItemToArticle(it) }));
    assert.ok(s.includes(CCBY) && s.includes(CHANGE) && !s.includes(NC), `スワイプ CC BY ${source}`);
  }
  console.log("nc-surfaces: OK");
})();
