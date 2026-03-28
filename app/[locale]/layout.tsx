import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';

import "../globals.css";
import { AppProvider } from "../../components/LanguageProvider";
import { BottomNav } from "../../components/BottomNav";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "POCKET DIVE | 科学をスワイプ",
  description: "最新の科学論文・ニュースをTikTokスタイルで。毎日AIが要約してフィード配信。",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        <NextIntlClientProvider messages={messages}>
          <AppProvider>
            <main className="min-h-screen pb-[60px]">
              {children}
            </main>
            <BottomNav />
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
