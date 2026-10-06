import React from 'react';
import { Stat } from '@/components/kit';

export default function ProfileQuickStats({ workouts, checkIns, streak, achievements, onNavigate }) {
  const stats = [
    { label: 'Workouts', value: workouts, path: '/portal/workouts' },
    { label: 'Check-ins', value: checkIns, path: '/portal/checkin' },
    { label: 'Streak', value: streak, unit: 'd', path: '/portal/progress' },
    { label: 'Awards', value: achievements, path: '/portal/progress' },
  ];

  return (
    <section className="panel grid grid-cols-4 divide-x divide-border">
      {stats.map(s => (
        <button key={s.label} type="button" onClick={() => onNavigate(s.path)} className="px-3 py-3 text-left hover:bg-accent/50">
          <Stat size="sm" label={s.label} value={s.value} unit={s.unit} />
        </button>
      ))}
    </section>
  );
}
