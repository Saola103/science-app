'use client';

import { useChat } from 'ai/react';
import { Send, Sparkles, Loader2, User, Bot } from 'lucide-react';
import { MarkdownText } from '../MarkdownText';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export function ChatInterface() {
  const t = useTranslations('Search');
  const [errorMsg, setErrorMsg] = useState('');

  // Use standard useChat from ai/react v3
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => {
      const msg = error?.message || '';
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('Rate limit')) {
        setErrorMsg('1日のAI利用制限に達しました。時間をおいて再度お試しください。');
      } else {
        setErrorMsg('エラーが発生しました。再度お試しください。');
      }
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Removed manual input state management since useChat v3 handles it
  // const [input, setInput] = useState('');
  // ...

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-slate-400">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <Sparkles className="w-8 h-8 text-sky-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700">{t('deepIntroTitle')}</h3>
              <p className="text-sm max-w-xs mx-auto mt-2">{t('deepIntroDesc')}</p>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-sky-600'
            }`}>
              {m.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
            </div>
            
            <div className={`flex flex-col gap-1 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none shadow-md whitespace-pre-wrap'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
              }`}>
                {m.role === 'user' ? m.content : <MarkdownText content={m.content} />}
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-sky-600 flex items-center justify-center shrink-0">
               <Loader2 size={14} className="animate-spin" />
             </div>
             <div className="bg-white border border-slate-200 px-5 py-3.5 rounded-2xl rounded-tl-none shadow-sm">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('deepThinking')}</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mx-4 mb-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-2 text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={(e) => { setErrorMsg(''); handleSubmit(e); }} className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={t('deepPlaceholder')}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
