/**
 * POCKET DIVE — Paper Share Page
 * /ja/paper?id=arxiv:2312.12345
 *
 * OG-tag optimized share landing page for individual papers.
 * Users arriving from a shared link see the paper summary and
 * can tap "フィードで見る" to open the full app.
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "../../../lib/supabase/serviceClient";
import PaperShareClient from "./PaperShareClient";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
};

function stripMd(text: string): string {
  return text
    .replace(/^▍[^\n]*/gm, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^3つの[ダ要][イブポイント点]+[：:][^\n]*/gm, "")
    .replace(/^(魅力的な解説|専門的解説|研究の目的|手法|主要な結果|科学的意義|核心的貢献)[：:。\s][^\n]*/gm, "")
    .replace(/【カテゴリ】[^\n]*\n?(?:physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other)?\n?/gi, "")
    .replace(/\n?\[(?:physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other)\]\s*$/i, "")
    .replace(/\n(?:physics|biology|it_ai|medicine|astronomy|chemistry|environment|mathematics|other)\s*$/i, "")
    .replace(/\[[\w_]+\]/g, "")
    .replace(/【([^】]+)】/g, "$1：")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { id } = await searchParams;

  if (!id) {
    return { title: "POCKET DIVE | 科学をスワイプ" };
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("papers")
      .select("title, summary_general, category, image_url")
      .eq("id", id)
      .single();

    if (!data) return { title: "POCKET DIVE | 科学をスワイプ" };

    const summary = data.summary_general ? stripMd(data.summary_general).slice(0, 140) : "最新の科学論文をやさしく解説";
    const title = `${data.title} | POCKET DIVE`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scienceapp-alpha.vercel.app";
    const ogImage = data.image_url || `${appUrl}/og-default.png`;

    return {
      title,
      description: summary,
      openGraph: {
        title,
        description: summary,
        url: `${appUrl}/${locale}/paper?id=${encodeURIComponent(id)}`,
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

export default async function PaperSharePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { id } = await searchParams;

  if (!id) notFound();

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("papers")
    .select("id, title, summary_general, summary_expert, category, published_at, url, authors, source")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return <PaperShareClient paper={data} locale={locale} />;
}
