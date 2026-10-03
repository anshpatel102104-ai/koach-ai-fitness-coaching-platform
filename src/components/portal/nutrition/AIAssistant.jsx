import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';

const QUICK_PROMPTS = [
  "What can I eat for breakfast that fits my macros?",
  "I'm still hungry — high protein, low calorie snacks?",
  "I went over my calories — how do I adjust?",
  "Can I swap my chicken for salmon today?",
];

export default function AIAssistant({ plan, todayLogged }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const macroContext = `Daily targets: ${plan?.calories || '?'} cal, ${plan?.protein_g || '?'}g protein, ${plan?.carbs_g || '?'}g carbs, ${plan?.fats_g || '?'}g fats. Today logged: ${Math.round(todayLogged.calories || 0)} cal, ${Math.round(todayLogged.protein || 0)}g protein, ${Math.round(todayLogged.carbs || 0)}g carbs, ${Math.round(todayLogged.fats || 0)}g fats.`;

  const askAI = async (q) => {
    const text = q || query.trim();
    if (!text) return;
    setMessages(m => [...m, { role: 'user', content: text }]);
    setQuery('');
    setLoading(true);
    const res = await portalDb.functions.invoke('aiNutritionInsights', {
      action: 'nutritionQA', macroContext, question: text,
    });
    setMessages(m => [...m, { role: 'ai', content: res.data?.text || '' }]);
    setLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <motion.button onClick={() => setOpen(true)} whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, rgb(var(--ai)), rgb(var(--primary)))', boxShadow: '0 0 24px rgb(var(--ai) / 0.4)' }}>
        <Sparkles className="w-4 h-4" />
        Ask AI
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="mt-auto rounded-t-3xl flex flex-col overflow-hidden"
              style={{ background: '#0F1628', maxHeight: '80vh', border: '1px solid rgb(var(--ai) / 0.3)' }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ai" />
                  <p className="text-white font-bold text-sm">AI Nutrition Assistant</p>
                </div>
                <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-white/40" /></button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-white/30 text-xs mb-3">Try asking:</p>
                    {QUICK_PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => askAI(p)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-white/60 hover:text-white/80 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl"
                      style={{
                        background: msg.role === 'user' ? 'rgb(var(--primary) / 0.2)' : 'rgb(var(--ai) / 0.15)',
                        border: `1px solid ${msg.role === 'user' ? 'rgb(var(--primary) / 0.3)' : 'rgb(var(--ai) / 0.25)'}`,
                      }}>
                      <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgb(var(--ai) / 0.1)' }}>
                      <Loader2 className="w-4 h-4 text-ai animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-5 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askAI()}
                  placeholder="Ask about your nutrition..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)' }} />
                <button onClick={() => askAI()} disabled={!query.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--ai)), rgb(var(--primary)))' }}>
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}