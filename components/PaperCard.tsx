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
    <article className="group relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition-all duration-200 hover:border-cyan-300 hover:shadow-md overflow-hidden">
      <div className="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h2 className="text-pretty text-xl font-bold leading-relaxed text-slate-900">
            {paper.url ? (
              <a href={paper.url} target="_blank" rel="noreferrer" className="hover:text-cyan-600 transition-colors">
                {paper.title}
              </a>
            ) : (
              paper.title
            )}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 font-medium">
            {paper.journal && <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50">{paper.journal}</span>}
            {published && <span>{published}</span>}
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-start">
          <Toggle value={mode} onChange={setMode} labels={{ general: "一般向け", expert: "専門家向け" }} />
        </div>
      </div>
      <div className="mt-6 relative">
        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-slate-100 rounded-full"></div>
        <p className="text-pretty text-[15px] leading-8 text-slate-700">
          {summary}
        </p>
      </div>
    </article>
  );
}

function Toggle({ value, onChange, labels }: { value: string, onChange: (v: "general" | "expert") => void, labels: { general: string, expert: string } }) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-500">
      <button
        onClick={() => onChange("general")}
        className={`rounded-full px-4 py-2 transition-all duration-200 ${value === "general" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-100"
          }`}>
        {labels.general}
      </button>
      <button
        onClick={() => onChange("expert")}
        className={`rounded-full px-4 py-2 transition-all duration-200 ${value === "expert" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-100"
          }`}>
        {labels.expert}
      </button>
    </div>
  );
}