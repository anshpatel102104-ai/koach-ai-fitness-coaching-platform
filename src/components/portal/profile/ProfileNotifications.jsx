import { Bell } from 'lucide-react';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ProfileSectionCard from './ProfileSectionCard';

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? 'rgb(var(--primary))' : 'rgb(var(--border))' }}>
      <motion.div animate={{ x: value ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-card" />
    </button>
  );
}

const NOTIFICATIONS = [
  { id: 'workout', label: 'Workout Reminders', emoji: '', time: '07:00' },
  { id: 'meals', label: 'Meal Reminders', emoji: '' },
  { id: 'checkin', label: 'Check-in Reminders', emoji: '', time: 'Monday 08:00' },
  { id: 'coach', label: 'Coach Messages', emoji: '', locked: true },
  { id: 'achievements', label: 'Achievement Alerts', emoji: '' },
  { id: 'weekly', label: 'Weekly Progress Summary', emoji: '' },
  { id: 'quote', label: 'Daily Motivation Quote', emoji: '', time: '08:00' },
];

export default function ProfileNotifications() {
  const [master, setMaster] = useState(true);
  const [enabled, setEnabled] = useState({ coach: true, workout: true, achievements: true });

  const toggle = (id) => {
    if (id === 'coach') return; // locked on
    setEnabled(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <ProfileSectionCard icon={Bell} title="Notifications">
      <div className="pt-3 space-y-0">
        {/* Master toggle */}
        <div className="flex items-center gap-3 py-3 border-b border-border mb-1">
          <div className="flex-1">
            <p className="text-foreground font-semibold text-sm">All Notifications</p>
            <p className="text-muted-foreground text-[12px]">Master switch</p>
          </div>
          <Toggle value={master} onChange={setMaster} />
        </div>

        {NOTIFICATIONS.map(n => (
          <div key={n.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0"
            style={{ opacity: master ? 1 : 0.4, pointerEvents: master ? 'auto' : 'none' }}>
            <span className="text-base w-6 text-center flex-shrink-0">{n.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm">{n.label}</p>
              {n.locked && <p className="text-muted-foreground text-[12px]">Recommended — always on</p>}
              {n.time && enabled[n.id] && <p className="text-muted-foreground text-[12px]">{n.time}</p>}
            </div>
            <Toggle value={n.locked ? true : (enabled[n.id] || false)} onChange={() => toggle(n.id)} />
          </div>
        ))}
      </div>
    </ProfileSectionCard>
  );
}