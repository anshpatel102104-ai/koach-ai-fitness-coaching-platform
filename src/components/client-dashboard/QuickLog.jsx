import React from 'react';
import { cn } from '@/lib/utils';
import { Dumbbell, Salad, Droplets, Footprints, Check } from 'lucide-react';

function LogButton({ icon: IconComp, label, value, max, onIncrement, onDecrement, active, activeColor }) {
  const Icon = IconComp;
  return (
    <div className={cn(
      "panel p-4 flex flex-col gap-3",
      active && activeColor
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", active ? "text-current" : "text-muted-foreground")} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <span className="text-[13px] tabular-nums text-muted-foreground">{value || 0}{max ? `/${max}` : ''}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          className="touch-compact w-8 h-8 rounded-md border border-input bg-card hover:bg-accent text-sm font-bold flex items-center justify-center"
        >−</button>
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          {max && (
            <div
              className={cn("h-full rounded-full transition-all", active ? "bg-success" : "bg-foreground")}
              style={{ width: `${Math.min(100, ((value || 0) / max) * 100)}%` }}
            />
          )}
        </div>
        <button
          onClick={onIncrement}
          className="touch-compact w-8 h-8 rounded-md border border-input bg-card hover:bg-accent text-sm font-bold flex items-center justify-center"
        >+</button>
      </div>
    </div>
  );
}

export default function QuickLog({ log, onChange }) {
  const set = (field, val) => onChange({ ...log, [field]: Math.max(0, val) });

  return (
    <div className="space-y-3">
      <h2 className="px-1 text-xl text-foreground">Quick log</h2>

      {/* Workout toggle */}
      <button
        onClick={() => set('workout_done', !log?.workout_done)}
        className={cn(
          "panel w-full flex items-center gap-4 p-4 transition-colors",
          !log?.workout_done && "hover:bg-accent/50"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          "bg-secondary"
        )}>
          <Dumbbell className="w-5 h-5 text-foreground" />
        </div>
        <div className="text-left flex-1">
          <p className="font-semibold text-[15px] text-foreground">Workout</p>
          <p className="text-xs text-muted-foreground">{log?.workout_done ? "Done today" : "Tap when you've trained"}</p>
        </div>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center",
          log?.workout_done ? "bg-success text-white" : "border-[1.5px] border-input"
        )}>
          {log?.workout_done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <LogButton icon={Salad} label="Meals" value={log?.meals_logged} max={4} active={log?.meals_logged >= 3} activeColor="" onIncrement={() => set('meals_logged', (log?.meals_logged || 0) + 1)} onDecrement={() => set('meals_logged', (log?.meals_logged || 0) - 1)} />
        <LogButton icon={Droplets} label="Water" value={log?.water_glasses} max={8} active={log?.water_glasses >= 6} activeColor="" onIncrement={() => set('water_glasses', (log?.water_glasses || 0) + 1)} onDecrement={() => set('water_glasses', (log?.water_glasses || 0) - 1)} />
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Steps</span>
          </div>
          <span className="text-[13px] tabular-nums text-muted-foreground">{(log?.steps || 0).toLocaleString()} / 10,000</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
          <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${Math.min(100, ((log?.steps || 0) / 10000) * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          {[1000, 2000, 5000].map(n => (
            <button key={n} onClick={() => set('steps', (log?.steps || 0) + n)}
              className="flex-1 py-1.5 text-[13px] rounded-md border border-input bg-card hover:bg-accent font-semibold tabular-nums">
              +{n.toLocaleString()}
            </button>
          ))}
          <button onClick={() => set('steps', 0)} className="px-2 py-1.5 text-[13px] rounded-md text-muted-foreground underline underline-offset-4 hover:text-foreground">Reset</button>
        </div>
      </div>
    </div>
  );
}