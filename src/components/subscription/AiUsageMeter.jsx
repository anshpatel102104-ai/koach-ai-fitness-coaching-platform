import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getUserTier } from '@/lib/subscription';
import { aiUsage } from '@/lib/aiPolicy';
import { cn } from '@/lib/utils';

const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

/**
 * "12 of 100 AI generations this month, resets November 1".
 * Reads the plan's allowance from TIERS and the counter from the profile, and
 * refreshes the profile whenever a counted generation finishes
 * (the facade emits `koach:ai-usage-changed`).
 */
export default function AiUsageMeter({ className = undefined, bar = false }) {
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => { checkUserAuth?.(); };
    window.addEventListener('koach:ai-usage-changed', refresh);
    return () => window.removeEventListener('koach:ai-usage-changed', refresh);
  }, [checkUserAuth]);

  if (!user) return null;
  const limit = getUserTier(user).limits.max_ai_generations_per_month;
  if (limit === -1) {
    return (
      <p className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Sparkles className="w-3 h-3" /> Unlimited AI generations on your plan
      </p>
    );
  }
  const { used, resetsOn } = aiUsage(user, limit);
  const atLimit = used >= limit;
  const pct = Math.min((used / limit) * 100, 100);
  return (
    <div className={cn('text-xs', className)} data-testid="ai-usage-meter">
      <p className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5', atLimit ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
        <Sparkles className="w-3 h-3" />
        <span>{used} of {limit} AI generations this month, resets {fmtDate(resetsOn)}</span>
        {atLimit && (
          <button type="button" onClick={() => navigate('/subscription')} className="text-primary font-semibold hover:underline">
            Upgrade →
          </button>
        )}
      </p>
      {bar && (
        <div className="h-1.5 rounded-full bg-[var(--kc-w-5)] overflow-hidden mt-2">
          <div className={cn('h-full rounded-full transition-all duration-700', atLimit ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
