"use client";

import { useState } from "react";
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
    genetics: "遺伝学", other: "サイエンス",
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
  return "from-blue-600 via-sky-700 to-indigo-900";
}

type Paper = {
  id: string;
  title: string;
  summary_general?: string | null;
  summary_expert?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  authors?: string[] | null;
  source?: string | null;
};

export default function PaperShareClient({ paper, locale }: { paper: Paper; locale: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"easy" | "expert">("easy");

  const easyText = paper.summary_general ? stripMd(paper.summary_general) : null;
  const expertText = paper.summary_expert ? stripMd(paper.summary_expert) : null;
  const hasExpert = !!expertText;
  const displayText = mode === "expert" && hasExpert ? expertText : easyText;

  const gradient = getCategoryGradient(paper.category);
  const authors = paper.authors?.slice(0, 3).join(", ") ?? "";
  const source = paper.source || "arXiv";
  const date = paper.published_at
    ? new Date(paper.published_at).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
    : "";

  const appUrl = `/${locale}/feed`;

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
            📄 論文
          </span>
          <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
            {getCategoryLabel(paper.category)}
          </span>
          {date && <span className="ml-auto text-[10px] text-white/50">{date}</span>}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white leading-snug drop-shadow-lg">
          {paper.title}
        </h1>

        {/* Authors / source */}
        {(authors || source) && (
          <p className="text-xs text-white/50">
            <span className="text-white/30 uppercase text-[9px] font-black tracking-widest mr-1">著者</span>
            {authors}{(paper.authors?.length ?? 0) > 3 && ` +${(paper.authors?.length ?? 0) - 3}`}
            {source && <span className="ml-2 text-white/30">via {source}</span>}
          </p>
        )}

        {/* Toggle */}
        {hasExpert && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("easy")}
              className={`text-[11px] font-black px-3 py-1.5 rounded-full border transition-all ${
                mode === "easy"
                  ? "bg-white text-gray-900 border-white shadow-lg"
                  : "border-white/30 text-white/50"
              }`}
            >
              やさしく
            </button>
            <button
              onClick={() => setMode("expert")}
              className={`text-[11px] font-black px-3 py-1.5 rounded-full border transition-all ${
                mode === "expert"
                  ? "bg-white text-gray-900 border-white shadow-lg"
                  : "border-white/30 text-white/50"
              }`}
            >
              くわしく
            </button>
          </div>
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
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center text-white/60 font-bold text-xs py-2 border border-white/20 rounded-2xl hover:bg-white/10 transition-all"
            >
              原典論文を読む →
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
