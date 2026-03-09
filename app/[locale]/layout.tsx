import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';

import "../globals.css";
import { AppProvider } from "../../components/LanguageProvider";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
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
  title: "POCKET DIVE | ダイブ、身近な科学へ",
  description: "ポケットから、身近な科学の世界へダイブできる。最新論文とニュースの収集・要約プラットフォーム。",
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

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-300 relative`}
      >
        {/* Subtle Background Radial Gradient */}
        <div className="fixed inset-0 -z-10 h-full w-full 
          bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.1),transparent)]
          dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),transparent)]">
        </div>

        <NextIntlClientProvider messages={messages}>
          <AppProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 pb-20 lg:pb-0">
                {children}
              </main>
              <Footer />
              <BottomNav />
            </div>
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
