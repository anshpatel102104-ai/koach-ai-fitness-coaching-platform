import React, { useState } from 'react';
import { Segmented } from '@/components/kit';

const FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'arms', label: 'Arms' },
  { key: 'thighs', label: 'Thighs' },
];

export default function CheckInQuestionMeasurements({ value, onChange, lastMeasurements }) {
  const [unit, setUnit] = useState('in');
  const measurements = value || {};

  const setField = (key, val) => {
    onChange({ ...measurements, [key]: parseFloat(val) || '' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">All optional. Measure at the same spot each week.</p>
        <Segmented size="sm" value={unit} onChange={setUnit} options={[{ value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }]} />
      </div>
      <div className="divide-y divide-border rounded-xl shadow-[0_0_0_1px_rgb(var(--border))]">
        {FIELDS.map(f => (
          <label key={f.key} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-foreground">{f.label}</span>
              {lastMeasurements?.[f.key] && (
                <span className="block text-[13px] text-muted-foreground">Last time {lastMeasurements[f.key]} {unit}</span>
              )}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={measurements[f.key] || ''}
              onChange={e => setField(f.key, e.target.value)}
              placeholder="–"
              className="num h-11 w-24 rounded-lg border border-input bg-card text-center text-[22px] text-foreground focus:outline-none focus:border-foreground"
            />
            <span className="w-6 text-[13px] text-muted-foreground">{unit}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
