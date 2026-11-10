/**
 * 新ソース(CC BY)のドライラン: 各フェッチャーを実行して件数・ライセンス値・日付を表示するだけ。
 * Supabase にも Groq にも一切アクセスしない(DB書き込み・LLM呼び出しなし)。
 * 実行: npx tsx scripts/dryrun-sources.ts
 */
import { fetchScienceNewsFromRSS } from "../lib/sources/rss";
import {
  fetchEuropePmcJournalPapers,
  fetchEuropePmcTopicPapers,
  fetchFrontiersYoungMindsPapers,
  fetchPlosCandidates,
  attachPlosAuthorSummary,
  type OpenAccessPaper,
} from "../lib/sources/openAccess";
import { NEWS_CC_BY_SOURCES, isPaperDisplayable } from "../lib/sources/policy";

function show(label: string, ps: OpenAccessPaper[]) {
  console.log(`\n== ${label}: ${ps.length}件`);
  for (const p of ps.slice(0, 6)) {
    console.log(
      `  ${p.publishedAt?.slice(0, 10)} [${p.source}/${p.license}] displayable=${isPaperDisplayable(p)} ${p.id} | ${p.journal} | ${p.title.slice(0, 60)} | abstract=${p.abstract.length}字`
    );
  }
}

(async () => {
  const t0 = Date.now();
  const news = (await fetchScienceNewsFromRSS()).filter((n) => NEWS_CC_BY_SOURCES.includes(n.source_name));
  console.log(`== news(新3機関): ${news.length}件`);
  for (const n of news) console.log(`  ${n.published_at.slice(0, 10)} [${n.source_name}] ${n.title.slice(0, 60)} | desc=${n.description.length}字 | ${n.description.slice(0, 80)}`);

  const [j, t, f, pc] = await Promise.all([
    fetchEuropePmcJournalPapers(),
    fetchEuropePmcTopicPapers(),
    fetchFrontiersYoungMindsPapers(),
    fetchPlosCandidates(),
  ]);
  show("Europe PMC 神経科学誌", j);
  show("Europe PMC 固定語(意識・麻酔・睡眠)", t);
  show("Frontiers for Young Minds", f);
  show("PLOS Comput Biol 候補", pc);
  let withSummary = 0;
  for (const c of pc.slice(0, 5)) {
    const r = await attachPlosAuthorSummary(c);
    if (r) { withSummary++; console.log(`  PLOS author summary OK: ${r.id} (${r.abstract.length}字) ${r.abstract.slice(0, 80)}`); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`  PLOS: 先頭5候補中 author summary あり ${withSummary}件`);
  console.log(`\n所要 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})();
