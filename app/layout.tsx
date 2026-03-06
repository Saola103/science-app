import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

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
  description: "科学論文をやさしく要約して届ける Web アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-slate-900`}
      >
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
              <Link
                href="/"
                className="text-sm font-semibold tracking-tight text-slate-900"
              >
                Science Papers
              </Link>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <Link
                  href="/"
                  className="hover:text-slate-900"
                >
                  一覧
                </Link>
                <Link
                  href="/about"
                  className="hover:text-slate-900"
                >
                  このプロジェクトについて
                </Link>
              </div>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
