"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, ArrowRight, ExternalLink } from "lucide-react";

type ResultItem = {
  id: string;
  title: string;
  summary_general?: string | null;
  category?: string | null;
  published_at?: string | null;
  url?: string | null;
  source?: string | null;
  authors?: string[] | null;
  type?: string;
};

const CAT_LABELS: Record<string, string> = {
  physics: "物理学", biology: "生物学", medicine: "医学", chemistry: "化学",
  ai: "AI", machine_learning: "機械学習", astronomy: "天文学", quantum: "量子情報",
  math: "数学", computer_science: "CS", neuroscience: "脳科学",
};
function catLabel(c?: string | null) {
  if (!c) return "サイエンス";
  for (const [k, v] of Object.entries(CAT_LABELS)) {
    if (c.toLowerCase().includes(k)) return v;
  }
  return c;
}

function ResultCard({ item }: { item: ResultItem }) {
  const headline = item.summary_general?.split(/[。！？\n]/)?.[0]?.trim() || item.title;
  const date = item.published_at ? new Date(item.published_at).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }) : "";

  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors space-y-3"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-black tracking-widest uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
          論文
        </span>
        <span className="text-[9px] text-white/30 font-bold">{catLabel(item.category)}</span>
        {date && <span className="text-[9px] text-white/20 font-bold ml-auto">{date}</span>}
      </div>
      <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{item.title}</h3>
      {headline !== item.title && (
        <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{headline}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-bold text-white/20 uppercase">{item.source || "arXiv"}</span>
        <ExternalLink className="w-3 h-3 text-white/20" />
      </div>
    </a>
  );
}

const CATEGORIES = [
  { key: "", label: "すべて" },
  { key: "physics", label: "物理学" },
  { key: "biology", label: "生物学" },
  { key: "medicine", label: "医学" },
  { key: "ai", label: "AI" },
  { key: "chemistry", label: "化学" },
  { key: "astronomy", label: "天文学" },
  { key: "math", label: "数学" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string, overrideCategory?: string) => {
    if (e) e.preventDefault();
    const q = overrideQuery ?? query;
    const cat = overrideCategory !== undefined ? overrideCategory : category;
    if (!q.trim() && !cat) return;

    setIsLoading(true);
    setSearched(true);
    setResults([]);

    try {
      // Category-only browse: use feed API for accurate category filtering
      if (!q.trim() && cat) {
        const res = await fetch(`/api/feed?category=${encodeURIComponent(cat)}&limit=20`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults((data.items || []).map((item: ResultItem) => ({
          ...item,
          summary_general: (item as any).summary_general || (item as any).summary,
        })));
        return;
      }
      // Text search (with optional category filter)
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, category: cat, mode: "keyword" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.papers || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top */}
      <div className="px-5 pt-12 pb-6">
        <p className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase mb-1">Search</p>
        <h1 className="text-2xl font-black">論文を検索</h1>
      </div>

      {/* Search bar */}
      <div className="px-5 mb-5">
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-white/30" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードで検索..."
            className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 focus:bg-white/8 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-2 bottom-2 px-5 bg-sky-500 hover:bg-sky-400 text-white font-black text-xs rounded-xl transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "検索"}
          </button>
        </form>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 px-5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              const newCat = c.key;
              setCategory(newCat);
              handleSearch(undefined, query, newCat);
            }}
            className={`flex-shrink-0 text-[11px] font-black tracking-wide px-4 py-2 rounded-full transition-all ${category === c.key ? "bg-sky-500 text-white" : "bg-white/5 border border-white/10 text-white/50 hover:text-white"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-5 pb-8">
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && searched && results.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <div className="text-5xl opacity-20">🔬</div>
            <p className="text-sm text-white/30 font-bold">結果が見つかりませんでした</p>
            <p className="text-xs text-white/20">別のキーワードで試してみてください</p>
          </div>
        )}

        {!isLoading && !searched && (
          <div className="text-center py-20 space-y-3">
            <Search className="w-10 h-10 text-white/10 mx-auto" />
            <p className="text-sm text-white/20 font-bold">キーワードを入力して検索</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">
              {results.length}件の結果
            </p>
            {results.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
