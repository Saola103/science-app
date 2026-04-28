'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { ArrowRight, FlaskConical, Play } from 'lucide-react';
import { PaperCardData } from '../types';
import { NewsCardData } from './NewsCard';
import { useStreak } from '../lib/hooks/useStreak';

interface HomeContentProps {
  papers: PaperCardData[] | null;
  news?: NewsCardData[] | null;
}

// Category config — emoji + label + gradient + feed query key
const CATEGORY_TILES = [
  { key: 'physics',          label: '物理学',   emoji: '⚛️',  gradient: 'from-blue-800 to-indigo-900' },
  { key: 'biology',          label: '生物学',   emoji: '🧬',  gradient: 'from-emerald-800 to-teal-900' },
  { key: 'ai',               label: 'AI',       emoji: '🤖',  gradient: 'from-violet-800 to-purple-900' },
  { key: 'astronomy',        label: '天文学',   emoji: '🔭',  gradient: 'from-indigo-800 to-slate-900' },
  { key: 'medicine',         label: '医学',     emoji: '🏥',  gradient: 'from-rose-800 to-pink-900' },
  { key: 'chemistry',        label: '化学',     emoji: '🧪',  gradient: 'from-amber-800 to-orange-900' },
  { key: 'math',             label: '数学',     emoji: '📐',  gradient: 'from-cyan-800 to-sky-900' },
  { key: 'neuroscience',     label: '脳科学',   emoji: '🧠',  gradient: 'from-purple-800 to-violet-900' },
];

const CAT_LABELS: Record<string, string> = {
  physics: '物理学', biology: '生物学', medicine: '医学', chemistry: '化学',
  ai: 'AI', it_ai: 'AI', machine_learning: '機械学習', astronomy: '天文学',
  quantum: '量子情報', math: '数学', mathematics: '数学',
  computer_science: 'CS', neuroscience: '脳科学', neuro: '脳科学',
  genetics: '遺伝学', environment: '環境', ecology: '生態学', general: 'サイエンス',
};
function catLabel(c?: string | null) {
  if (!c) return 'サイエンス';
  const key = c.toLowerCase();
  for (const [k, v] of Object.entries(CAT_LABELS)) {
    if (key.includes(k)) return v;
  }
  return c;
}

