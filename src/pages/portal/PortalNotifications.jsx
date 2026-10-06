import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { CheckCheck, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Segmented } from '@/components/kit';
import { cn } from '@/lib/utils';
import { PortalScreen, PortalHeader, IconButton, Sheet } from '@/components/portal/PortalUI';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';

/* ── Category config ── */
const CAT = {
  workout:     { label: 'Workout' },
  nutrition:   { label: 'Nutrition' },
  checkin:     { label: 'Check-in' },
  message:     { label: 'Coach' },
  achievement: { label: 'Milestone' },
  payment:     { label: 'Payment' },
  reminder:    { label: 'Reminder' },
  celebration: { label: 'Milestone' },
  system:      { label: 'System' },
  community:   { label: 'Community' },
};

const TABS = [
  { id: 'all',         label: 'All' },
  { id: 'workout',     label: 'Workouts' },
  { id: 'nutrition',   label: 'Nutrition' },
  { id: 'checkin',     label: 'Check-ins' },
  { id: 'message',     label: 'Coach' },
  { id: 'achievement', label: 'Milestones' },
  { id: 'payment',     label: 'Payments' },
];

function timeLabel(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
    if (isYesterday(d)) return 'Yesterday';
    if (isThisWeek(d)) return format(d, 'EEEE');
    return format(d, 'MMM d');
  } catch { return ''; }
}

function groupItems(list) {
  const g = {
    today:     { label: 'Today',      items: [] },
    yesterday: { label: 'Yesterday',  items: [] },
    week:      { label: 'This week',  items: [] },
    earlier:   { label: 'Earlier',    items: [] },
  };
  for (const n of list) {
    let d; try { d = new Date(n.created_date); } catch { d = new Date(); }
    if (isToday(d)) g.today.items.push(n);
    else if (isYesterday(d)) g.yesterday.items.push(n);
    else if (isThisWeek(d)) g.week.items.push(n);
    else g.earlier.items.push(n);
  }
  return Object.values(g).filter(x => x.items.length > 0);
}

