"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { CardStack } from "../../../../components/proto/CardStack";
import { ARTICLES, CATEGORIES, CATEGORY_STYLE, getCategoryLabel } from "../../../../lib/proto/mockData";
import { HEADER_H, NAV_H } from "../../../../lib/proto/layoutMetrics";

const ALL = "__all__";
const FILTERS = [ALL, ...CATEGORIES] as const;

export default function DiscoveryPage() {
  const [filter, setFilter] = useState<string>(ALL);
  const [filterOpen, setFilterOpen] = useState(false);
  const t = useTranslations("Proto.discovery");
  const locale = useLocale();

  const articles = useMemo(
    () => (filter === ALL ? ARTICLES : ARTICLES.filter((a) => a.category === filter)),
    [filter]
  );

  const activeLabel = filter === ALL ? t("filterAll") : getCategoryLabel(filter, locale);

  return (
    <div
      className="flex flex-col"
      style={{ height: `calc(100dvh - ${HEADER_H}px - env(safe-area-inset-top) - ${NAV_H}px - env(safe-area-inset-bottom))` }}
    >
      {/* Tinder keeps the home screen to "header + card" — a permanently-visible
          filter row competes for attention, so it collapses to a single icon
          that only reveals choices when the user actually wants to narrow
          things down. Filter state stays visible via the label next to it. */}
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5 shrink-0">
        <button
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full shrink-0"
          style={{ background: "#F1F3F6" }}
          aria-label={t("filterButtonAria")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span className="text-[12px] font-bold text-[#4B5563]">{activeLabel}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <CardStack articles={articles} stackKey={`discovery-${filter}`} fill />
      </div>

      <AnimatePresence>
        {filterOpen && (
          <div className="fixed inset-0 z-[55] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35"
              onClick={() => setFilterOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl px-5 pb-8 pt-3"
              style={{ maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pb-4">
                <div className="w-9 h-1 rounded-full" style={{ background: "#E2E5EA" }} />
              </div>
              <h2 className="text-[15px] font-bold text-[#1A1D29] mb-4">{t("filterSheetTitle")}</h2>
              <div className="flex flex-col gap-1.5">
                {FILTERS.map((f) => {
                  const active = filter === f;
                  const style = f === ALL ? undefined : CATEGORY_STYLE[f];
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setFilterOpen(false);
                      }}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left"
                      style={active ? { background: "#EFF4FF" } : undefined}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: f === ALL ? "#2F6FED" : style?.text ?? "#94A3B8" }}
                      />
                      <span className="text-[14px] font-bold flex-1" style={{ color: active ? "#2F6FED" : "#1A1D29" }}>
                        {f === ALL ? t("filterAll") : getCategoryLabel(f, locale)}
                      </span>
                      {active && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F6FED" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
