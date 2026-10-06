import React from 'react';
import { scoreLabel } from '@/lib/adherence';
import { cn } from '@/lib/utils';

/** Text tone for a 0–100 score: ink when on plan, amber partial, red low. */
function toneText(score) {
  if (score === null || score === undefined) return 'text-muted-foreground';
  if (score >= 80) return 'text-foreground';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

/** Ring stroke for the gauge: green on plan, amber partial, red low. */
function strokeColor(score) {
  if (score === null || score === undefined) return 'rgb(var(--muted-foreground))';
  if (score >= 80) return 'rgb(var(--success))';
  if (score >= 60) return 'rgb(var(--partial))';
  return 'rgb(var(--destructive))';
}

const LABELS = { 'On Track': 'On plan', 'Needs Work': 'Partial', 'At Risk': 'At risk', 'No Data': 'No data' };
const label = (score) => LABELS[scoreLabel(score)] || scoreLabel(score);

/** Inline pill badge */
export function AdherencePill({ score, showLabel = true }) {
  const color = score === null
    ? 'bg-secondary text-muted-foreground'
    : score >= 80 ? 'bg-success-soft text-success'
    : score >= 60 ? 'bg-warning-soft text-warning'
    : 'bg-destructive/10 text-destructive';

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums', color)}>
      {score !== null ? `${score}%` : '–'}
      {showLabel && score !== null && (
        <span className="font-normal opacity-80">· {label(score)}</span>
      )}
    </span>
  );
}

/** Horizontal bar breakdown showing each component */
export function AdherenceBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const items = [breakdown.training, breakdown.nutrition, breakdown.sleep, breakdown.checkin];
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-16 flex-shrink-0 text-[12px] text-muted-foreground">{item.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full',
                item.score === null ? 'w-0' :
                item.score >= 80 ? 'bg-success' :
                item.score >= 60 ? 'bg-partial' : 'bg-destructive'
              )}
              style={{ width: item.score !== null ? `${item.score}%` : '0%' }}
            />
          </div>
          <span className={cn('w-7 text-right text-[12px] font-semibold tabular-nums', toneText(item.score))}>
            {item.score !== null ? `${item.score}` : '–'}
          </span>
          <span className="w-8 text-right text-[12px] text-muted-foreground">{item.weight}%</span>
        </div>
      ))}
    </div>
  );
}

/** Main circular gauge */
export default function AdherenceScore({ score, size = 'md', showLabel = true }) {
  if (size === 'pill') {
    return <AdherencePill score={score} showLabel={showLabel} />;
  }

  const sizes = {
    sm: { text: 'text-[13px]', label: 'text-[11px]', r: 17, svgSize: 40, sw: 4 },
    md: { text: 'text-[17px]', label: 'text-xs',     r: 24, svgSize: 56, sw: 4 },
    lg: { text: 'text-[24px]', label: 'text-xs',     r: 34, svgSize: 80, sw: 6 },
  };
  const s = sizes[size] || sizes.md;
  const pct = score !== null && score !== undefined ? score : 0;
  const circ = 2 * Math.PI * s.r;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: s.svgSize, height: s.svgSize }}>
        <svg width={s.svgSize} height={s.svgSize} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx={s.svgSize / 2} cy={s.svgSize / 2} r={s.r} fill="none" strokeWidth={s.sw} stroke="currentColor" className="text-secondary" />
          <circle
            cx={s.svgSize / 2} cy={s.svgSize / 2} r={s.r}
            fill="none" strokeWidth={s.sw}
            stroke={strokeColor(score)}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('num', s.text, toneText(score))}>
            {score !== null && score !== undefined ? score : '–'}
          </span>
        </div>
      </div>
      {showLabel && <span className={cn('font-medium', s.label, toneText(score))}>{label(score)}</span>}
    </div>
  );
}
