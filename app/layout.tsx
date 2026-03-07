import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Science Papers",
  description: "ワンクリックで科学の最前線へ飛べるプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030712] text-slate-300 selection:bg-cyan-500/30`}
      >
        <div className="fixed inset-0 -z-10 h-full w-full bg-[#030712] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),rgba(255,255,255,0))]"></div>
        <LanguageProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
