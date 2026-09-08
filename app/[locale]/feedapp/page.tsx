import { redirect } from "next/navigation";

export default async function FeedAppRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/feedapp/feed`);
}
