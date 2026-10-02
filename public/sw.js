// Minimal Service Worker — registration-only, no caching strategy.
//
// Purpose: Chrome's PWA installability criteria requires a registered Service
// Worker with a `fetch` event handler for the `beforeinstallprompt` event to
// fire (see components/InstallPrompt.tsx and 30_組織/memory/kno_briefing.md
// "2026-10-02" for the research behind this). This file intentionally does
// NOT implement any offline/cache strategy — that's out of scope for this
// change. It just passes every request straight through to the network.
//
// skipWaiting() activates this worker immediately instead of waiting for all
// tabs to close, so the install flow doesn't get stuck on an old worker.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
