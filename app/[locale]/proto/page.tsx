import { redirect } from "next/navigation";

export default async function ProtoRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/proto/discovery`);
}
