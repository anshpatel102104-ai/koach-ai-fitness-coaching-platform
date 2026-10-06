import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ProgressStatsRow({ data, metric }) {
  if (!data || data.length === 0) return null;

  const values = data.map(d => d.value).filter(v => v != null);
  if (values.length === 0) return null;

  const current = values[values.length - 1];
  const first = values[0];
  const change = current - first;
  const best = metric.chart === 'area' && metric.key === 'weight'
    ? Math.min(...values)
    : Math.max(...values);
  const avg = (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1);

  const changeColor = change === 0 ? 'var(--tc-muted-foreground)'
    : (metric.key === 'weight' || metric.key === 'body_fat_pct' || metric.key === 'waist') && change < 0
    ? 'var(--tc-success)'
    : change > 0 ? 'var(--tc-success)' : 'var(--tc-destructive)';

  const ChangeIcon = change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  const stats = [
    { label: 'Current', value: `${current}${metric.unit}`, sub: 'Latest entry' },
    { label: 'Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}${metric.unit}`, sub: 'From first entry', color: changeColor, Icon: ChangeIcon },
    { label: 'Best', value: `${best}${metric.unit}`, sub: 'All time' },
    { label: 'Average', value: `${avg}${metric.unit}`, sub: 'Over period' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{s.label}</p>
          <div className="flex items-center gap-1.5">
            {s.Icon && <s.Icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />}
            <p className="text-xl font-bold text-foreground" style={s.color ? { color: s.color } : {}}>{s.value}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}