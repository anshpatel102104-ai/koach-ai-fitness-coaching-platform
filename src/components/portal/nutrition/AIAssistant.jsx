import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
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
      <motion.button onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-primary-foreground shadow-sm"
        style={{ background: 'rgb(var(--primary))', boxShadow: 'none' }}>
        Ask about food
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="mt-auto rounded-t-xl flex flex-col overflow-hidden"
              style={{ background: 'rgb(var(--card))', maxHeight: '80vh', border: '1px solid rgb(var(--primary) / 0.3)' }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgb(var(--secondary))' }}>
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-bold text-sm">Food questions</p>
                </div>
                <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs mb-3">Try asking:</p>
                    {QUICK_PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => askAI(p)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-foreground hover:text-foreground transition-colors"
                        style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] px-4 py-3 rounded-xl"
                      style={{
                        background: msg.role === 'user' ? 'rgb(var(--primary))' : 'rgb(var(--secondary))',
                        border: `1px solid ${msg.role === 'user' ? 'rgb(var(--primary))' : 'rgb(var(--primary))'}`,
                      }}>
                      <p className="text-foreground text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-xl" style={{ background: 'rgb(var(--secondary))' }}>
                      <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-5 py-3 flex gap-2" style={{ borderTop: '1px solid rgb(var(--secondary))' }}>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askAI()}
                  placeholder="Ask about your nutrition..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                  style={{ background: 'rgb(var(--secondary))' }} />
                <button onClick={() => askAI()} disabled={!query.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: 'rgb(var(--primary))' }}>
                  <Send className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}