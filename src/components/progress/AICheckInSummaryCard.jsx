import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Generates a fast post-check-in summary card for the coach review panel */

const SENTIMENT_CONFIG = {
  great: { border: 'border-success', bg: 'bg-success/10', dot: 'bg-success', label: '🟢 Strong week' },
  good: { border: 'border-primary', bg: 'bg-accent', dot: 'bg-primary', label: '🔵 Good week' },
  okay: { border: 'border-warning', bg: 'bg-warning/10', dot: 'bg-warning', label: '🟡 Average week' },
  concerning: { border: 'border-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive', label: '🔴 Needs attention' },
};

export default function AICheckInSummaryCard({ client, checkIn, allClientCIs = [], autoGenerate = true }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const sorted = [...allClientCIs].filter(ci => ci.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  const prevCheckIn = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const generate = async () => {
    if (!checkIn || allClientCIs.length < 1) return;
    setLoading(true);
    setSummary(null);
    const res = await db.functions.invoke('aiProgressInsights', {
      action: 'checkInSummary', client, checkIn, prevCheckIn, recentCheckIns: sorted,
    });
    setSummary(res.data);
    setLoading(false);
  };

  useEffect(() => {
    if (autoGenerate && checkIn && allClientCIs.length >= 1) {
      generate();
    }
  }, [checkIn?.id]);

  const cfg = SENTIMENT_CONFIG[summary?.sentiment] || SENTIMENT_CONFIG.okay;

  return (
    <div className={cn('rounded-2xl border p-4 space-y-3', summary ? `${cfg.border} ${cfg.bg}` : 'border-border bg-card')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">AI Check-in Summary</p>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--kc-w-70)] border border-current/20">
              {cfg.label}
            </span>
          )}
          <button onClick={generate} disabled={loading} className="p-1 rounded-lg hover:bg-black/5 transition-colors text-muted-foreground">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Analyzing check-in data...</span>
        </div>
      )}

      {summary && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">{summary.summary}</p>

          {summary.week_vs_prev && (
            <p className="text-xs text-muted-foreground italic">{summary.week_vs_prev}</p>
          )}

          {summary.coaching_focus && (
            <div className="flex items-start gap-2 bg-[var(--kc-w-80)] rounded-xl p-2.5">
              <span className="text-primary text-xs font-bold flex-shrink-0">🎯 Focus:</span>
              <p className="text-xs text-foreground font-semibold">{summary.coaching_focus}</p>
            </div>
          )}

          {summary.key_wins?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summary.key_wins.map((w, i) => (
                <span key={i} className="text-[11px] font-medium px-2 py-1 bg-success/10 text-success rounded-full">✓ {w}</span>
              ))}
            </div>
          )}

          {summary.red_flags?.filter(Boolean).length > 0 && (
            <div className="space-y-1">
              {summary.red_flags.filter(Boolean).map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                  <span className="flex-shrink-0">⚠️</span> {f}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !summary && (
        <button onClick={generate} className="w-full text-xs text-primary font-semibold py-2 border border-dashed border-primary/30 rounded-xl hover:bg-primary/5 transition-colors">
          ✨ Generate AI Summary
        </button>
      )}
    </div>
  );
}