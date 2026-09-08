"use client";

import { useLocale } from "next-intl";
import { Article } from "../../lib/proto/types";
import { CATEGORY_STYLE, getCategoryLabel } from "../../lib/proto/mockData";
import { ArticleIllustration } from "./illustrations";

export function ArticleThumbnail({ article, onClick }: { article: Article; onClick: () => void }) {
  const locale = useLocale();
  const catStyle = CATEGORY_STYLE[article.category] ?? { bg: "#F1F5F9", text: "#475569" };
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden bg-white flex flex-col"
      style={{ border: "1px solid #EEF0F4" }}
    >
      <div className="flex items-center justify-center" style={{ background: "#F7F9FC", height: 96 }}>
        <div style={{ width: "80%", height: "70%" }}>
          <ArticleIllustration type={article.illustration} />
        </div>
      </div>
      <div className="p-2.5 flex flex-col gap-1.5">
        <span
          className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: catStyle.bg, color: catStyle.text }}
        >
          {getCategoryLabel(article.category, locale)}
        </span>
        <p className="text-[12.5px] font-bold text-[#1A1D29] leading-snug line-clamp-2">
          {article.summary}
        </p>
      </div>
    </button>
  );
}
