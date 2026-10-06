import React, { useState } from 'react';
import { Loader2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

const CATEGORY_LABEL = {
  calories: 'Calories', cardio: 'Cardio', intensity: 'Training', nutrition: 'Nutrition', recovery: 'Recovery',
};

function SuggestionRow({ suggestion, onApply, applied }) {
  const high = suggestion.impact === 'high';
  return (
    <div className={cn('flex items-start gap-3 py-3.5 border-b border-ai-foreground/10 last:border-b-0', applied && 'opacity-60')}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ai-foreground/60">
          {CATEGORY_LABEL[suggestion.category] || 'Change'}
          {suggestion.impact && <span className={cn(high && 'text-ai-foreground')}> · {suggestion.impact} impact</span>}
        </p>
        <p className="text-[15px] font-semibold text-ai-foreground mt-0.5">{suggestion.title}</p>
        <p className="text-sm text-ai-foreground/75 leading-relaxed mt-1">{suggestion.rationale}</p>
      </div>
      <Button
        size="sm"
        className="bg-ai-foreground text-ai hover:bg-ai-foreground/90 flex-shrink-0 mt-1"
        onClick={() => onApply(suggestion)}
        disabled={applied}
      >
        {applied ? <><Check /> Noted</> : 'Mark applied'}
      </Button>
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
    <section className="rounded-xl bg-ai text-ai-foreground">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 className="text-[20px]">What to change next week</h2>
          <p className="text-sm text-ai-foreground/70 mt-0.5">
            {appliedCount > 0
              ? `${appliedCount} marked as applied. Update the plan itself to match.`
              : 'The AI reads weight trend, compliance, sleep and energy and suggests adjustments.'}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {suggestions.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Collapse' : 'Expand'} className="p-1.5 rounded-md hover:bg-ai-foreground/10">
              <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className={cn(suggestions.length ? 'border border-ai-foreground/25 text-ai-foreground hover:bg-ai-foreground/10' : 'bg-ai-foreground text-ai hover:bg-ai-foreground/90')}
            onClick={generate}
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Reading…' : suggestions.length ? 'Ask again' : 'Suggest changes'}
          </Button>
        </div>
      </div>

      {error && <p className="px-5 pb-4 text-sm text-ai-foreground/80">{error}</p>}

      {suggestions.length > 0 && expanded && (
        <div className="px-5 pb-3">
          {suggestions.map((s, i) => (
            <SuggestionRow
              key={i}
              suggestion={s}
              onApply={handleApply}
              applied={!!applied[s.title]}
            />
          ))}
        </div>
      )}

      {suggestions.length > 0 && !expanded && (
        <p className="px-5 pb-4 text-sm text-ai-foreground/70">{suggestions.length} suggestions{appliedCount > 0 ? `, ${appliedCount} applied` : ''}</p>
      )}
      {!suggestions.length && <div className="pb-2" />}
    </section>
  );
}
