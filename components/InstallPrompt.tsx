"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// Same "show once, remember via localStorage" pattern as
// components/proto/CardStack.tsx's HINT_SEEN_KEY.
const SEEN_KEY = "pd_install_prompt_seen";
// A short delay rather than showing at 0s on first paint — an abrupt prompt
// before the user has seen any content tends to read as intrusive (see
// 2026-10-02 Dev briefing in 30_組織/memory/kno_briefing.md for the
// trade-off discussion). Still well within "early" per the owner's request.
const SHOW_DELAY_MS = 2000;

// Not in lib.dom.d.ts — Chromium-only event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | null;

// iOS Safari exposes `navigator.standalone`; not in lib.dom.d.ts.
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V4M12 4L8 8M12 4L16 8" />
    <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
  </svg>
);

const AddSquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

function markSeen() {
  if (typeof localStorage !== "undefined") localStorage.setItem(SEEN_KEY, "1");
}

export function InstallPrompt() {
  // Lazy initializer runs during the client render itself (not inside an
  // effect) — avoids a setState-in-effect cascade for a value that's static
  // for the component's lifetime. Returns null during SSR (no navigator),
  // which is fine since the popup never renders before `visible` flips true.
  const [platform] = useState<Platform>(() =>
    typeof navigator === "undefined" ? null : detectPlatform()
  );
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (!platform) return; // desktop — not shown
    if (typeof localStorage !== "undefined" && localStorage.getItem(SEEN_KEY)) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      markSeen();
      setVisible(false);
    };

    // Android/other Chromium browsers may fire this early — capture it
    // regardless of whether the popup has been shown yet so the "追加する"
    // button works as soon as it becomes available. iOS never fires this
    // (no beforeinstallprompt on WebKit), so this listener is harmless there.
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      clearTimeout(timer);
    };
  }, [platform]);

  function handleClose() {
    markSeen();
    setVisible(false);
  }

  async function handleAndroidInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Whether accepted or dismissed, the owner's requirement is "don't show
    // again either way" — the native dialog itself was already the answer.
    markSeen();
    setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible || !platform) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25 }}
        className="fixed left-0 right-0 z-[300] flex justify-center px-4"
        style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl p-4 shadow-2xl"
          role="dialog"
          aria-label="ホーム画面に追加"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
              <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold text-white leading-snug">
                POCKET DIVEをホーム画面に追加
              </p>

              {platform === "ios" ? (
                <p className="mt-1 text-[12px] text-white/60 leading-relaxed flex flex-wrap items-center gap-x-1">
                  <span className="inline-flex items-center gap-1">
                    <ShareIcon />共有
                  </span>
                  ボタンから
                  <span className="inline-flex items-center gap-1">
                    <AddSquareIcon />ホーム画面に追加
                  </span>
                  を選ぶと、アプリのようにすぐ開けます。
                </p>
              ) : deferredPrompt ? (
                <p className="mt-1 text-[12px] text-white/60 leading-relaxed">
                  ホーム画面に追加すると、次からワンタップで開けます。
                </p>
              ) : (
                <p className="mt-1 text-[12px] text-white/60 leading-relaxed">
                  ブラウザのメニューから「ホーム画面に追加」を選ぶと、次からワンタップで開けます。
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="閉じる"
              className="shrink-0 w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/70"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {platform === "android" && deferredPrompt && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white/60"
              >
                後で
              </button>
              <button
                type="button"
                onClick={handleAndroidInstallClick}
                className="px-4 py-1.5 rounded-full text-[12px] font-bold bg-white text-black"
              >
                追加する
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
