import React, { useState, useCallback } from 'react';
import { Sparkles, X, Check, Edit3, RotateCw, ChevronDown, Zap } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

const TONES = [
  { key: 'motivational', label: '🔥 More Motivational' },
  { key: 'empathetic', label: '💙 More Empathetic' },
  { key: 'direct', label: '⚡ More Direct' },
  { key: 'casual', label: '😊 More Casual' },
  { key: 'professional', label: '🎯 More Professional' },
];

const TONE_COLORS = {
  Motivational: 'bg-orange-50 text-orange-600 border-orange-200',
  Empathetic: 'bg-accent text-primary border-primary',
  Informative: 'bg-success/10 text-success border-success',
  Casual: 'bg-ai/10 text-ai border-ai',
  Direct: 'bg-muted text-muted-foreground border-border',
  Professional: 'bg-muted text-muted-foreground border-border',
};

export default function AIReplyAssistant({
  client,
  conversationMessages = [],
  checkIn,
  onUse,
  onEditFirst,
  onDismiss,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [toneLabel, setToneLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [currentTone, setCurrentTone] = useState(null);
  const [visible, setVisible] = useState(false);

  const generate = useCallback(async (tone = null) => {
    setLoading(true);
    setVisible(true);
    setSuggestion(null);
    try {
      const res = await db.functions.invoke('aiMessageAssistant', {
        action: 'generateReply',
        clientId: client?.id,
        client,
        tone,
        conversationMessages,
        checkIn,
      });
      setSuggestion(res.data?.message || '');
      setToneLabel(res.data?.tone || '');
    } catch (e) {
      setSuggestion('Sorry, could not generate a suggestion right now.');
    }
    setLoading(false);
  }, [client, conversationMessages, checkIn]);

  const handleToneChange = (toneKey) => {
    setCurrentTone(toneKey);
    setShowToneMenu(false);
    generate(toneKey);
  };

  const handleDismiss = () => {
    setVisible(false);
    setSuggestion(null);
    onDismiss?.();
  };

  // Trigger button (shown when not open)
  if (!visible) {
    return (
      <button
        onClick={() => generate(currentTone)}
        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-accent/10 to-ai/10 border border-primary/20 text-primary hover:shadow-sm hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        <Sparkles className="w-3.5 h-3.5" />
        ✨ AI Suggest Reply
      </button>
    );
  }

  return (
    <div className="mx-0 mb-2 rounded-xl border border-primary/20 bg-gradient-to-br from-accent/10 to-ai/10 p-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-[12px] font-bold text-primary">AI Suggested Reply</span>
          {toneLabel && (
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', TONE_COLORS[toneLabel] || 'bg-muted text-muted-foreground border-border')}>
              {toneLabel}
            </span>
          )}
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-muted-foreground transition-colors p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2.5 py-3 px-1">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Analyzing conversation & generating reply…</span>
        </div>
      ) : suggestion ? (
        <>
          <div className="bg-[var(--kc-w-80)] border border-white rounded-lg p-3 mb-3 shadow-sm">
            <p className="text-sm text-foreground leading-relaxed">{suggestion}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { onUse(suggestion); handleDismiss(); }}
              className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Check className="w-3 h-3" /> Use This
            </button>
            <button
              onClick={() => { onEditFirst(suggestion); handleDismiss(); }}
              className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 bg-card border border-primary/30 text-primary rounded-full hover:bg-primary/5 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit First
            </button>
            <button
              onClick={() => generate(currentTone)}
              className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 bg-card border border-border text-muted-foreground rounded-full hover:bg-muted transition-colors"
            >
              <RotateCw className="w-3 h-3" /> Try Again
            </button>

            {/* Change Tone */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowToneMenu(s => !s)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-card border border-border text-muted-foreground rounded-full hover:bg-muted transition-colors"
              >
                <Zap className="w-3 h-3" />
                Tone <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showToneMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-xl shadow-xl p-1.5 w-52 z-30">
                  {TONES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => handleToneChange(t.key)}
                      className={cn(
                        'w-full text-left text-[11px] font-medium px-3 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors',
                        currentTone === t.key && 'bg-primary/10 text-primary font-semibold'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleDismiss} className="text-[11px] text-muted-foreground hover:text-muted-foreground underline">
              Dismiss
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}