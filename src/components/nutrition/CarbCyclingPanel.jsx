import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const DAY_TYPES = [
  { key: 'high', label: 'High carb', color: 'bg-primary text-primary-foreground border-primary', badge: 'bg-primary text-primary-foreground border-primary' },
  { key: 'medium', label: 'Medium carb', color: 'bg-muted-foreground text-card border-muted-foreground', badge: 'bg-secondary text-foreground border-input' },
  { key: 'low', label: 'Low carb', color: 'bg-secondary text-foreground border-input', badge: 'bg-card text-foreground border-input' },
  { key: 'none', label: 'Not set', color: 'bg-secondary text-muted-foreground border-border', badge: 'bg-secondary text-muted-foreground border-border' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CarbCyclingPanel({ value = {}, onChange }) {
  // value = { enabled, targets: { high, medium, low }, schedule: { Monday: 'high', ... } }
  const enabled = value.enabled || false;
  const targets = value.targets || { high: '', medium: '', low: '' };
  const schedule = value.schedule || {};

  const update = (patch) => onChange({ ...value, ...patch });

  const setDay = (day, type) => {
    update({ schedule: { ...schedule, [day]: type } });
  };

  const setTarget = (type, val) => {
    update({ targets: { ...targets, [type]: val } });
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-4 p-3.5 bg-warning/10 border border-warning rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Carb Cycling</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assign high/medium/low carb days to the weekly schedule</p>
        </div>
        <button
          type="button"
          onClick={() => update({ enabled: !enabled })}
          className={cn('w-11 h-6 rounded-full transition-all relative flex-shrink-0', enabled ? 'bg-primary' : 'bg-border')}
        >
          <div className={cn('w-5 h-5 rounded-full bg-card shadow absolute top-0.5 transition-all', enabled ? 'left-5' : 'left-0.5')} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Calorie targets per day type */}
          <div className="grid grid-cols-3 gap-3">
            {['high', 'medium', 'low'].map(type => {
              const dt = DAY_TYPES.find(d => d.key === type);
              return (
                <div key={type}>
                  <Label className="text-xs text-muted-foreground">{dt.label} (kcal)</Label>
                  <Input
                    type="number"
                    placeholder={type === 'high' ? '2800' : type === 'medium' ? '2400' : '2000'}
                    value={targets[type] || ''}
                    onChange={e => setTarget(type, e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              );
            })}
          </div>

          {/* Weekly schedule grid */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Weekly Schedule</Label>
            <div className="space-y-1.5">
              {DAYS_OF_WEEK.map(day => {
                const current = schedule[day] || 'none';
                const currentDT = DAY_TYPES.find(d => d.key === current);
                return (
                  <div key={day} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground w-24 flex-shrink-0">{day}</span>
                    <div className="flex gap-1 flex-wrap">
                      {DAY_TYPES.filter(d => d.key !== 'none').map(dt => (
                        <button
                          key={dt.key}
                          type="button"
                          onClick={() => setDay(day, dt.key === current ? 'none' : dt.key)}
                          className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-lg border transition-all',
                            current === dt.key ? dt.color : 'bg-card text-muted-foreground border-border hover:bg-accent'
                          )}
                        >
                          {dt.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    {current !== 'none' && (
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${currentDT?.badge}`}>
                        {targets[current] ? `${targets[current]} kcal` : currentDT?.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}