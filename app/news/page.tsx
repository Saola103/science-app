/**
 * POCKET DIVE — News Share Page
 * /news?id=<uuid>
 *
 * OG-tag optimized share landing page for individual news articles.
 * Mirrors app/paper/page.tsx (same pattern, adapted for the `news` table —
 * news has only summary_general, no expert/easy toggle, see
 * lib/pipeline/collect.ts's collectNews()). Added 2026-09-26 because
 * FeedScroll.tsx's handleShare() previously sent news shares to the generic
 * `/feedapp/feed` URL, which loses the specific article on arrival.
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "../../lib/supabase/serviceClient";
import NewsShareClient from "./NewsShareClient";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

const CATEGORY_WORDS = "physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other";

function stripMd(text: string): string {
  return text
    .replace(/【カテゴリ】[^\n]*\n?/g, "")
    .replace(/【([^】]+)】/g, "")
    .replace(/^▍[^\n]*/gm, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^(?:3つのダイブポイント|3つの要点|魅力的な解説|専門的解説|研究の目的と背景|研究の目的|手法|主要な結果|科学的意義|核心的貢献)[：:。\s][^\n]*/gm, "")
    .replace(new RegExp(`\\n?\\[(?:${CATEGORY_WORDS})\\]\\s*$`, "i"), "")
    .replace(new RegExp(`\\n(?:${CATEGORY_WORDS})\\s*$`, "i"), "")
    .replace(/\[[\w_]+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { id } = await searchParams;

  if (!id) {
    return { title: "POCKET DIVE | 科学をスワイプ" };
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("news")
      .select("title, summary_general, category, image_url")
      .eq("id", id)
      .single();

    if (!data) return { title: "POCKET DIVE | 科学をスワイプ" };

    const summary = data.summary_general ? stripMd(data.summary_general).slice(0, 140) : "最新の科学ニュースをやさしく解説";
    const title = `${data.title} | POCKET DIVE`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pocketdive.vercel.app";
    const ogImage = data.image_url || `${appUrl}/og-default.png`;

    return {
      title,
      description: summary,
      openGraph: {
        title,
        description: summary,
        url: `${appUrl}/news?id=${encodeURIComponent(id)}`,
        siteName: "POCKET DIVE",
        images: [{ url: ogImage, width: 1200, height: 630 }],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: summary,
        images: [ogImage],
      },
    };
  } catch {
    return { title: "POCKET DIVE | 科学をスワイプ" };
  }
}

export default async function NewsSharePage({ searchParams }: Props) {
  const { id } = await searchParams;

  if (!id) notFound();

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("news")
    .select("id, title, summary_general, category, published_at, url, source_name")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return <NewsShareClient news={data} />;
}
