import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence } from 'framer-motion';
import {
  Bell, Check, History, Users, MessageSquare, CreditCard, TrendingUp, Brain, CalendarClock, MessagesSquare, Settings2, Newspaper,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsShell, SettingsPanel, SettingsRow, SettingsSwitchRow, fieldClass } from '@/components/settings/SettingsLayout';
import NotifsClientActivity from '@/components/notifications/NotifsClientActivity';
import NotifsMessages from '@/components/notifications/NotifsMessages';
import NotifsPayments from '@/components/notifications/NotifsPayments';
import NotifsLeads from '@/components/notifications/NotifsLeads';
import NotifsAI from '@/components/notifications/NotifsAI';
import NotifsScheduling from '@/components/notifications/NotifsScheduling';
import NotifsCommunity from '@/components/notifications/NotifsCommunity';
import NotifsSystem from '@/components/notifications/NotifsSystem';
import NotifsDigest from '@/components/notifications/NotifsDigest';
import NotifsHistory from '@/components/notifications/NotifsHistory';

const EMPTY = {
  all_notifications_enabled: true,
  push_enabled: true,
  email_enabled: true,
  inapp_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  client_activity: {},
  messages: {},
  payments: {},
  leads: {},
  ai_insights: {},
  scheduling: {},
  community: {},
  system: {},
  daily_digest_enabled: true,
  daily_digest_time: '07:00',
  daily_digest_includes: ['checkins', 'messages', 'sessions', 'at_risk', 'invoices'],
  weekly_digest_enabled: true,
  weekly_digest_day: 1,
  weekly_digest_time: '08:00',
  weekly_digest_includes: ['metrics', 'progress', 'insights', 'pipeline', 'revenue'],
};

