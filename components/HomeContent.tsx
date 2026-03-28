'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { ArrowRight, FlaskConical, Zap } from 'lucide-react';
import { PaperCardData } from '../types';
import { NewsCardData } from './NewsCard';

interface HomeContentProps {
  papers: PaperCardData[] | null;
  news?: NewsCardData[] | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  physics:  'from-blue-900 to-indigo-950',
  biology:  'from-emerald-900 to-teal-950',
  medicine: 'from-rose-900 to-pink-950',
  ai:       'from-violet-900 to-purple-950',
  chemistry:'from-orange-900 to-amber-950',
  astronomy:'from-indigo-900 to-slate-950',
  default:  'from-slate-800 to-zinc-900',
};

function cardGradient(category?: string | null) {
  if (!category) return CATEGORY_COLORS.default;
  const c = category.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (c.includes(key)) return val;
  }
  return CATEGORY_COLORS.default;
}

const CAT_LABELS: Record<string, string> = {
  physics:'物理学', biology:'生物学', medicine:'医学', chemistry:'化学',
  ai:'AI', machine_learning:'機械学習', astronomy:'天文学', quantum:'量子情報',
  math:'数学', computer_science:'CS', neuroscience:'脳科学',
  genetics:'遺伝学', environment:'環境', ecology:'生態学',
};
function catLabel(c?: string | null) {
  if (!c) return 'サイエンス';
  const key = c.toLowerCase();
  for (const [k, v] of Object.entries(CAT_LABELS)) {
    if (key.includes(k)) return v;
  }
  return c;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function MiniCard({ item }: { item: PaperCardData | NewsCardData }) {
  const paper = item as PaperCardData;
  const news = item as NewsCardData;
  const title = (paper as any).summary_general?.split(/[。！？\n]/)?.[0]?.trim() || paper.title;
  const gradient = cardGradient((item as any).category);

  return (
    <a
      href={paper.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex-shrink-0 w-44 h-56 rounded-2xl bg-gradient-to-b ${gradient} p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform`}
    >
      <div>
        <span className="text-[9px] font-black tracking-widest uppercase text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
          {catLabel((item as any).category)}
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold text-white leading-tight line-clamp-4">{title}</p>
        <p className="text-[9px] text-white/30 font-bold">{formatDate((item as any).published_at)}</p>
      </div>
    </a>
  );
}

export function HomeContent({ papers, news }: HomeContentProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ja';
  const recentItems = [...(papers || []).slice(0, 6)];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Top brand bar */}
      <div className="px-5 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">Science Feed</p>
          <h1 className="text-2xl font-black tracking-tight italic mt-0.5">
            POCKET <span className="text-sky-400">DIVE</span>
          </h1>
        </div>
        <button
          onClick={() => router.push(`/${locale}/profile`)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="white" opacity="0.8" />
            <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Main Feed CTA */}
      <div className="px-5 mb-8">
        <button
          onClick={() => router.push(`/${locale}/feed`)}
          className="w-full rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-700 to-violet-800 p-6 flex flex-col gap-4 relative overflow-hidden active:scale-[0.98] transition-transform shadow-2xl shadow-sky-900/50"
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-8 translate-x-8 pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 3L19 12L5 21V3Z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-sky-200 uppercase">Science TikTok</p>
              <p className="text-base font-black text-white">フィードを開く</p>
            </div>
          </div>

          <p className="text-sm text-white/70 font-medium leading-relaxed">
            最新論文をスワイプで。<br />
            AIが毎日日本語で要約して配信中。
          </p>

          <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
            今すぐ開く <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Recent papers horizontal scroll */}
      {recentItems.length > 0 && (
        <section className="mb-8">
          <div className="px-5 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-sky-400" />
              <h2 className="text-[11px] font-black tracking-widest text-white/50 uppercase">新着論文</h2>
            </div>
            <button
              onClick={() => router.push(`/${locale}/search`)}
              className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1"
            >
              もっと見る <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {recentItems.map((item) => (
              <MiniCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="px-5 grid grid-cols-2 gap-3 pb-8">
        <button
          onClick={() => router.push(`/${locale}/search`)}
          className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3 text-left active:bg-white/10 transition-colors"
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
          className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3 text-left active:bg-white/10 transition-colors"
        >
          <Zap className="w-5 h-5 text-white/60" />
          <div>
            <p className="text-[9px] font-black tracking-widest text-white/30 uppercase mb-0.5">My Page</p>
            <p className="text-sm font-black text-white/80">いいね・保存</p>
          </div>
        </button>
      </section>
    </div>
  );
}
