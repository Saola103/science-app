import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import Script from 'next/script';

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

const APP_URL = "https://scienceapp-alpha.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID; // G-XXXXXXXXXX を Vercel env に設定

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "POCKET DIVE | 科学をスワイプ",
    template: "%s | POCKET DIVE",
  },
  description:
    "最新の科学論文・ニュースをTikTokスタイルで。AIが毎日日本語に要約して配信。物理・生物・AI・天文・医学など幅広い分野をカバー。",
  keywords: ["科学論文", "論文要約", "サイエンス", "arXiv", "AI要約", "理系", "研究", "TikTok 科学"],
  authors: [{ name: "POCKET DIVE" }],
  creator: "POCKET DIVE",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: APP_URL,
    siteName: "POCKET DIVE",
    title: "POCKET DIVE | 科学をスワイプ",
    description: "最新の科学論文をAIが日本語に要約。スワイプするだけで毎日3分で科学の最前線へ。",
    images: [
      {
        url: `${APP_URL}/og-default.png`,
        width: 1200,
        height: 630,
        alt: "POCKET DIVE — 科学をスワイプ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "POCKET DIVE | 科学をスワイプ",
    description: "最新の科学論文をAIが日本語に要約。スワイプするだけで毎日3分で科学の最前線へ。",
    images: [`${APP_URL}/og-default.png`],
    creator: "@PocketDive_jp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
      <head>
        {/* PWA manifest (will be added when manifest.json is created) */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="POCKET DIVE" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>

        {/* Google Analytics 4 — NEXT_PUBLIC_GA_MEASUREMENT_ID を Vercel env に設定してください */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

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
