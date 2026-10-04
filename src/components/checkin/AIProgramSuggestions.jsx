import React, { useState } from 'react';
import { Sparkles, Loader2, Check, ChevronDown, ChevronUp, Flame, Footprints, Dumbbell, Utensils, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

const CATEGORY_META = {
  calories:  { icon: Flame,     color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  cardio:    { icon: Footprints, color: 'text-primary',    bg: 'bg-primary/10 border-primary/20' },
  intensity: { icon: Dumbbell,  color: 'text-ai',  bg: 'bg-ai/10 border-ai/20' },
  nutrition: { icon: Utensils,  color: 'text-success', bg: 'bg-success/10 border-success/20' },
  recovery:  { icon: Zap,       color: 'text-warning',   bg: 'bg-warning/10 border-warning/20' },
};


function SuggestionCard({ suggestion, onApply, applied }) {
  const meta = CATEGORY_META[suggestion.category] || CATEGORY_META.intensity;
  const Icon = meta.icon;
  const impactColor = suggestion.impact === 'high' ? 'text-destructive' : suggestion.impact === 'medium' ? 'text-warning' : 'text-muted-foreground';

  return (
    <div className={cn('border rounded-xl p-3.5 space-y-2 transition-all', meta.bg, applied && 'opacity-50')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={cn('w-4 h-4 flex-shrink-0', meta.color)} />
          <p className="text-sm font-semibold leading-snug">{suggestion.title}</p>
        </div>
        <span className={cn('text-[10px] font-bold uppercase tracking-wide flex-shrink-0', impactColor)}>
          {suggestion.impact}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-6">{suggestion.rationale}</p>
      <div className="flex justify-end pl-6">
        <Button
          size="sm"
          variant={applied ? 'secondary' : 'default'}
          className="h-7 text-xs gap-1.5"
          onClick={() => onApply(suggestion)}
          disabled={applied}
        >
          {applied ? <><Check className="w-3 h-3" /> Applied</> : 'Apply Change'}
        </Button>
      </div>
    </div>
  );
}

export default function AIProgramSuggestions({ checkIn, client, allClientCIs = [], nutritionPlan, onApply }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [applied, setApplied] = useState({});
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    const res = await db.functions.invoke('aiCheckInInsights', {
      action: 'programSuggestions', client, checkIn, recentCheckIns: allClientCIs, nutritionPlan,
    });
    setSuggestions(res.data?.suggestions || []);
    setLoading(false);
  };

  const handleApply = (suggestion) => {
    setApplied(prev => ({ ...prev, [suggestion.title]: true }));
    if (onApply) onApply(suggestion);
  };

  const appliedCount = Object.keys(applied).length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">AI Program Suggestions</p>
          {appliedCount > 0 && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              {appliedCount} applied
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          )}
          <Button
            size="sm"
            variant={suggestions.length ? 'outline' : 'default'}
            className={cn('h-8 text-xs gap-1.5', !suggestions.length && 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20')}
            onClick={generate}
            disabled={loading}
          >
            {loading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />
            }
            {loading ? 'Analyzing...' : suggestions.length ? 'Regenerate' : 'Analyze & Suggest'}
          </Button>
        </div>
      </div>

      {/* Content */}
      {!suggestions.length && !loading && (
        <div className="px-4 py-6 text-center space-y-1.5">
          <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Click "Analyze & Suggest" to get AI-powered adjustment recommendations based on this check-in data.</p>
        </div>
      )}

      {loading && (
        <div className="px-4 py-6 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Analyzing weight trend, compliance, sleep & energy...</p>
        </div>
      )}

      {suggestions.length > 0 && expanded && (
        <div className="p-4 space-y-2.5">
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={i}
              suggestion={s}
              onApply={handleApply}
              applied={!!applied[s.title]}
            />
          ))}
          {appliedCount > 0 && (
            <p className="text-[11px] text-center text-muted-foreground pt-1">
              {appliedCount} suggestion{appliedCount > 1 ? 's' : ''} marked as applied. Remember to update the client's plan manually.
            </p>
          )}
        </div>
      )}

      {suggestions.length > 0 && !expanded && (
        <div className="px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{suggestions.length} suggestions generated</span>
          {appliedCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-success">
              <Check className="w-3 h-3" />{appliedCount} applied
            </span>
          )}
        </div>
      )}
    </div>
  );
}