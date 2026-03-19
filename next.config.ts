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
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
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
  
};

export default withNextIntl(nextConfig);