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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-pretty text-lg font-semibold leading-7 text-slate-900">
            {paper.url ? (
              <a href={paper.url} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700">
                {paper.title}
              </a>
            ) : (
              paper.title
            )}
          </h2>
          <div className="mt-2 text-sm text-slate-500">
            {paper.journal && <span>{paper.journal}</span>}
            {published && <span className="ml-2 text-slate-300">• {published}</span>}
          </div>
        </div>
        <div className="shrink-0">
          <Toggle value={mode} onChange={setMode} labels={{ general: "一般", expert: "専門" }} />
        </div>
      </div>
      <p className="mt-4 text-pretty text-sm leading-7 text-slate-800">{summary}</p>
    </article>
  );
}

function Toggle({ value, onChange, labels }: any) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-xs text-slate-700">
      <button onClick={() => onChange("general")} className={`rounded-full px-3 py-1.5 transition ${value === "general" ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>
        {labels.general}
      </button>
      <button onClick={() => onChange("expert")} className={`rounded-full px-3 py-1.5 transition ${value === "expert" ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>
        {labels.expert}
      </button>
    </div>
  );
}