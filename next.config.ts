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
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      // https: (not a per-domain allowlist): images.unsplash.com (fixed
      // category thumbnails for papers) plus ~20+ different RSS feed
      // domains for news.image_url (see lib/sources/rss.ts) — an
      // enumerated allowlist isn't practical for the latter and would need
      // updating every time a feed is added/changed. Images can't execute
      // script, so this is a much lower-risk relaxation than doing the same
      // for script-src/connect-src.
      "img-src 'self' data: blob: https: https://*.supabase.co",
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