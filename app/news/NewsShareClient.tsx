"use client";

import { useRouter } from "next/navigation";

const CATEGORY_WORDS = "physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other";

function stripMd(text: string): string {
  return text
    // 1. まず【...】括弧を除去（これを先にやらないと後段のパターンが効かない）
    .replace(/【カテゴリ】[^\n]*\n?/g, "")        // 【カテゴリ】とその行全体を削除
    .replace(/【([^】]+)】/g, "")                  // 残りの【...】は中身ごと削除
    // 2. Markdownヘッダー
    .replace(/^▍[^\n]*/gm, "")
    .replace(/#{1,6}\s*/g, "")
    // 3. bold / italic
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    // 4. 旧プロンプト形式のセクション見出し行をまるごと削除
    .replace(/^(?:3つのダイブポイント|3つの要点|魅力的な解説|専門的解説|研究の目的と背景|研究の目的|手法|主要な結果|科学的意義|核心的貢献)[：:。\s][^\n]*/gm, "")
    // 5. カテゴリタグを末尾から除去（[biology] 形式 & 裸の単語）
    .replace(new RegExp(`\\n?\\[(?:${CATEGORY_WORDS})\\]\\s*$`, "i"), "")
    .replace(new RegExp(`\\n(?:${CATEGORY_WORDS})\\s*$`, "i"), "")
    .replace(/\[[\w_]+\]/g, "")
    // 6. 整形
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getCategoryLabel(category?: string | null): string {
  const labels: Record<string, string> = {
    neuroscience: "脳科学", biology: "生物学", physics: "物理学",
    chemistry: "化学", mathematics: "数学", astronomy: "天文学",
    medicine: "医学", it_ai: "AI・IT", environment: "環境",
    genetics: "遺伝学", psychology: "心理学", climate: "環境科学",
    other: "サイエンス",
  };
  return labels[category?.toLowerCase() ?? ""] ?? "サイエンス";
}

function getCategoryGradient(category?: string | null): string {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("neuro")) return "from-violet-700 via-purple-800 to-indigo-900";
  if (cat.includes("bio") || cat.includes("gene") || cat.includes("cell"))
    return "from-emerald-600 via-teal-700 to-cyan-900";
  if (cat.includes("physics") || cat.includes("quantum"))
    return "from-sky-600 via-blue-700 to-indigo-900";
  if (cat.includes("ai") || cat.includes("cs") || cat.includes("machine"))
    return "from-indigo-600 via-violet-700 to-purple-900";
  if (cat.includes("astro")) return "from-blue-800 via-indigo-800 to-slate-900";
  if (cat.includes("medic")) return "from-rose-600 via-pink-700 to-red-900";
  if (cat.includes("chem")) return "from-amber-600 via-orange-700 to-red-800";
  if (cat.includes("math")) return "from-cyan-600 via-sky-700 to-blue-900";
  if (cat.includes("climate") || cat.includes("environment")) return "from-teal-600 via-emerald-700 to-green-900";
  if (cat.includes("psycho")) return "from-pink-600 via-rose-700 to-purple-900";
  return "from-blue-600 via-sky-700 to-indigo-900";
}

type News = {
  id: string;
  title: string;
  summary_general?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source_name?: string | null;
};

export default function NewsShareClient({ news }: { news: News }) {
  const router = useRouter();

  const displayText = news.summary_general ? stripMd(news.summary_general) : null;

  const gradient = getCategoryGradient(news.category);
  const source = news.source_name || "";
  // news is fetched server-side (app/news/page.tsx) and rendered into this
  // client component's SSR HTML, so — same as app/paper/PaperShareClient.tsx
  // and components/HomeContent.tsx's formatDate — this must pin
  // timeZone: Asia/Tokyo or the server (Vercel, UTC) and client (JST
  // browser) can disagree on the day and trigger a React hydration error #418.
  const date = news.published_at
    ? new Date(news.published_at).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" })
    : "";

  const appUrl = `/feedapp/feed`;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${gradient} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button
          onClick={() => router.push(appUrl)}
          className="text-white/70 text-sm font-bold flex items-center gap-1"
        >
          ← フィードに戻る
        </button>
        <span className="text-white font-black text-base tracking-widest">POCKET DIVE</span>
        <div className="w-20" />
      </div>

      {/* Card */}
      <div className="flex-1 px-4 pb-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/25 text-white">
            📰 ニュース
          </span>
          <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
            {getCategoryLabel(news.category)}
          </span>
          {date && <span className="ml-auto text-[10px] text-white/50">{date}</span>}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white leading-snug drop-shadow-lg">
          {news.title}
        </h1>

        {/* Source */}
        {source && (
          <p className="text-xs text-white/50">
            <span className="text-white/30 uppercase text-[9px] font-black tracking-widest mr-1">出典</span>
            {source}
          </p>
        )}

        {/* Summary */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          {displayText ? (
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
              {displayText}
            </p>
          ) : (
            <p className="text-sm text-white/40 italic">要約を準備中...</p>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() => router.push(appUrl)}
            className="w-full bg-white text-gray-900 font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
          >
            🔬 POCKET DIVEで開く
          </button>
          {news.url && (
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center text-white/60 font-bold text-xs py-2 border border-white/20 rounded-2xl hover:bg-white/10 transition-all"
            >
              元記事を読む →
            </a>
          )}
        </div>

        {/* Footer branding */}
        <p className="text-center text-white/30 text-[10px] mt-4">
          科学をスワイプ — POCKET DIVE
        </p>
      </div>
    </div>
  );
}
