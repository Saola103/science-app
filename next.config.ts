import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

import { execSync } from "child_process";
import packageJson from "./package.json";

const withNextIntl = createNextIntlPlugin();

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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // Ensure we keep the build error ignores for now as requested for Vercel
  typescript: {
    ignoreBuildErrors: true,
  },

  // Baseline security headers, plus a CSP.
  //
  // Fonts (next/font/google) are self-hosted at build time — no runtime
  // connection to fonts.googleapis.com/gstatic.com needed, so that's not in
  // the allowlist below despite what an earlier version of this comment said.
  // The two things that DO need real origins are Google Analytics (a script
  // tag from googletagmanager.com, an inline gtag() init block, and beacons
  // to google-analytics.com) and the Supabase client used directly from a
  // few client components (app/[locale]/{feed,profile,login}/page.tsx,
  // components/{FeedCard,PaperCard,Header}.tsx) for auth/session — hence
  // *.supabase.co in connect-src.
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
      "img-src 'self' data: blob: https://picsum.photos https://*.supabase.co",
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

export default withNextIntl(nextConfig);