export default function NotificationSettings() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [s, setS] = useState(EMPTY);
  const [settingsId, setSettingsId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [section, setSection] = useState('delivery');
  const saveTimer = useRef(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const { data: existing = [] } = useQuery({
    queryKey: ['notif-settings', user?.email],
    queryFn: () => db.entities.NotificationSettings.filter({ coach_id: user.id }, '-created_date', 1),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existing.length > 0) {
      const rec = existing[0];
      setS({ ...EMPTY, ...rec });
      setSettingsId(rec.id);
    }
  }, [existing]);

  const save = useCallback(async (data) => {
    const payload = { ...data, coach_id: user?.id }; // coach_id is uuid (profiles.id), not email
    if (settingsId) {
      await db.entities.NotificationSettings.update(settingsId, payload);
    } else {
      const created = await db.entities.NotificationSettings.create(payload);
      setSettingsId(created.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    queryClient.invalidateQueries({ queryKey: ['notif-settings'] });
  }, [settingsId, user, queryClient]);

  // Auto-save with debounce
  const set = useCallback((key, val) => {
    setS(prev => {
      const next = { ...prev, [key]: val };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(next), 800);
      return next;
    });
  }, [save]);

  const allOff = !s.all_notifications_enabled;

  const NAV = [
    { items: [{ id: 'delivery', label: 'Delivery and quiet hours', icon: Bell }] },
    {
      label: 'What you hear about',
      items: [
        { id: 'client_activity', label: 'Client activity', icon: Users },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'leads', label: 'Leads', icon: TrendingUp },
        { id: 'ai', label: 'AI insights', icon: Brain },
        { id: 'scheduling', label: 'Scheduling', icon: CalendarClock },
        { id: 'community', label: 'Community', icon: MessagesSquare },
        { id: 'system', label: 'Account and system', icon: Settings2 },
        { id: 'digest', label: 'Daily and weekly digest', icon: Newspaper },
      ],
    },
  ];

  const pushBlocked = typeof Notification !== 'undefined' && Notification.permission !== 'granted' && s.push_enabled;

  return (
    <SettingsShell
      backTo="/settings"
      title="Notifications"
      subtitle="Choose what reaches you, where, and when. Changes save as you go."
      nav={NAV}
      active={section}
      onSelect={setSection}
      actions={saved ? <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" /> Saved</span> : null}
      aside={
        <Button variant="outline" className="w-full" onClick={() => setShowHistory(true)}>
          <History /> Last 30 days of notifications
        </Button>
      }
    >
      {section === 'delivery' && (
        <>
          <SettingsPanel tone={allOff ? 'danger' : undefined}>
            <SettingsSwitchRow
              label="All notifications"
              help={allOff ? 'Everything is muted. You will not hear about check-ins or messages.' : 'On. The settings below decide what reaches you.'}
              checked={s.all_notifications_enabled}
              onCheckedChange={v => set('all_notifications_enabled', v)}
            />
          </SettingsPanel>

          {pushBlocked && (
            <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[15px] font-semibold text-foreground">This browser is blocking push notifications</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Allow them so check-ins and messages reach you here.</p>
              </div>
              <Button
                onClick={() => Notification.requestPermission().then(p => { if (p === 'granted') toast.success('Push notifications are on'); })}
                className="flex-shrink-0"
              >
                Allow notifications
              </Button>
            </div>
          )}

          <div className={allOff ? 'opacity-40 pointer-events-none select-none' : ''}>
            <SettingsPanel title="Where they go" subtitle="The default for every notification. Each category can override it.">
              <SettingsSwitchRow label="Push" help="Sent to your phone and this browser." checked={s.push_enabled !== false} onCheckedChange={v => set('push_enabled', v)} />
              <SettingsSwitchRow label="Email" help={`Sent to ${user?.email || 'your business email'}.`} checked={s.email_enabled !== false} onCheckedChange={v => set('email_enabled', v)} />
              <SettingsSwitchRow label="In the app" help="The bell at the top of KOACH." badge={<Badge variant="secondary">Always on</Badge>} checked={s.inapp_enabled !== false} onCheckedChange={v => set('inapp_enabled', v)} disabled />
            </SettingsPanel>
          </div>

          <div className={allOff ? 'opacity-40 pointer-events-none select-none' : ''}>
            <SettingsPanel title="Quiet hours" subtitle="Push stays silent overnight. Emails still send.">
              <SettingsSwitchRow label="Quiet hours" checked={s.quiet_hours_enabled} onCheckedChange={v => set('quiet_hours_enabled', v)} />
              {s.quiet_hours_enabled && (
                <SettingsRow label="Silent between" help="Times are in America/New_York.">
                  <div className="flex items-center gap-2">
                    <input type="time" value={s.quiet_hours_start || '22:00'} onChange={e => set('quiet_hours_start', e.target.value)} className={`${fieldClass} tabular-nums`} aria-label="Quiet hours start" />
                    <span className="text-sm text-muted-foreground">and</span>
                    <input type="time" value={s.quiet_hours_end || '07:00'} onChange={e => set('quiet_hours_end', e.target.value)} className={`${fieldClass} tabular-nums`} aria-label="Quiet hours end" />
                  </div>
                </SettingsRow>
              )}
            </SettingsPanel>
          </div>
        </>
      )}

      {section !== 'delivery' && allOff && (
        <p className="text-sm text-muted-foreground">All notifications are muted. Turn them back on under Delivery and quiet hours.</p>
      )}
      {section !== 'delivery' && (
        <div className={`transition-opacity ${allOff ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {section === 'client_activity' && <NotifsClientActivity s={s} set={set} />}
          {section === 'messages' && <NotifsMessages s={s} set={set} />}
          {section === 'payments' && <NotifsPayments s={s} set={set} />}
          {section === 'leads' && <NotifsLeads s={s} set={set} />}
          {section === 'ai' && <NotifsAI s={s} set={set} />}
          {section === 'scheduling' && <NotifsScheduling s={s} set={set} />}
          {section === 'community' && <NotifsCommunity s={s} set={set} />}
          {section === 'system' && <NotifsSystem s={s} set={set} />}
          {section === 'digest' && <NotifsDigest s={s} setField={set} />}
        </div>
      )}

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && <NotifsHistory onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
    </SettingsShell>
  );
}
