"use client";

import { useEffect } from "react";

// Registers public/sw.js (a minimal, cache-free Service Worker). This is a
// prerequisite for the beforeinstallprompt event to fire on Chromium
// browsers — see components/InstallPrompt.tsx and the 2026-10-02 Dev
// briefing in 30_組織/memory/kno_briefing.md. Renders nothing; side-effect
// only, so it's a tiny standalone component rather than folded into
// InstallPrompt (keeps SW registration working even if the prompt itself is
// hidden/dismissed).
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure (e.g. unsupported browser, blocked by user
      // settings) shouldn't break the app — installability simply degrades.
    });
  }, []);

  return null;
}
