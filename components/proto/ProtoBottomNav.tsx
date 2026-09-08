"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Tab = {
  key: string;
  labelKey: string;
  icon: (active: boolean) => React.ReactNode;
};

const swipeIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#2F6FED" : "#94A3B8"} strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="m14.5 9.5-2 5-5 2 2-5 5-2Z" strokeLinejoin="round" />
  </svg>
);

const feedIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#2F6FED" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="6" rx="1.5" />
    <rect x="4" y="14" width="16" height="6" rx="1.5" />
  </svg>
);

const REST_TABS: Tab[] = [
  {
    key: "trending",
    labelKey: "trending",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#2F6FED" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17 9 11 13 15 21 7" />
        <path d="M15 7h6v6" />
      </svg>
    ),
  },
  {
    key: "search",
    labelKey: "search",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#2F6FED" : "#94A3B8"} strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    key: "mypage",
    labelKey: "mypage",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#2F6FED" : "#94A3B8"} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export function ProtoBottomNav({
  basePath = "proto",
  homeTabKey = "discovery",
  homeTabLabelKey = "discovery",
  homeTabIcon = swipeIcon,
}: {
  /** Route segment this nav lives under — "proto" (swipe) or "feedapp" (scroll feed). */
  basePath?: string;
  homeTabKey?: string;
  homeTabLabelKey?: string;
  homeTabIcon?: (active: boolean) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const t = useTranslations("Proto.nav");

  const tabs: Tab[] = [{ key: homeTabKey, labelKey: homeTabLabelKey, icon: homeTabIcon }, ...REST_TABS];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-white"
      style={{ borderTop: "1px solid #EEF0F4", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex w-full" style={{ maxWidth: 480 }}>
      {tabs.map((tab) => {
        const active = pathname?.includes(`/${basePath}/${tab.key}`);
        return (
          <button
            key={tab.key}
            onClick={() => router.push(`/${locale}/${basePath}/${tab.key}`)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ paddingTop: 8, paddingBottom: 8 }}
          >
            {tab.icon(!!active)}
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? "#2F6FED" : "#94A3B8" }}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        );
      })}
      </div>
    </nav>
  );
}

export { feedIcon };
