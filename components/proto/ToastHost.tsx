"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useProtoStore } from "../../lib/proto/store";

export function ToastHost() {
  const { toast } = useProtoStore();

  return (
    <div className="fixed left-0 right-0 z-[55] flex justify-center pointer-events-none" style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}>
      <div className="w-full px-5" style={{ maxWidth: 480 }}>
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 pointer-events-auto"
              style={{ background: "#1A1D29", boxShadow: "0 8px 20px rgba(16,24,40,0.25)" }}
            >
              <span
                className="text-[13px] font-medium text-white flex-1"
                style={{ fontFamily: "var(--font-zen-maru), sans-serif" }}
              >
                {toast}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
