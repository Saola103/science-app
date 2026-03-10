"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaperCard, type PaperCardData } from "../../../components/PaperCard";
import { useTranslations } from "next-intl";
import { Search, Sparkles, Clock, FileText, Send, Loader2, BookOpen, Quote } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  papers?: PaperCardData[];
}

function SearchContent() {
  const t = useTranslations("Search");
  const ct = useTranslations("Common");
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"keyword" | "deep" | "drill">("keyword");
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedMinor, setSelectedMinor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [format, setFormat] = useState("summary");
  const [results, setResults] = useState<PaperCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      handleKeywordSearch(undefined, q);
    }
  }, [searchParams]);

  const handleKeywordSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const searchTerms = overrideQuery || query;
    if (!searchTerms.trim()) return;

    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerms, timeRange, format, mode: "keyword" }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.papers || []);
      if (data.papers?.length === 0) {
        setError("No papers found matching your criteria.");
      }
    } catch (err) {
      setError("An error occurred during keyword search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrillSearch = async () => {
    if (!selectedMinor) return;
    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: selectedMinor, timeRange, format, mode: "keyword" }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.papers || []);
      if (data.papers?.length === 0) {
        setError("No papers found for this category.");
      }
    } catch (err) {
      setError("An error occurred during drill-down search.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, mode: "deep", history: messages }),
      });

      if (!res.ok) throw new Error("Deep search failed");
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || "I've analyzed your request. Here are some relevant research paths...",
        papers: data.papers
      }]);
    } catch (err) {
      setError("Deep search encountered an error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="pt-24 pb-12 px-6 border-b border-slate-50">
        <div className="max-w-4xl mx-auto space-y-10 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase italic">
              AI <span className="text-sky-600">DISCOVERY</span>
            </h1>
            <p className="text-base font-bold text-slate-500 uppercase tracking-widest">
              {t("searchSubtitle")}
            </p>
          </div>

          <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => { setMode("keyword"); setError(""); setResults([]); }}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "keyword" ? "bg-white text-sky-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Search size={16} />
              {t("modeKeyword")}
            </button>
            <button
              onClick={() => { setMode("deep"); setError(""); setResults([]); }}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "deep" ? "bg-white text-sky-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Sparkles size={16} />
              {t("modeDeep")}
            </button>
            <button
              onClick={() => { setMode("drill"); setError(""); setResults([]); }}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "drill" ? "bg-white text-sky-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
            >
              <BookOpen size={16} />
              {t("modeDrill")}
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        {mode === "keyword" ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleKeywordSearch} className="max-w-4xl mx-auto relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("placeholder")}
                className="w-full h-16 md:h-24 pl-8 pr-44 bg-white border-2 border-slate-100 rounded-[2rem] text-xl font-bold outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/5 transition-all shadow-2xl shadow-slate-200/40"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-3 bottom-3 px-10 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : ct("search")}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-12 py-8 border-y border-slate-100">
              <div className="flex items-center gap-4">
                <Clock className="w-5 h-5 text-sky-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterTime")}</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-transparent text-[11px] font-black text-slate-900 uppercase italic outline-none cursor-pointer border-b-2 border-transparent hover:border-sky-600 transition-all"
                >
                  <option value="all">{t("anyTime")}</option>
                  <option value="6mo">{t("last6mo")}</option>
                  <option value="1yr">{t("last1yr")}</option>
                  <option value="5yr">{t("last5yr")}</option>
                  <option value="10yr">{t("last10yr")}</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-sky-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterFormat")}</span>
                <div className="flex gap-6">
                  {[
                    { val: 'title', label: t("formatTitle") },
                    { val: 'summary', label: t("formatSummary") },
                    { val: 'abstract', label: t("formatAbstract") }
                  ].map((f) => (
                    <button
                      key={f.val}
                      onClick={() => setFormat(f.val)}
                      className={`text-[11px] font-black uppercase tracking-widest transition-all ${format === f.val ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-300 hover:text-slate-500'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="max-w-2xl mx-auto p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4 text-red-600 animate-in zoom-in duration-300">
                <div className="p-2 bg-white rounded-lg shadow-sm">⚠️</div>
                <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div className="space-y-12">
              {results.map((paper, idx) => (
                <div key={paper.id || idx} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
                  <PaperCard paper={paper} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-12 min-h-[500px] flex flex-col shadow-inner">
              <div className="flex-1 space-y-8 overflow-y-auto mb-8 pr-4 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40 py-20">
                    <Sparkles size={48} className="text-sky-600 animate-pulse" />
                    <p className="text-sm font-black uppercase tracking-[0.2em] max-w-xs leading-loose italic">
                      Start a scientific journey. Ask me anything to begin your deep dive.
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] p-6 md:p-8 rounded-[2rem] shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none'}`}>
                      <div className="flex items-center gap-3 mb-4 opacity-50">
                        {msg.role === 'user' ? <div className="text-[10px] font-black uppercase tracking-widest">Researcher</div> : <div className="text-[10px] font-black uppercase tracking-widest text-sky-600">AI Concierge</div>}
                      </div>
                      <div className="prose prose-slate max-w-none text-base md:text-lg leading-relaxed font-medium">
                        {msg.content}
                      </div>
                      {msg.papers && msg.papers.length > 0 && (
                        <div className="mt-8 space-y-6 pt-8 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-sky-600 mb-4">
                            <BookOpen size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Recommended Sources</span>
                          </div>
                          {msg.papers.map(p => (
                            <PaperCard key={p.id} paper={p} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white p-6 rounded-[2rem] rounded-tl-none border border-slate-100 flex items-center gap-4">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce delay-150"></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synthesizing...</span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleDeepSearchSubmit} className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="I want to know about..."
                  className="w-full h-16 md:h-20 pl-8 pr-24 bg-white border-2 border-slate-200 rounded-3xl text-lg font-bold outline-none focus:border-sky-600 transition-all shadow-xl shadow-slate-200/50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="absolute right-2.5 top-2.5 bottom-2.5 w-12 md:w-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-sky-600 transition-all disabled:opacity-50 shadow-lg"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
              <div className="p-8 bg-sky-50/50 rounded-3xl border border-sky-100/50 space-y-4">
                <Quote className="text-sky-600 opacity-20" size={32} />
                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                  "Knowledge is power. Deep searching allows you to explore the nuances of complex topics with ease."
                </p>
              </div>
              <div className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-4">
                <BookOpen className="text-slate-400 opacity-20" size={32} />
                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                  "Stay curious. Our AI is designed to guide you through the latest academic findings across all domains."
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}