const CAT_GRADIENTS: Record<string, string> = {
  physics: 'from-blue-800 to-indigo-900',
  biology: 'from-emerald-800 to-teal-900',
  medicine: 'from-rose-800 to-pink-900',
  ai: 'from-violet-800 to-purple-900',
  it_ai: 'from-violet-800 to-purple-900',
  machine_learning: 'from-violet-800 to-purple-900',
  astronomy: 'from-indigo-800 to-slate-900',
  chemistry: 'from-amber-800 to-orange-900',
  math: 'from-cyan-800 to-sky-900',
  neuroscience: 'from-purple-800 to-violet-900',
};
function cardGradient(category?: string | null) {
  if (!category) return 'from-slate-800 to-zinc-900';
  const c = category.toLowerCase();
  for (const [key, val] of Object.entries(CAT_GRADIENTS)) {
    if (c.includes(key)) return val;
  }
  return 'from-slate-800 to-zinc-900';
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

type AnyItem = (PaperCardData | NewsCardData) & { category?: string | null; image_url?: string | null; summary_general?: string | null };

function MiniCard({ item }: { item: AnyItem }) {
  const summary = (item as any).summary_general || (item as any).summary;
  const headline = summary?.split(/[。！？\n]/)?.[0]?.trim() || item.title;
  const gradient = cardGradient((item as any).category);

  return (
    <a
      href={(item as any).url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex-shrink-0 w-40 h-52 rounded-2xl bg-gradient-to-b ${gradient} p-4 flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] transition-transform`}
    >
      <div>
        <span className="text-[9px] font-black tracking-widest uppercase text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
          {catLabel((item as any).category)}
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-white leading-tight line-clamp-4">{headline}</p>
        <p className="text-[9px] text-white/30 font-bold">{formatDate((item as any).published_at)}</p>
      </div>
    </a>
  );
}

export function HomeContent({ papers, news }: HomeContentProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ja';
  const { streak, todayCount, todayGoal } = useStreak();

  const recentItems: AnyItem[] = [...(papers || []).slice(0, 6)];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── HEADER ── */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">Science Feed</p>
          <h1 className="text-2xl font-black tracking-tight italic mt-0.5">
            POCKET <span className="text-sky-400">DIVE</span>
          </h1>
        </div>
        <button
          onClick={() => router.push(`/${locale}/profile`)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="white" opacity="0.8" />
            <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── STREAK BAR ── */}
      {(streak > 0 || todayCount > 0) && (
        <div
          className="mx-5 mb-5 bg-gradient-to-r from-orange-900/50 to-amber-900/40 border border-orange-500/20 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-orange-500/40 transition-colors"
          onClick={() => router.push(`/${locale}/profile`)}
        >
          <span className="text-2xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-black text-white">
              {streak > 0 ? `${streak}日連続学習中` : '今日の学習を始めよう'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 bg-white/10 rounded-full h-1">
                <div
                  className="bg-orange-400 h-1 rounded-full transition-all"
                  style={{ width: `${Math.min((todayCount / todayGoal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-white/40 font-bold whitespace-nowrap">
                {todayCount} / {todayGoal}本
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30" />
        </div>
      )}

      {/* ── MAIN CTA ── */}
      <div className="px-5 mb-6">
        <button
          onClick={() => router.push(`/${locale}/feed`)}
          className="w-full rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700 p-6 flex flex-col gap-3 relative overflow-hidden active:scale-[0.98] transition-transform shadow-2xl shadow-sky-900/50 group"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl translate-y-8 -translate-x-8 pointer-events-none" />

          <div className="flex items-center gap-3 relative">
            <div className="w-11 h-11 bg-white/25 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-sky-200 uppercase">Science TikTok</p>
              <p className="text-lg font-black text-white">フィードを開く</p>
            </div>
          </div>

          <p className="text-sm text-white/75 font-medium leading-relaxed relative">
            最新論文をスワイプで発見。<br />
            AIが毎日日本語で要約して配信中。
          </p>

          <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest relative">
            今すぐ開く <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* ── CATEGORY TILES ── */}
      <section className="mb-6">
        <div className="px-5 mb-3">
          <p className="text-[11px] font-black tracking-widest text-white/40 uppercase">カテゴリで探す</p>
        </div>
        <div className="grid grid-cols-4 gap-2 px-5">
          {CATEGORY_TILES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => router.push(`/${locale}/feed?category=${cat.key}`)}
              className={`rounded-2xl bg-gradient-to-b ${cat.gradient} p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform hover:opacity-90 border border-white/5`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-[10px] font-black text-white/80 text-center leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── RECENT PAPERS ── */}
      {recentItems.length > 0 && (
        <section className="mb-8">
          <div className="px-5 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-sky-400" />
              <h2 className="text-[11px] font-black tracking-widest text-white/50 uppercase">新着論文</h2>
            </div>
            <button
              onClick={() => router.push(`/${locale}/feed`)}
              className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1 hover:text-sky-300 transition-colors"
            >
              もっと見る <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div
            className="flex gap-3 overflow-x-auto px-5 pb-2"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {recentItems.map((item) => (
              <MiniCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── QUICK LINKS ── */}
      <section className="px-5 grid grid-cols-2 gap-3 pb-28">
        <button
          onClick={() => router.push(`/${locale}/search`)}
          className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3 text-left active:bg-white/10 transition-colors hover:border-white/20"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="1.8" opacity="0.6" />
            <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
          </svg>
          <div>
            <p className="text-[9px] font-black tracking-widest text-white/30 uppercase mb-0.5">Search</p>
            <p className="text-sm font-black text-white/80">論文を検索</p>
          </div>
        </button>

        <button
          onClick={() => router.push(`/${locale}/profile`)}
          className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3 text-left active:bg-white/10 transition-colors hover:border-white/20"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="white" opacity="0.6" />
          </svg>
          <div>
            <p className="text-[9px] font-black tracking-widest text-white/30 uppercase mb-0.5">My Page</p>
            <p className="text-sm font-black text-white/80">いいね済み</p>
          </div>
        </button>
      </section>
    </div>
  );
}
