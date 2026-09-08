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

  // Baseline security headers. Deliberately no Content-Security-Policy here —
  // the app loads Google Fonts, GA, and other third-party scripts, and a CSP
  // strict enough to matter is easy to get wrong and silently break those;
  // that needs its own careful pass, not a drive-by addition.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);