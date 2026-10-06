import React, { useState } from 'react';
import { Droplets } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const GLASS_ML = 250; // 1 glass = 250ml

export default function WaterTracker({ target = 2500, onTargetChange, readOnly = false }) {
  const [logged, setLogged] = useState(0);

  const glasses = Math.round(target / GLASS_ML);
  const loggedGlasses = Math.round(logged / GLASS_ML);
  const pct = target ? Math.min(100, Math.round((logged / target) * 100)) : 0;
  const color = pct >= 100 ? 'text-success' : pct >= 60 ? 'text-primary' : 'text-warning';
  const barColor = pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-primary' : 'bg-warning';

  const add = (ml) => setLogged(l => Math.max(0, l + ml));

  return (
    <div className="space-y-3">
      {/* Target setting */}
      {!readOnly && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Daily Water Target (ml)</Label>
            <Input
              type="number"
              value={target}
              onChange={e => onTargetChange && onTargetChange(Number(e.target.value))}
              className="mt-1 h-8 text-sm w-32"
              step={250}
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">≈ {glasses} glasses</p>
            <p className="text-xs text-muted-foreground">({(target / 1000).toFixed(1)}L)</p>
          </div>
        </div>
      )}

      {/* Visual tracker */}
      <div className="p-4 bg-accent border border-accent rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-sm font-bold text-foreground">Water Intake</p>
              <p className="text-xs text-muted-foreground">Today's goal: {(target / 1000).toFixed(1)}L</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${color}`}>{(logged / 1000).toFixed(2)}L</p>
            <p className="text-xs text-muted-foreground">{pct}% of goal</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-accent overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Glass icons */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: glasses }).map((_, i) => (
            <button
              key={i}
              onClick={() => setLogged(Math.max(0, (i < loggedGlasses ? i : i + 1) * GLASS_ML))}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center border transition-all',
                i < loggedGlasses
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-card border-primary text-primary hover:border-primary'
              )}
              title={`${(i + 1) * GLASS_ML}ml`}
            >
              <Droplets className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Quick add buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Quick log:</span>
          {[250, 500, 750].map(ml => (
            <button
              key={ml}
              onClick={() => add(ml)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-secondary text-foreground hover:bg-primary transition-colors"
            >
              +{ml}ml
            </button>
          ))}
          <button
            onClick={() => add(-250)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-card text-muted-foreground border border-border hover:bg-secondary transition-colors"
          >
            −250ml
          </button>
        </div>

        {pct >= 100 && (
          <p className="text-xs font-bold text-success text-center">Water goal hit for today.</p>
        )}
      </div>
    </div>
  );
}