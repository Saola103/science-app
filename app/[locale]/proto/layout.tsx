import type { Viewport } from "next";
import { ProtoProvider } from "../../../lib/proto/store";
import { ProtoHeader } from "../../../components/proto/ProtoHeader";
import { ProtoBottomNav } from "../../../components/proto/ProtoBottomNav";
import { ToastHost } from "../../../components/proto/ToastHost";

// Locked to phone-app behavior: no pinch-zoom (would fight card drag),
// viewport-fit=cover so env(safe-area-inset-*) resolves under notches/home indicators.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function ProtoLayout({ children }: { children: React.ReactNode }) {
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
        <ProtoHeader />
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
        <ProtoBottomNav />
        <ToastHost />
      </div>
    </ProtoProvider>
  );
}
