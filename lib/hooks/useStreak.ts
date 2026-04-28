"use client";

/**
 * useStreak — 連続学習日数 & 今日の達成管理
 *
 * localStorage key: "pd_streak"
 * {
 *   lastDate: "2024-01-15",   // JST date string
 *   streak: 7,                // 連続日数
 *   todayCount: 5,            // 今日読んだ数
 *   goalMet: false,           // 今日のゴール達成済みフラグ
 * }
 */

import { useState, useCallback, useEffect } from "react";

const STREAK_KEY = "pd_streak";
export const DAILY_GOAL = 10;

interface StreakData {
  lastDate: string;
  streak: number;
  todayCount: number;
  goalMet: boolean;
}

function getTodayJST(): string {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getYesterdayJST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function loadStreak(): StreakData {
  if (typeof window === "undefined") {
    return { lastDate: getTodayJST(), streak: 1, todayCount: 0, goalMet: false };
  }
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastDate: getTodayJST(), streak: 1, todayCount: 0, goalMet: false };
    const stored: StreakData = JSON.parse(raw);
    const today = getTodayJST();
    const yesterday = getYesterdayJST();
    if (stored.lastDate === today) return stored;
    if (stored.lastDate === yesterday) {
      // 昨日継続 → ストリーク維持、今日カウントリセット
      return { lastDate: today, streak: stored.streak, todayCount: 0, goalMet: false };
    }
    // 2日以上空いた → ストリークリセット
    return { lastDate: today, streak: 1, todayCount: 0, goalMet: false };
  } catch {
    return { lastDate: getTodayJST(), streak: 1, todayCount: 0, goalMet: false };
  }
}

function saveStreak(data: StreakData) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function useStreak() {
  const [data, setData] = useState<StreakData>(() => loadStreak());

  // Rehydrate after mount (SSR safe)
  useEffect(() => { setData(loadStreak()); }, []);

  /**
   * 1アイテム閲覧を記録。
   * 戻り値: goalJustMet = 今この呼び出しで初めてゴール達成したか
   */
  const recordRead = useCallback((): boolean => {
    let goalJustMet = false;
    setData((prev) => {
      const today = getTodayJST();
      const yesterday = getYesterdayJST();
      const isNewDay = prev.lastDate !== today;

      const newStreak = isNewDay
        ? prev.lastDate === yesterday ? prev.streak + 1 : 1
        : prev.streak;
      const newCount = isNewDay ? 1 : prev.todayCount + 1;
      const newGoalMet = newCount >= DAILY_GOAL;

      if (newGoalMet && !prev.goalMet) goalJustMet = true;

      const next: StreakData = {
        lastDate: today,
        streak: newStreak,
        todayCount: newCount,
        goalMet: newGoalMet,
      };
      saveStreak(next);
      return next;
    });
    return goalJustMet;
  }, []);

  return {
    streak: data.streak,
    todayCount: data.todayCount,
    todayGoal: DAILY_GOAL,
    todayDone: data.goalMet,
    recordRead,
  };
}
