"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ProtoStore = {
  saved: string[];
  seen: string[];
  toggleSaved: (id: string) => void;
  removeSaved: (id: string) => void;
  markSeen: (id: string) => void;
  streak: number;
  totalPoints: number;

  followed: string[];
  toggleFollow: (category: string) => void;
  viewSeconds: Record<string, number>;
  addViewSeconds: (category: string, seconds: number) => void;

  // True once the localStorage-backed state above has been loaded on the
  // client. Consumers that snapshot these signals once (e.g. the feed's
  // personalization weighting, which must NOT recompute on every save/follow
  // mid-scroll — see feed/page.tsx) wait for this before taking their
  // snapshot, so they pick up real history instead of empty defaults.
  hydrated: boolean;

  toast: string | null;
  showToast: (message: string) => void;
};

const ProtoContext = createContext<ProtoStore | null>(null);

const SAVED_KEY = "pd_proto_saved";
const SEEN_KEY = "pd_proto_seen";
const ALLTIME_SEEN_KEY = "pd_proto_alltime_seen";
const STREAK_KEY = "pd_proto_streak";
const FOLLOWED_KEY = "pd_proto_followed";
const VIEW_SECONDS_KEY = "pd_proto_view_seconds";

function load(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getTodayJST(): string {
  return new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// Swiped-away cards are only hidden for the rest of the day — otherwise the fixed
// mock deck runs out permanently after ~12 swipes despite the empty-state copy
// promising "new discoveries tomorrow" (found while dogfooding the prototype).
function loadSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed; // legacy shape, migrated on next save
    if (parsed?.date === getTodayJST() && Array.isArray(parsed.ids)) return parsed.ids;
    return [];
  } catch {
    return [];
  }
}

function saveSeen(ids: string[]) {
  localStorage.setItem(SEEN_KEY, JSON.stringify({ date: getTodayJST(), ids }));
}

function jstDateString(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}
const getYesterdayJST = () => jstDateString(-1);

type StreakRecord = { lastActiveDate: string; count: number };

function loadStreakRecord(): StreakRecord {
  if (typeof window === "undefined") return { lastActiveDate: "", count: 0 };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.count === "number") return parsed;
    return { lastActiveDate: "", count: 0 };
  } catch {
    return { lastActiveDate: "", count: 0 };
  }
}

function saveStreakRecord(record: StreakRecord) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(record));
}

// Lifetime read count, unlike `seen` above which resets every JST day so the
// swipe deck doesn't run dry — this one only ever grows, and backs the
// Duolingo-style points/streak stats (which must survive past today).
function loadAllTimeSeen(): string[] {
  return load(ALLTIME_SEEN_KEY);
}
function saveAllTimeSeen(ids: string[]) {
  localStorage.setItem(ALLTIME_SEEN_KEY, JSON.stringify(ids));
}

function loadViewSeconds(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEW_SECONDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveViewSeconds(record: Record<string, number>) {
  localStorage.setItem(VIEW_SECONDS_KEY, JSON.stringify(record));
}

// No accounts, no server, no auth — everything here lives in this browser's
// localStorage only. That's a deliberate simplification (see conversation):
// login was pulled because there was no real backend/security behind it yet,
// and "save this on my device" doesn't need one.
export function ProtoProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [allTimeSeen, setAllTimeSeen] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [followed, setFollowed] = useState<string[]>([]);
  const [viewSeconds, setViewSeconds] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSaved(load(SAVED_KEY));
    setSeen(loadSeen());
    setAllTimeSeen(loadAllTimeSeen());
    setStreak(loadStreakRecord().count);
    setFollowed(load(FOLLOWED_KEY));
    setViewSeconds(loadViewSeconds());
    setHydrated(true);
  }, []);

  // A streak day counts once the user actually reads something (swipes at
  // least one card) — not just opening the app — mirroring Duolingo's
  // loss-aversion mechanic: today only "counts" once you've done the thing.
  const recordActivityDay = useCallback(() => {
    const today = getTodayJST();
    const record = loadStreakRecord();
    if (record.lastActiveDate === today) return;
    const nextCount = record.lastActiveDate === getYesterdayJST() ? record.count + 1 : 1;
    saveStreakRecord({ lastActiveDate: today, count: nextCount });
    setStreak(nextCount);
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((x) => x !== id);
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveSeen(next);
      return next;
    });
    setAllTimeSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveAllTimeSeen(next);
      return next;
    });
    recordActivityDay();
  }, [recordActivityDay]);

  // Personalization signal #1: explicit category follows from tapping a
  // category tag in the feed.
  const toggleFollow = useCallback((category: string) => {
    setFollowed((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category];
      localStorage.setItem(FOLLOWED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Personalization signal #2: how many seconds, total, the user has spent
  // with slides of each category actually on screen (dwell time) — accumulates
  // across sessions so a category read slowly/often outweighs one skimmed past.
  const addViewSeconds = useCallback((category: string, seconds: number) => {
    if (seconds <= 0) return;
    setViewSeconds((prev) => {
      const next = { ...prev, [category]: (prev[category] ?? 0) + seconds };
      saveViewSeconds(next);
      return next;
    });
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2600);
  }, []);

  return (
    <ProtoContext.Provider
      value={{
        saved,
        seen,
        toggleSaved,
        removeSaved,
        markSeen,
        streak,
        totalPoints: allTimeSeen.length + saved.length * 3,
        followed,
        toggleFollow,
        viewSeconds,
        addViewSeconds,
        hydrated,
        toast,
        showToast,
      }}
    >
      {children}
    </ProtoContext.Provider>
  );
}

export function useProtoStore() {
  const ctx = useContext(ProtoContext);
  if (!ctx) throw new Error("useProtoStore must be used within ProtoProvider");
  return ctx;
}
