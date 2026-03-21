'use client';

import { useChat } from 'ai/react';
import { Send, Sparkles, Loader2, User, Bot, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase/client';
import { MarkdownText } from '../../../components/MarkdownText';

export default function LabPage() {
  const t = useTranslations('Lab');
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/lab/chat',
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleShare = async () => {
    if (messages.length === 0) return;
    setIsSharing(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          messages: messages,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        setShareUrl(`${window.location.origin}/share/${data.id}`);
        alert(`Chat saved! Share URL: ${window.location.origin}/share/${data.id}`);
      }
    } catch (err) {
      console.error('Error sharing chat:', err);
      alert('Failed to save chat history.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-24 pb-6">
      <div className="max-w-4xl w-full mx-auto px-6 flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic flex items-center gap-2">
              <Sparkles className="text-sky-600" />
              {t('title')} <span className="text-slate-300 text-sm font-bold not-italic ml-2">{t('experimental')}</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold">
              {t('subtitle')}
            </p>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:text-sky-600 hover:border-sky-600 transition-all shadow-sm"
            >
              <Share2 size={14} />
              {isSharing ? t('saving') : t('share')}
            </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                  <Bot size={40} className="text-slate-300" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">{t('welcomeTitle')}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {t('welcomeDesc')}
                  </p>
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
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                <div className={`flex flex-col gap-1 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none shadow-md whitespace-pre-wrap'
                      : 'bg-slate-50 text-slate-800 rounded-tl-none'
                  }`}>
                    {m.role === 'user' ? m.content : <MarkdownText content={m.content} />}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-sky-600 flex items-center justify-center shrink-0">
                   <Loader2 size={14} className="animate-spin" />
                 </div>
                 <div className="bg-slate-50 px-6 py-4 rounded-3xl rounded-tl-none">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('thinking')}</span>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={t('placeholder')}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-slate-900 text-white p-4 rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
