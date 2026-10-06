import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: 'Balanced',         p: 30, c: 40, f: 30 },
  { label: 'High protein',     p: 40, c: 30, f: 30 },
  { label: 'Performance',      p: 30, c: 50, f: 20 },
  { label: 'Low carb',         p: 40, c: 20, f: 40 },
];

// Adjust the OTHER two sliders proportionally so the total stays 100
function rebalance(split, changed, newVal) {
  const others = ['p', 'c', 'f'].filter(k => k !== changed);
  const remaining = 100 - newVal;
  const prevOtherTotal = split[others[0]] + split[others[1]];
  let a, b;
  if (prevOtherTotal === 0) {
    a = Math.round(remaining / 2);
    b = remaining - a;
  } else {
    a = Math.round((split[others[0]] / prevOtherTotal) * remaining);
    b = remaining - a;
  }
  return { ...split, [changed]: newVal, [others[0]]: a, [others[1]]: b };
}

function MacroSlider({ label, color, pct, grams, onChange, min = 5, max = 70 }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-semibold', color)}>{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-extrabold tabular-nums', color)}>{pct}%</span>
          {grams !== null && (
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {grams}g
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={pct}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full cursor-pointer accent-[rgb(var(--foreground))]"
          aria-label={label}
        />
      </div>
    </div>
  );
}

export default function MacroSplitControl({ split, onChange, totalCalories, weightLbs }) {
  const cal = Number(totalCalories) || 0;
  const wLbs = Number(weightLbs) || null;

  const proteinG  = cal > 0 ? Math.round((split.p / 100) * cal / 4) : null;
  const carbsG    = cal > 0 ? Math.round((split.c / 100) * cal / 4) : null;
  const fatsG     = cal > 0 ? Math.round((split.f / 100) * cal / 9) : null;
  const perLb     = wLbs && proteinG ? proteinG / wLbs : null;
  const lowProtein = perLb !== null && perLb < 0.7;

  function handleSlider(key, val) {
    onChange(rebalance(split, key, val));
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(pr => {
            const active = split.p === pr.p && split.c === pr.c && split.f === pr.f;
            return (
              <button
                key={pr.label}
                type="button"
                onClick={() => onChange({ p: pr.p, c: pr.c, f: pr.f })}
                className={cn(
                  'px-2.5 h-8 rounded-md text-[13px] font-medium border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-accent'
                )}
              >
                {pr.label}
                <span className="ml-1 font-normal opacity-70">
                  {pr.p}P / {pr.c}C / {pr.f}F
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div
        className="rounded-xl border border-border bg-card p-4 space-y-4"
      >

        {/* Protein */}
        <div>
          <MacroSlider
            label="Protein"
            color="text-foreground"
            pct={split.p}
            grams={proteinG}
            onChange={v => handleSlider('p', v)}
          />
        </div>

        {/* Carbs */}
        <div>
          <MacroSlider
            label="Carbohydrates"
            color="text-foreground"
            pct={split.c}
            grams={carbsG}
            onChange={v => handleSlider('c', v)}
          />
        </div>

        {/* Fats */}
        <div>
          <MacroSlider
            label="Fats"
            color="text-foreground"
            pct={split.f}
            grams={fatsG}
            onChange={v => handleSlider('f', v)}
          />
        </div>

        {/* Visual ratio bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
          <div className="bg-foreground transition-[width] duration-200" style={{ width: `${split.p}%` }} />
          <div className="bg-muted-foreground/70 transition-[width] duration-200" style={{ width: `${split.c}%` }} />
          <div className="bg-input transition-[width] duration-200" style={{ width: `${split.f}%` }} />
        </div>

        {/* Total reminder */}
        <p className="text-[13px] text-muted-foreground tabular-nums">
          {split.p + split.c + split.f === 100
            ? 'Total: 100%'
            : `Total: ${split.p + split.c + split.f}%, rebalancing the others`}
        </p>
      </div>

      {/* Low-protein caution */}
      {lowProtein && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <p className="text-[13px] text-foreground leading-relaxed">
            <span className="font-bold">Low protein caution:</span> at this split,
            protein works out to ~{perLb?.toFixed(2)}g/lb of bodyweight. Most coaches recommend
            ≥0.7g/lb minimum. Consider raising the protein slider.
          </p>
        </div>
      )}
    </div>
  );
}