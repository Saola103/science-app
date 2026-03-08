import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/LanguageProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pocket Dive | ポケットから科学の世界へ",
  description: "ポケットから、身近な科学の世界へダイブできる。最新論文とニュースの収集・要約プラットフォーム。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-300 relative`}
      >
        {/* Subtle Background Radial Gradient */}
        <div className="fixed inset-0 -z-10 h-full w-full 
          bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.1),transparent)]
          dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),transparent)]">
        </div>

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
      </body>
    </html>
  );
}
