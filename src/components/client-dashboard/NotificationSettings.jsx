import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const REMINDER_TYPES = [
  { key: 'workout', label: 'Workout', time: '07:00', description: 'Morning nudge to train' },
  { key: 'hydration', label: 'Water', time: '10:00', description: 'Reminder to drink water' },
  { key: 'steps', label: 'Steps', time: '18:00', description: 'Evening steps check' },
  { key: 'checkin', label: 'Weekly check-in', time: '20:00', description: 'Reminder to send your check-in' },
];

export default function NotificationSettings() {
  const [permission, setPermission] = useState('default');
  const [enabled, setEnabled] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPermission(Notification?.permission || 'default');
    const stored = JSON.parse(localStorage.getItem('ff_notifications') || '{}');
    setEnabled(stored);
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const toggle = (key) => setEnabled(e => ({ ...e, [key]: !e[key] }));

  const saveSettings = () => {
    localStorage.setItem('ff_notifications', JSON.stringify(enabled));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Schedule a demo notification for any enabled
    if (permission === 'granted') {
      const activeKeys = Object.keys(enabled).filter(k => enabled[k]);
      if (activeKeys.length > 0) {
        new Notification('FitForge Reminders', {
          body: `${activeKeys.length} reminder${activeKeys.length > 1 ? 's' : ''} set up.`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl text-foreground">Reminders</h2>
          <p className="text-[13px] text-muted-foreground">Pick what we nudge you about, and when.</p>
        </div>
        {permission !== 'granted' && (
          <Button size="sm" variant="outline" onClick={requestPermission}>
            <Bell /> Turn on
          </Button>
        )}
      </div>

      {permission === 'denied' && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          Notifications are blocked. Allow them in your browser settings.
        </p>
      )}

      <ul className="mt-3 divide-y divide-border border-t border-border">
        {REMINDER_TYPES.map(r => (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => toggle(r.key)}
              disabled={permission !== 'granted'}
              aria-pressed={!!enabled[r.key]}
              className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">{r.label}</span>
                <span className="block text-[13px] text-muted-foreground">{r.description}, {r.time}</span>
              </span>
              <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                enabled[r.key] ? 'bg-primary text-primary-foreground' : 'border-[1.5px] border-input')}>
                {enabled[r.key] && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {permission === 'granted' && (
        <Button className="mt-4 w-full" onClick={saveSettings} variant={saved ? 'outline' : 'default'}>
          {saved ? <><Check /> Saved</> : 'Save reminders'}
        </Button>
      )}
    </section>
  );
}
