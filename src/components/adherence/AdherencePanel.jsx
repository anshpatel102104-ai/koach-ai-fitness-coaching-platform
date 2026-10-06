import React from 'react';
import { averageAdherenceScore, calculateStreak, detectEarnedBadges, checkInScore } from '@/lib/adherence';
import { cn } from '@/lib/utils';
import AdherenceScore from './AdherenceScore';
import BadgeRow from './BadgeRow';

const tone = (v) => v >= 75 ? 'bg-success' : v >= 50 ? 'bg-partial' : 'bg-destructive';

function MetricBar({ label, value, display, pct, toneValue }) {
  if (value == null) return null;
  const width = pct ?? Math.min(100, value);
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 flex-shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', tone(toneValue ?? pct ?? value))} style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-foreground">{display ?? `${value}%`}</span>
    </div>
  );
}

function trendText(checkIns) {
  const scores = checkIns.slice(0, 4).map(checkInScore).filter(s => s !== null);
  if (scores.length < 2) return null;
  const diff = scores[0] - scores[scores.length - 1];
  if (Math.abs(diff) < 3) return { text: 'Holding steady', cls: 'text-muted-foreground' };
  return diff > 0
    ? { text: `Up ${diff} pts`, cls: 'text-success' }
    : { text: `Down ${Math.abs(diff)} pts`, cls: 'text-destructive' };
}

/** Per-client adherence summary: score, streak, latest check-in bars, badges. */
export default function AdherencePanel({ client, checkIns, badges = [] }) {
  const score = averageAdherenceScore(checkIns, 4);
  const streak = calculateStreak(checkIns);
  const autoEarned = detectEarnedBadges(checkIns);
  const allBadgeKeys = [...new Set([...badges.map(b => b.badge_key), ...autoEarned])];
  const latest = checkIns[0];
  const trend = trendText(checkIns);

  return (
    <div className="space-y-4" data-client={client?.id}>
      <div className="flex items-center gap-4">
        <AdherenceScore score={score} size="md" showLabel={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">
            {score === null ? 'No score yet' : score >= 80 ? 'On plan' : score >= 50 ? 'Partly on plan' : 'Off plan'}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {streak}-week streak{trend && <> · <span className={trend.cls}>{trend.text}</span></>}
          </p>
        </div>
      </div>

      {latest && (
        <div className="space-y-2">
          <MetricBar label="Training" value={latest.compliance_training} />
          <MetricBar label="Nutrition" value={latest.compliance_nutrition} />
          {latest.sleep_hours != null && (
            <MetricBar
              label="Sleep"
              value={latest.sleep_hours}
              display={`${latest.sleep_hours}h`}
              pct={Math.min(100, (latest.sleep_hours / 9) * 100)}
              toneValue={latest.sleep_hours >= 7 ? 100 : latest.sleep_hours >= 6 ? 60 : 30}
            />
          )}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[13px] text-muted-foreground">Badges</p>
        <BadgeRow earnedKeys={allBadgeKeys} max={5} />
      </div>
    </div>
  );
}
