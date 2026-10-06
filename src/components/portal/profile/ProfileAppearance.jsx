import { Palette } from 'lucide-react';
import React, { useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';

export default function ProfileAppearance() {
  const [theme, setTheme] = useState('dark');
  const [units, setUnits] = useState('imperial');
  const [weekStart, setWeekStart] = useState('sunday');

  const Row = ({ label, options, value, onChange }) => (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-muted-foreground text-xs mb-2">{label}</p>
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgb(var(--secondary))' }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: value === o.value ? 'rgb(var(--primary))' : 'transparent',
              color: value === o.value ? 'rgb(var(--primary-foreground))' : 'rgb(var(--muted-foreground))',
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ProfileSectionCard icon={Palette} title="Appearance & Preferences">
      <div className="pt-1">
        <Row label="Theme" value={theme} onChange={setTheme}
          options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'System', value: 'system' }]} />
        <Row label="Units" value={units} onChange={setUnits}
          options={[{ label: 'Imperial', value: 'imperial' }, { label: 'Metric', value: 'metric' }]} />
        <Row label="Week Starts On" value={weekStart} onChange={setWeekStart}
          options={[{ label: 'Sunday', value: 'sunday' }, { label: 'Monday', value: 'monday' }]} />

        <div className="py-3">
          <p className="text-muted-foreground text-xs mb-1.5">Language</p>
          <div className="flex items-center justify-between">
            <p className="text-foreground text-sm">English</p>
            <span className="text-[12px] px-2 py-1 rounded-full font-bold"
              style={{ background: 'rgb(var(--warning) / 0.15)', color: 'rgb(var(--warning))' }}>Coming Soon</span>
          </div>
        </div>
      </div>
    </ProfileSectionCard>
  );
}