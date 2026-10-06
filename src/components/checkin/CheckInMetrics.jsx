import React from 'react';
import { KeyValue } from '@/components/kit';
import { MOOD_LABEL } from './reviewParts';

/** Check-in numbers as two columns of key/value lines. */
export default function CheckInMetrics({ checkIn }) {
  const flag = (cond) => (cond ? 'text-destructive' : undefined);
  const metrics = [
    { label: 'Weight', value: checkIn.weight ? `${checkIn.weight} lb` : null },
    { label: 'Body fat', value: checkIn.body_fat_pct ? `${checkIn.body_fat_pct}%` : null },
    { label: 'Sleep', value: checkIn.sleep_hours ? `${checkIn.sleep_hours} h` : null, cls: flag(checkIn.sleep_hours < 6) },
    { label: 'Mood', value: checkIn.mood ? (MOOD_LABEL[checkIn.mood] || checkIn.mood) : null, cls: flag(checkIn.mood === 'stressed' || checkIn.mood === 'tired') },
    { label: 'Energy', value: checkIn.energy_level != null ? `${checkIn.energy_level} out of 10` : null, cls: flag(checkIn.energy_level <= 4) },
    { label: 'Stress', value: checkIn.stress_level != null ? `${checkIn.stress_level} out of 10` : null, cls: flag(checkIn.stress_level >= 7) },
    { label: 'Training', value: checkIn.compliance_training != null ? `${Math.round(checkIn.compliance_training)}%` : null, cls: flag(checkIn.compliance_training < 60) },
    { label: 'Nutrition', value: checkIn.compliance_nutrition != null ? `${Math.round(checkIn.compliance_nutrition)}%` : null, cls: flag(checkIn.compliance_nutrition < 60) },
  ].filter(m => m.value);

  if (!metrics.length) return null;

  return (
    <div className="grid sm:grid-cols-2 sm:gap-x-8">
      {metrics.map(m => (
        <KeyValue key={m.label} label={m.label} value={<span className={m.cls}>{m.value}</span>} />
      ))}
    </div>
  );
}
