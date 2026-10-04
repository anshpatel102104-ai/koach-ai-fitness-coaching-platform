import React, { useState, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import {
  Sparkles, Loader2, RefreshCw, Check, Edit3, X, ChevronDown
} from 'lucide-react';

const TONE_OPTIONS = [
  { key: 'motivational', label: '🔥 More Motivational' },
  { key: 'empathetic', label: '💙 More Empathetic' },
  { key: 'direct', label: '⚡ More Direct' },
  { key: 'casual', label: '😊 More Casual' },
  { key: 'professional', label: '💼 More Professional' },
];

const TONE_LABELS = {
  motivational: 'Motivational',
  empathetic: 'Empathetic',
  direct: 'Direct',
  casual: 'Casual',
  professional: 'Professional',
};

export default function AIMessageAssistant({ client, allMessages = [], checkIns = [], onUse, onEditFirst }) {
  const [suggestion, setSuggestion] = useState(null);
  const [tone, setTone] = useState(null); // null = auto
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [toneLabel, setToneLabel] = useState('Auto');
  const [showTonePicker, setShowTonePicker] = useState(false);

  const generate = useCallback(async (overrideTone) => {
    if (!client) return;
    setVisible(true);
    setLoading(true);
    setSuggestion(null);
    const useTone = overrideTone ?? tone;
    const res = await db.functions.invoke('aiMessageAssistant', {
      action: 'generateReply',
      client,
      tone: useTone,
      conversationMessages: allMessages,
      checkIn: checkIns?.[0],
    });
    setSuggestion(res.data?.message || '');
    if (res.data?.tone) setToneLabel(res.data.tone);
    setLoading(false);
  }, [client, allMessages, checkIns, tone]);

  const handleToneChange = (t) => {
    setTone(t);
    setToneLabel(TONE_LABELS[t]);
    setShowTonePicker(false);
    generate(t);
  };

  if (!visible) {
    return (
      <button
        onClick={() => generate(null)}
        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-ai/10 border border-primary/20 text-primary hover:from-primary/15 hover:to-ai/15 transition-all"
      >
        <Sparkles className="w-3 h-3" />
        AI Suggest Reply
      </button>
    );
  }

  return (
    <div className="mx-1 mb-2 rounded-xl border border-primary/20 bg-gradient-to-br from-accent/10 to-ai/10 p-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-primary">AI Suggested Reply</span>
          {!loading && toneLabel !== 'Auto' && (
            <span className="text-[10px] text-muted-foreground bg-[var(--kc-w-70)] px-1.5 py-0.5 rounded-full">{toneLabel}</span>
          )}
        </div>
        <button onClick={() => { setVisible(false); setSuggestion(null); }} className="text-muted-foreground hover:text-muted-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Reading conversation & generating reply…</span>
        </div>
      )}

      {/* Suggestion */}
      {suggestion && !loading && (
        <>
          <p className="text-xs text-foreground leading-relaxed bg-[var(--kc-w-70)] rounded-lg p-2.5 mb-2.5 border border-white">
            {suggestion}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { onUse(suggestion); setVisible(false); setSuggestion(null); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
              <Check className="w-3 h-3" /> Use This
            </button>
            <button onClick={() => { onEditFirst(suggestion); setVisible(false); setSuggestion(null); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-card border border-primary/30 text-primary rounded-full hover:bg-primary/5 transition-colors">
              <Edit3 className="w-3 h-3" /> Edit First
            </button>
            <button onClick={() => generate(tone)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-card border border-border text-muted-foreground rounded-full hover:bg-muted transition-colors">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>

            {/* Tone picker */}
            <div className="relative ml-auto">
              <button onClick={() => setShowTonePicker(s => !s)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
                Change Tone <ChevronDown className="w-3 h-3" />
              </button>
              {showTonePicker && (
                <div className="absolute bottom-full mb-1 right-0 bg-card border border-border rounded-xl shadow-xl p-1.5 w-48 z-30">
                  {TONE_OPTIONS.map(t => (
                    <button key={t.key} onClick={() => handleToneChange(t.key)}
                      className="w-full text-left text-[11px] px-3 py-1.5 rounded-lg hover:bg-primary/5 text-foreground transition-colors">
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}