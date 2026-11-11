import type { NextConfig } from "next";

import { execSync } from "child_process";
import packageJson from "./package.json";

const version = packageJson.version;
let gitHash = "no-git";
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not get git hash");
}

const nextConfig: NextConfig = {
  poweredByHeader: false, // R1-10: X-Powered-By を出さない
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_GIT_HASH: gitHash,
    // NOTE: Never add server-only secrets here — the `env` block is bundled
    // into the client-side JavaScript. Use process.env.SECRET in server
    // components / API routes only.
  },
  // No remotePatterns entries: nothing in the app currently renders a
  // remote image through next/image. `picsum.photos` (previously the only
  // entry here) isn't referenced anywhere in the codebase — checked via
  // grep, it was vestigial. The two places that do use externally-sourced
  // image URLs are:
  //  - papers.image_url: always one of the fixed images.unsplash.com URLs
  //    in lib/llm/summarize.ts's CATEGORY_IMAGES, only used as an OG meta
  //    tag (app/paper/page.tsx) — that's a plain URL string in
  //    HTML <meta>, not routed through next/image, so remotePatterns
  //    doesn't apply to it regardless.
  //  - news.image_url: extracted per-article from whichever of the ~20+
  //    RSS feeds in lib/sources/rss.ts it came from — an arbitrary,
  //    unpredictable domain that doesn't fit an allowlist. components/
  //    NewsCard.tsx renders this via a plain <img> (not next/image) for
  //    exactly that reason; see the comment there.
  // If a future feature needs next/image for a *fixed, known* remote
  // domain again, add it back here rather than widening this to a
  // catch-all pattern.
  images: {
    remotePatterns: [],
  },
  // Ensure we keep the build error ignores for now as requested for Vercel
  typescript: {
    ignoreBuildErrors: true,
  },

  // Next.js 16.3+ auto-writes/re-writes a managed block into CLAUDE.md
  // (and AGENTS.md) on `next dev` when it detects a coding agent, instructing
  // the agent to read node_modules/next/dist/docs/ before writing code
  // (official feature, see https://nextjs.org/docs/app/guides/ai-agents —
  // confirmed 2026-10-02 by Sec: content matches
  // node_modules/next/dist/server/lib/generate-agent-files.js exactly, and
  // that file's integrity hash matches both package-lock.json and the public
  // npm registry for next@16.3.4 — not a supply-chain compromise). We
  // disable it: it kept getting committed by accident (see git history for
  // science-app/CLAUDE.md), and this project's CLAUDE.md is meant to be
  // project-specific documentation, not framework-managed content.
  agentRules: false,

  // lib/llm/summarize.ts loads its LLM prompt from a .md file at runtime via
  // fs.readFileSync (see lib/llm/prompts/casual-summary.md) so the prompt
  // text can be reviewed/edited on its own without touching code. Next's
  // static file tracing usually picks up literal fs.readFileSync paths, but
  // this makes it explicit so the file is never silently dropped from the
  // Vercel serverless bundle for the routes that call summarize().
  outputFileTracingIncludes: {
    "/*": ["lib/llm/prompts/**/*"],
  },

  // Baseline security headers, plus a CSP.
  //
  // Fonts (next/font/google) are self-hosted at build time — no runtime
  // connection to fonts.googleapis.com/gstatic.com needed, so that's not in
  // the allowlist below despite what an earlier version of this comment said.
  // The two things that DO need real origins are Google Analytics (a script
  // tag from googletagmanager.com, an inline gtag() init block, and beacons
  // to google-analytics.com) and *.supabase.co in connect-src (kept as a
  // conservative default; the client components that used to call Supabase
  // directly for auth/session — the old /feed, /profile, /login routes and
  // FeedCard/PaperCard/Header's login state — have since been removed, so
  // there is currently no direct client-side Supabase usage left to point
  // to, but nothing has re-verified this is safe to drop).
  //
  // Known compromise, not an oversight: script-src keeps 'unsafe-inline'
  // rather than a nonce. Next.js's own App Router hydration payload and the
  // GA init block are inline scripts; making them nonce-based needs a
  // middleware change that stamps a per-request nonce onto every response
  // and threads it through next/script — a bigger, riskier change than what
  // this pass covers. This CSP still blocks the higher-probability risk here
  // (loading a script/frame/connect target from an origin we didn't list —
  // e.g. if RSS/LLM-derived content ever ended up somewhere it could inject
  // a tag), just not inline-script-based XSS specifically.
  // 2026-09-24: next-intl による多言語対応(/ja/..., /en/...)を撤去した際、
  // 旧URLをそのまま404にすると検索エンジンに残った古いインデックス
  // (例: pocketdive.vercel.app/ja)がいつまでも生き続けてしまう。301で
  // 新URLへ畳み込み、再クロール時にインデックスが新URLへ統合・旧URLが
  // 自然に消えるようにする。
  // 2026-11-12: /legal(特定商取引法に基づく表記)を撤去。完全無料・広告なし・課金なし・寄付なしの間は
  // 表示義務の対象になりにくいとの Leg 判断(法務整備書 第8章)。運営者・窓口は /about /terms /privacy に残す。
  // 外部に出したURL・検索インデックスのリンク切れを避けるため /about へ恒久リダイレクト。
  // 課金・広告・寄付を始める前に、ページの新設を含めて再判定すること。
  async redirects() {
    return [
      {
        source: "/legal",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/ja",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ja/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/en",
        destination: "/",
        permanent: true,
      },
      {
        source: "/en/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      // G4: 外部画像は一切読み込まない(ニュースRSSの画像ホットリンクを廃止したため、
      // 以前の `https:` 全許可を撤去)。Unsplash は OG meta の文字列URLのみで表示しない。
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://analytics.google.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;