/* ── Single notification row ── */
function NotifRow({ n, onTap }) {
  const cfg = CAT[n.category] || CAT.system;
  return (
    <li>
      <button type="button" onClick={() => onTap(n)} className="relative flex w-full items-start gap-3 py-3.5 pl-4 text-left">
        {!n.is_read && <span className="absolute left-0 top-[22px] h-2 w-2 rounded-full bg-brand" aria-label="Unread" />}
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[15px] leading-snug text-foreground line-clamp-1', n.is_read ? 'font-medium' : 'font-bold')}>{n.title}</span>
          {n.body && <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground line-clamp-2">{n.body}</span>}
          <span className="mt-1 block text-[13px] text-muted-foreground">{cfg.label}, {timeLabel(n.created_date)}</span>
        </span>
        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

/* ── Detail sheet ── */
function NotifDetail({ n, onClose, navigate }) {
  const cfg = CAT[n.category] || CAT.system;
  return (
    <Sheet open onClose={onClose} title={cfg.label}
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>Dismiss</Button>
          {n.action_label && n.link && (
            <Button size="lg" className="flex-1" onClick={() => { navigate(n.link); onClose(); }}>{n.action_label}</Button>
          )}
        </div>
      )}>
      <p className="text-[13px] text-muted-foreground">{timeLabel(n.created_date)}</p>
      <h3 className="mt-1 text-[24px] text-foreground">{n.title}</h3>
      {n.body && <p className="mt-2 text-[15px] leading-relaxed text-foreground">{n.body}</p>}
    </Sheet>
  );
}

/* ── Preferences sheet ── */
function PrefsSheet({ onClose }) {
  const PREFS = [
    { id: 'workout',   label: 'Workout reminders',  locked: false, default: true },
    { id: 'nutrition', label: 'Meal reminders',      locked: false, default: true },
    { id: 'checkin',   label: 'Check-in reminders',  locked: false, default: true },
    { id: 'message',   label: 'Coach messages',      locked: true,  default: true },
    { id: 'achievement',label: 'Milestones',         locked: false, default: true },
    { id: 'payment',   label: 'Payment reminders',   locked: true,  default: true },
    { id: 'community', label: 'Community updates',   locked: false, default: false },
  ];
  const [prefs, setPrefs] = useState(() => Object.fromEntries(PREFS.map(p => [p.id, p.default])));

  return (
    <Sheet open onClose={onClose} title="Notification settings"
      footer={<Button size="lg" className="w-full" onClick={onClose}>Done</Button>}>
      <ul className="divide-y divide-border">
        {PREFS.map(p => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3.5">
            <span>
              <span className="block text-[15px] font-semibold text-foreground">{p.label}</span>
              {p.locked && <span className="block text-[13px] text-muted-foreground">Always on</span>}
            </span>
            <Switch
              checked={!!prefs[p.id]}
              disabled={p.locked}
              onCheckedChange={() => !p.locked && setPrefs(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
              aria-label={p.label}
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ── Empty state ── */
function EmptyState({ tab, onClear, navigate }) {
  return (
    <section className="panel px-4 py-6">
      <p className="text-[15px] font-semibold text-foreground">
        {tab === 'all' ? 'Nothing here yet' : `No ${TABS.find(t => t.id === tab)?.label.toLowerCase()} notifications`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Replies from your coach, check-in reviews and reminders show up here.</p>
      <div className="mt-4 flex gap-2">
        {tab !== 'all' && <Button variant="outline" size="sm" onClick={onClear}>Show all</Button>}
        <Button size="sm" onClick={() => navigate('/portal')}>Back to today</Button>
      </div>
    </section>
  );
}

/* ── MAIN PAGE ── */
export default function PortalNotifications({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-notif', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['portal-notifications', user?.id],
    queryFn: () => portalDb.entities.Notification.filter(
      { recipient_id: user.id, is_dismissed: false },
      '-created_date',
      60
    ),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Mark all as read when page opens
  useEffect(() => {
    if (!user?.id || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    Promise.all(unread.map(n => portalDb.entities.Notification.update(n.id, { is_read: true }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
    });
  }, [notifications.length, user?.id]);

  // Real-time
  useEffect(() => {
    if (!user?.id) return;
    const unsub = portalDb.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_id !== user.id) return;
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
    });
    return unsub;
  }, [user?.id]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => portalDb.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
  };

  const handleTap = async (n) => {
    if (!n.is_read) {
      await portalDb.entities.Notification.update(n.id, { is_read: true });
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
    }
    setSelected(n);
  };

  const filtered = useMemo(() => {
    if (tab === 'all') return notifications;
    return notifications.filter(n => n.category === tab);
  }, [notifications, tab]);

  const groups = useMemo(() => groupItems(filtered), [filtered]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <PortalScreen>
      <PortalHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread.` : 'All caught up.'}
        onBack={() => navigate('/portal')}
        backLabel="Back to today"
        right={(
          <IconButton label="Notification settings" onClick={() => setShowPrefs(true)}>
            <Settings className="h-4 w-4" />
          </IconButton>
        )}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Segmented
            size="sm"
            className="min-w-0 flex-1"
            value={tab}
            onChange={setTab}
            options={TABS.map(t => ({
              value: t.id,
              label: t.label,
              count: (t.id === 'all' ? notifications.length : notifications.filter(n => n.category === t.id).length) || null,
            }))}
          />
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4">
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}

        {groups.length === 0 ? (
          <EmptyState tab={tab} onClear={() => setTab('all')} navigate={navigate} />
        ) : (
          groups.map(group => (
            <section key={group.label} className="panel px-4 pt-4 pb-1">
              <h2 className="text-lg text-foreground">{group.label}</h2>
              <ul className="divide-y divide-border">
                {group.items.map(n => (
                  <NotifRow key={n.id} n={n}
                    onTap={handleTap}
                    onDismiss={async (id) => {
                      await portalDb.entities.Notification.update(id, { is_dismissed: true });
                      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
                    }}
                  />
                ))}
              </ul>
            </section>
          ))
        )}

        {notifications.length > 0 && (
          <p className="px-1 text-[13px] text-muted-foreground">Notifications are kept for 60 days.</p>
        )}
      </div>

      {/* Detail sheet */}
      {selected && <NotifDetail n={selected} onClose={() => setSelected(null)} navigate={navigate} />}

      {/* Prefs sheet */}
      {showPrefs && <PrefsSheet onClose={() => setShowPrefs(false)} />}
    </PortalScreen>
  );
}
