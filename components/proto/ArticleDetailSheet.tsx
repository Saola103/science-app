"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "../../lib/i18n/ja";
import { Article } from "../../lib/proto/types";
import { parseGeneralSummary } from "../../lib/format/summaryText";

type ExplanationMode = "easy" | "detailed";

type RelatedPaper = {
  id: string;
  headline: string;
};

export function ArticleDetailSheet({ article, onClose }: { article: Article; onClose: () => void }) {
  const t = useTranslations("Proto.detail");
  const router = useRouter();
  const [mode, setMode] = useState<ExplanationMode>("easy");
  // News summaries only ever get one (casual-tone) pass in the collection
  // pipeline — there's no distinct expert-tier text to switch to — so the
  // easy/detailed toggle is paper-only; news shows a single explanation.
  const showModeToggle = article.contentType !== "news";
  const text = showModeToggle && mode === "detailed" ? article.detailedExplanation : article.easyExplanation;

  // Related papers: only for papers, fetched once when the sheet mounts
  // (this component is only ever mounted while the sheet is open — see
  // feed/stack/mypage/page.tsx and SwipeCard.tsx, all of which render it as
  // `{openArticle && <ArticleDetailSheet .../>}` — so a plain useEffect here
  // naturally satisfies "fetch only when opened, never prefetch across the
  // feed" without touching those 4 call sites).
  const [relatedPapers, setRelatedPapers] = useState<RelatedPaper[] | null>(null);
  // Lazily initialized so the "loading" flag starts true only for papers —
  // avoids a synchronous setState call at the top of the effect below
  // (react-hooks/set-state-in-effect), since in practice this component is
  // freshly mounted per opened article (see comment above) so there's no
  // case where contentType/id change out from under an already-mounted sheet.
  const [relatedLoading, setRelatedLoading] = useState(() => article.contentType === "paper");

  useEffect(() => {
    // Nothing to fetch for news; the render below already gates display on
    // contentType === "paper", so any stale state from a previously-shown
    // paper simply never renders — no need to reset it here.
    if (article.contentType !== "paper") {
      return;
    }
    const rawId = article.id.replace(/^paper-/, "");
    let cancelled = false;
    fetch("/api/papers/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: rawId, limit: 5 }),
    })
      .then((res) => (res.ok ? res.json() : { papers: [] }))
      .then((data: { papers?: Array<{ id: string; summary_general: string | null }> }) => {
        if (cancelled) return;
        const papers = (data.papers || [])
          .map((p) => {
            if (!p.summary_general) return null;
            const { headline } = parseGeneralSummary(p.summary_general);
            if (!headline) return null;
            return { id: p.id, headline };
          })
          .filter((p): p is RelatedPaper => p !== null);
        setRelatedPapers(papers);
      })
      .catch(() => {
        if (!cancelled) setRelatedPapers([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [article.id, article.contentType]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative w-full bg-white rounded-t-3xl flex flex-col"
        style={{ maxWidth: 480, maxHeight: "78svh", fontFamily: "var(--font-zen-maru), sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: "#E2E5EA" }} />
        </div>

        <div className="flex items-center gap-2 px-5 pt-4">
          {showModeToggle ? (
            <>
              <button
                onClick={() => setMode("easy")}
                className="text-[13px] font-bold px-4 py-2 rounded-full transition-colors"
                style={
                  mode === "easy"
                    ? { background: "#2F6FED", color: "#fff" }
                    : { background: "#F1F3F6", color: "#6B7280" }
                }
              >
                {t("easy")}
              </button>
              <button
                onClick={() => setMode("detailed")}
                className="text-[13px] font-bold px-4 py-2 rounded-full transition-colors"
                style={
                  mode === "detailed"
                    ? { background: "#2F6FED", color: "#fff" }
                    : { background: "#F1F3F6", color: "#6B7280" }
                }
              >
                {t("detailed")}
              </button>
            </>
          ) : (
            <span className="text-[13px] font-bold px-4 py-2 rounded-full" style={{ background: "#F1F3F6", color: "#374151" }}>
              {t("newsExplanation")}
            </span>
          )}
          <button onClick={onClose} className="ml-auto p-2 text-[#94A3B8]" aria-label={t("close")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 overflow-y-auto" style={{ flex: 1 }}>
          <p className="text-[14px] text-[#374151] leading-[1.9]" style={{ whiteSpace: "pre-line" }}>
            {text}
          </p>

          {article.contentType === "paper" && relatedLoading && (
            <p className="text-[12px] text-[#94A3B8] mt-5 pt-4" style={{ borderTop: "1px solid #F1F3F6" }}>
              {t("relatedLoading")}
            </p>
          )}

          {article.contentType === "paper" && !relatedLoading && relatedPapers && relatedPapers.length > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid #F1F3F6" }}>
              <p className="text-[12.5px] font-bold text-[#374151] mb-2">{t("relatedHeading")}</p>
              <div className="flex flex-col gap-2">
                {relatedPapers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/paper?id=${encodeURIComponent(p.id)}`)}
                    className="text-left text-[13px] text-[#374151] leading-[1.6] py-2 px-3 rounded-xl"
                    style={{ background: "#F7F8FB" }}
                  >
                    {p.headline}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 shrink-0" style={{ borderTop: "1px solid #F1F3F6" }}>
          <p className="text-[11.5px] text-[#94A3B8] pt-3">
            {article.source} ・ {article.author} ・ {article.publishedAt}
          </p>
          <a
            // Real articles (lib/proto/mapArticle.ts) carry the actual source
            // URL; mock ARTICLES don't, so fall back to a search link built
            // from source+summary in that case.
            href={article.url || `https://www.google.com/search?q=${encodeURIComponent(`${article.source} ${article.summary}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-3.5 rounded-2xl text-[14px] font-bold"
            style={{ background: "#2F6FED", color: "#fff" }}
          >
            {t("readOriginal")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 5h5v5M19 5l-9 9M8 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
            </svg>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
