
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaperCard, type PaperCardData } from "../../../components/PaperCard";
import { useTranslations } from "next-intl";
import { Search, Sparkles, Clock, FileText, Send, Loader2, BookOpen, ChevronRight, MessageSquare, ArrowLeft } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  papers?: PaperCardData[];
}

// カテゴリ定義 (Drill-down用)
const CATEGORIES = {
  "Physics": [
    { id: "cat:physics", name: "General Physics" },
    { id: "cat:astro-ph", name: "Astrophysics" },
    { id: "cat:cond-mat", name: "Condensed Matter" },
    { id: "cat:gr-qc", name: "General Relativity" },
    { id: "cat:hep-th", name: "High Energy Physics" },
  ],
  "Biology (q-bio)": [
    { id: "cat:q-bio.GN", name: "Genomics" },
    { id: "cat:q-bio.NC", name: "Neurons and Cognition" },
    { id: "cat:q-bio.PE", name: "Populations and Evolution" },
    { id: "cat:q-bio.BM", name: "Biomolecules" },
  ],
  "Computer Science": [
    { id: "cat:cs.AI", name: "Artificial Intelligence" },
    { id: "cat:cs.LG", name: "Machine Learning" },
    { id: "cat:cs.CV", name: "Computer Vision" },
    { id: "cat:cs.CL", name: "Computation and Language" },
    { id: "cat:cs.CR", name: "Cryptography and Security" },
  ],
  "Mathematics": [
    { id: "cat:math.CO", name: "Combinatorics" },
    { id: "cat:math.NT", name: "Number Theory" },
    { id: "cat:math.AG", name: "Algebraic Geometry" },
    { id: "cat:math.PR", name: "Probability" },
  ],
  "Statistics": [
    { id: "cat:stat.ML", name: "Machine Learning" },
    { id: "cat:stat.AP", name: "Applications" },
    { id: "cat:stat.TH", name: "Theory" },
  ]
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const t = useTranslations("Search");
  const ct = useTranslations("Common");
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"keyword" | "deep" | "drill">("keyword");
  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [format, setFormat] = useState<"title" | "summary" | "abstract">("summary");
  
  const [results, setResults] = useState<PaperCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Deep Search State
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Drill-down State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      setMode("keyword");
      handleKeywordSearch(undefined, q);
    }
  }, [searchParams]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (mode === "deep") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mode]);

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
        setError(t("noResults") || "No papers found matching your criteria.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during search.");
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
        content: data.message,
        papers: data.papers
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrillCategorySelect = async (catId: string, catName: string) => {
    setSelectedCategory(catName);
    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: catId, timeRange: "all", format: "summary", mode: "drill" }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.papers || []);
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24">
      
      {/* Header Area */}
      <section className="pt-24 pb-8 px-6 border-b border-slate-50 bg-white/80 backdrop-blur-md sticky top-20 z-30">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase italic">
            AI <span className="text-sky-600">DISCOVERY</span>
          </h1>
          
          <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setMode("keyword")}
              className={`flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${mode === "keyword" ? "bg-white text-sky-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Search size={14} />
              {t("modeKeyword")}
            </button>
            <button
              onClick={() => setMode("deep")}
              className={`flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${mode === "deep" ? "bg-white text-sky-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Sparkles size={14} />
              {t("modeDeep")}
            </button>
            <button
              onClick={() => setMode("drill")}
              className={`flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${mode === "drill" ? "bg-white text-sky-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
            >
              <BookOpen size={14} />
              {t("modeDrill")}
            </button>
          </div>
        </div>
      </section>

      {/* --- Mode A: Keyword Search --- */}
      {mode === "keyword" && (
        <section className="max-w-6xl mx-auto px-6 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <form onSubmit={(e) => handleKeywordSearch(e)} className="max-w-3xl mx-auto relative group z-10">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="w-full h-16 pl-8 pr-32 bg-white border-2 border-slate-100 rounded-[2rem] text-lg font-bold outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/5 transition-all shadow-xl shadow-slate-200/40"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-sky-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : ct("search")}
            </button>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 py-6 border-y border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-sky-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterTime")}</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-900 uppercase cursor-pointer outline-none border-b border-transparent hover:border-sky-600"
              >
                <option value="all">{t("anyTime")}</option>
                <option value="6mo">{t("last6mo")}</option>
                <option value="1yr">{t("last1yr")}</option>
                <option value="5yr">{t("last5yr")}</option>
                <option value="10yr">{t("last10yr")}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-sky-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("filterFormat")}</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="bg-transparent text-[11px] font-bold text-slate-900 uppercase cursor-pointer outline-none border-b border-transparent hover:border-sky-600"
              >
                <option value="title">{t("formatTitle")}</option>
                <option value="summary">{t("formatSummary")}</option>
                <option value="abstract">{t("formatAbstract")}</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-center text-red-500 font-bold text-sm bg-red-50 py-4 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((paper) => (
              <PaperCard key={paper.id} paper={paper} showSummary={format === "summary"} showAbstract={format === "abstract"} />
            ))}
          </div>
          {results.length === 0 && !isLoading && !error && (
            <div className="text-center text-slate-400 font-bold py-20">
              Start your research journey by entering keywords above.
            </div>
          )}
        </section>
      )}

      {/* --- Mode B: Deep Search (Chat) --- */}
      {mode === "deep" && (
        <section className="max-w-4xl mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 mb-24">
            {messages.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto text-sky-600 mb-6">
                  <Sparkles size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic">How can I help you dive deeper?</h3>
                <p className="text-slate-500 font-bold max-w-lg mx-auto">
                  I can help you clarify your research interests and find specific papers.
                  Try asking: "I want to know about recent advancements in quantum computing."
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col gap-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-sm font-bold leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-br-none shadow-xl shadow-slate-900/10' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-lg'
                }`}>
                  {msg.content}
                </div>
                {msg.papers && msg.papers.length > 0 && (
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pl-4 md:pl-12">
                     {msg.papers.map(p => (
                       <PaperCard key={p.id} paper={p} showSummary={true} />
                     ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-slate-100 px-6 py-4 rounded-3xl rounded-bl-none shadow-lg flex items-center gap-2">
                   <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thinking...</span>
                 </div>
               </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-40">
            <form onSubmit={handleDeepSearchSubmit} className="max-w-4xl mx-auto relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything..."
                className="w-full h-16 pl-6 pr-20 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold outline-none focus:border-sky-600 focus:bg-white transition-all shadow-lg"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-2 bottom-2 w-12 bg-sky-600 text-white rounded-xl flex items-center justify-center hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </section>
      )}

      {/* --- Mode C: Drill-down --- */}
      {mode === "drill" && (
        <section className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {selectedCategory ? (
            <div className="space-y-8">
               <button 
                 onClick={() => { setSelectedCategory(null); setResults([]); }}
                 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-sky-600 transition-colors"
               >
                 <ArrowLeft size={14} /> Back to Categories
               </button>

               <h2 className="text-3xl font-black uppercase italic text-slate-900">
                 Diving into <span className="text-sky-600">{selectedCategory}</span>
               </h2>

               {isLoading ? (
                 <div className="py-20 flex justify-center">
                   <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {results.map((paper) => (
                     <PaperCard key={paper.id} paper={paper} showSummary={true} />
                   ))}
                 </div>
               )}
            </div>
          ) : (
            <div className="space-y-12">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{t("drillTitle")}</h2>
                <p className="text-sm font-bold text-slate-500">{t("drillSubtitle")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(CATEGORIES).map(([domain, subCats]) => (
                  <div key={domain} className="bg-slate-50 rounded-3xl p-8 space-y-6 border border-slate-100 hover:shadow-xl hover:shadow-sky-900/5 transition-all group">
                    <h3 className="text-xl font-black uppercase italic text-slate-900 group-hover:text-sky-600 transition-colors">{domain}</h3>
                    <div className="space-y-2">
                      {subCats.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleDrillCategorySelect(cat.id, cat.name)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-left hover:border-sky-600 hover:text-sky-600 transition-all shadow-sm"
                        >
                          <span className="text-xs font-bold uppercase tracking-wide">{cat.name}</span>
                          <ChevronRight size={14} className="text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
