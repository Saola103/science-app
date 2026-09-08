"use client";

import { useParams, useRouter } from "next/navigation";
import { useProtoStore } from "../../lib/proto/store";

function HeaderStreak({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="absolute right-4 flex items-baseline gap-1">
      <span className="text-[10px] font-bold" style={{ color: "#FF9640" }}>Day</span>
      <span className="text-[14px] font-bold" style={{ color: "#FF9640" }}>{count}</span>
    </div>
  );
}

export function ProtoHeader({ homePath = "proto/discovery" }: { homePath?: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const { streak } = useProtoStore();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex justify-center bg-white"
      style={{
        height: "calc(56px + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
        borderBottom: "1px solid #EEF0F4",
      }}
    >
      <div className="relative flex items-center justify-center w-full" style={{ maxWidth: 480 }}>
        <button
          onClick={() => router.push(`/${locale}/${homePath}`)}
          className="text-[17px] font-bold tracking-tight text-[#1A1D29]"
        >
          POCKET <span style={{ color: "#2F6FED" }}>DIVE</span>
        </button>
        <HeaderStreak count={streak} />
      </div>
    </header>
  );
}
