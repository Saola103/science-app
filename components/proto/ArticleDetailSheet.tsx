"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Article } from "../../lib/proto/types";

type ExplanationMode = "easy" | "detailed";

export function ArticleDetailSheet({ article, onClose }: { article: Article; onClose: () => void }) {
  const t = useTranslations("Proto.detail");
  const [mode, setMode] = useState<ExplanationMode>("easy");
  const text = mode === "easy" ? article.easyExplanation : article.detailedExplanation;

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
