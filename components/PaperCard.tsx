"use client";

import { useMemo, useState } from "react";

export type PaperCardData = {
  id: string;
  title: string;
  journal?: string | null;
  url?: string | null;
  published_at?: string | null;
  summary?: string | null;
  summary_general?: string | null;
  summary_expert?: string | null;
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function PaperCard({ paper }: { paper: PaperCardData }) {
  const [mode, setMode] = useState<"general" | "expert">("general");

  const summary = useMemo(() => {
    // 優先度：設定モード > summary_general/expert > 汎用summary
    if (mode === "general") return paper.summary_general || paper.summary || "要約がありません";
    return paper.summary_expert || paper.summary || "要約がありません";
  }, [mode, paper]);

  const published = formatDate(paper.published_at);

  return (
    <article className="group relative rounded-[2rem] border border-white/5 bg-white/5 p-6 sm:p-8 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] overflow-hidden">
      {/* Subtle background glow effect on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>

      <div className="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h2 className="text-pretty text-xl font-bold leading-relaxed text-white">
            {paper.url ? (
              <a href={paper.url} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
                {paper.title}
              </a>
            ) : (
              paper.title
            )}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 font-medium">
            {paper.journal && <span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5">{paper.journal}</span>}
            {published && <span>{published}</span>}
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-start">
          <Toggle value={mode} onChange={setMode} labels={{ general: "一般向け", expert: "専門家向け" }} />
        </div>
      </div>
      <div className="mt-6 relative">
        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500/50 to-transparent rounded-full opacity-50"></div>
        <p className="text-pretty text-[15px] leading-8 text-slate-300">
          {summary}
        </p>
      </div>
    </article>
  );
}

function Toggle({ value, onChange, labels }: { value: string, onChange: (v: "general" | "expert") => void, labels: { general: string, expert: string } }) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-black/40 p-1 text-xs font-medium text-slate-400 backdrop-blur shadow-inner">
      <button
        onClick={() => onChange("general")}
        className={`rounded-full px-4 py-2 transition-all duration-300 ${value === "general" ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "hover:text-white hover:bg-white/5"
          }`}>
        {labels.general}
      </button>
      <button
        onClick={() => onChange("expert")}
        className={`rounded-full px-4 py-2 transition-all duration-300 ${value === "expert" ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "hover:text-white hover:bg-white/5"
          }`}>
        {labels.expert}
      </button>
    </div>
  );
}