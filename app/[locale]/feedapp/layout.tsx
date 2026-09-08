import type { Viewport } from "next";
import { ProtoProvider } from "../../../lib/proto/store";
import { ProtoHeader } from "../../../components/proto/ProtoHeader";
import { ProtoBottomNav, feedIcon } from "../../../components/proto/ProtoBottomNav";
import { ToastHost } from "../../../components/proto/ToastHost";

// Second variant of the Discovery experience: same data (saved/seen/streak —
// ProtoProvider is shared with /proto), but the swipe-card deck is replaced
// with a TikTok/Shorts-style vertical scroll feed. The original /proto tree
// is untouched; this is a parallel structure, not a redesign of it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function FeedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtoProvider>
      <div
        style={{
          background: "#F7F8FA",
          minHeight: "100svh",
          overscrollBehaviorY: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <ProtoHeader homePath="feedapp/feed" />
        <main
          className="mx-auto select-none"
          style={{
            maxWidth: 480,
            paddingTop: "calc(56px + env(safe-area-inset-top))",
            paddingBottom: "calc(76px + env(safe-area-inset-bottom))",
            minHeight: "100svh",
            background: "#FFFFFF",
          }}
        >
          {children}
        </main>
        <ProtoBottomNav basePath="feedapp" homeTabKey="feed" homeTabLabelKey="feed" homeTabIcon={feedIcon} />
        <ToastHost />
      </div>
    </ProtoProvider>
  );
}
