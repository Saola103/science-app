"use client";

import { useState } from "react";
import { PaperCard, type PaperCardData } from "../../../components/PaperCard";
import { useTranslations } from "next-intl";
import { Search, Sparkles, Clock, FileText, Send, User, Bot, ArrowRight } from "lucide-react";

export default function SearchPage() {
  const t = useTranslations('Common');
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"keyword" | "deep">("keyword");
  const [timeRange, setTimeRange] = useState("all");
  const [format, setFormat] = useState("summary");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Chat states for Deep Search
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);

  const handleKeywordSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, timeRange, format, mode: "keyword" }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.papers || []);
      if (data.papers?.length === 0) {
        setError("No papers found for this query and filters.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during search.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery("");
    setIsLoading(true);

    try {
      // In Deep Search, we'd ideally hit a different or same endpoint with conversation history
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, mode: "deep" }),
      });
      const data = await res.json();

      // For now, simulating assistant response if backend is simple
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || "I understand you're looking for research on that. Could you specify which aspect interests you most?"
      }]);
    } catch (err) {
      setError("Chat error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500">
      {/* 1. Header & Mode Switcher */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-8 space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/5 text-[10px] font-black tracking-widest text-sky-600 uppercase">
            AI REDESIGN v2.0
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic leading-[1.1]">
            {mode === "keyword" ? 'Keyword Search' : 'Deep Search'}
          </h1>

          {/* Simple Tab Switcher */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => { setMode("keyword"); setResults([]); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "keyword" ? "bg-white dark:bg-slate-800 text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Search size={14} />
              Keyword
            </button>
            <button
              onClick={() => { setMode("deep"); setResults([]); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "deep" ? "bg-white dark:bg-slate-800 text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Sparkles size={14} />
              Deep Search
            </button>
          </div>
        </div>

        {/* 2. Keyword Search Interface */}
        {mode === "keyword" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleKeywordSearch} className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quantum computing, Neural networks..."
                className="w-full h-20 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-8 pr-40 text-lg font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-600 backdrop-blur-md transition-all shadow-2xl shadow-slate-200/50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-3 bottom-3 rounded-2xl bg-slate-900 dark:bg-sky-600 text-white px-8 font-black text-xs tracking-widest uppercase hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Search"}
                {!isLoading && <ArrowRight size={14} />}
              </button>
            </form>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 py-4 border-y border-slate-100 dark:border-white/5">
              {/* Time Range */}
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-transparent text-[11px] font-black text-slate-900 dark:text-white uppercase outline-none cursor-pointer hover:text-sky-600"
                >
                  <option value="all">Any Time</option>
                  <option value="6mo">Last 6 Months</option>
                  <option value="1yr">Last Year</option>
                  <option value="5yr">Last 5 Years</option>
                </select>
              </div>

              {/* Format */}
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Output:</span>
                <div className="flex gap-4">
                  {['title', 'summary', 'abstract'].map((f) => (
                    <label key={f} className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="format"
                        value={f}
                        checked={format === f}
                        onChange={() => setFormat(f)}
                        className="hidden"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${format === f ? 'text-sky-600' : 'text-slate-300 group-hover:text-slate-500'}`}>
                        {f}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Deep Search Interface (Conversational) */}
        {mode === "deep" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="aspect-[4/3] md:aspect-[2/1] bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col overflow-hidden shadow-inner">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <Bot size={48} className="text-sky-600 mb-2" />
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">Deep Intelligence</h3>
                    <p className="max-w-xs text-xs font-bold text-slate-500 leading-relaxed">
                      Tell me what you're curious about in natural language. I'll help narrow down the perfect papers for you.
                    </p>
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] flex items-start gap-4 p-5 rounded-3xl ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 text-slate-900 dark:text-white rounded-tl-none shadow-sm'}`}>
                      <div className={`mt-1 flex-none w-6 h-6 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <p className="text-sm font-bold leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <form onSubmit={handleChatSubmit} className="p-6 md:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5">
                <div className="relative group">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full h-14 pl-6 pr-16 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-sky-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-slate-900 dark:bg-sky-600 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* 4. Results Section */}
      <main className="mx-auto max-w-6xl px-6 pb-32">
        {error && (
          <div className="mx-auto max-w-2xl text-center p-8 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-500 font-bold mb-12">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-1000">
            {results.map((paper, idx) => (
              <div key={paper.id} style={{ animationDelay: `${idx * 100}ms` }} className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both">
                <article className="group h-full bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-8 hover:border-sky-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-sky-500/5 flex flex-col gap-6">
                  <div className="flex justify-between items-start gap-4">
                    <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 text-[10px] font-black tracking-widest uppercase">{paper.source}</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase">{paper.published_at.split('T')[0]}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white leading-snug group-hover:text-sky-600 transition-colors">
                    {paper.title}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    {paper.displayContent || paper.summary.slice(0, 200) + '...'}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                    <div className="flex gap-2">
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-600"
                      >
                        Original Paper &rarr;
                      </a>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Dive Deep
                    </button>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && !error && mode === "keyword" && (
          <div className="py-24 text-center space-y-6 animate-pulse">
            <div className="text-6xl grayscale opacity-20">🔎</div>
            <p className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-300">EXPLORE THE ARCHIVE</p>
          </div>
        )}

        {isLoading && mode === "keyword" && results.length === 0 && (
          <div className="py-24 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2, 4, 6].map(i => (
                <div key={i} className="h-64 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 animate-pulse"></div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}