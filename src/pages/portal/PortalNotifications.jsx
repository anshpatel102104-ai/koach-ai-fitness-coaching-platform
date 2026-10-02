import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { ArrowLeft, CheckCheck, Settings, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';

/* ── Category config ── */
const CAT = {
  workout:     { emoji: '💪', bg: 'rgb(var(--accent))', color: 'rgb(var(--primary))', label: 'Workout' },
  nutrition:   { emoji: '🥗', bg: 'rgb(var(--success))', color: 'rgb(var(--success))', label: 'Nutrition' },
  checkin:     { emoji: '📋', bg: '#F0FDFA', color: '#0D9488', label: 'Check-in' },
  message:     { emoji: '💬', bg: 'rgb(var(--ai))', color: 'rgb(var(--ai))', label: 'Coach' },
  achievement: { emoji: '🏆', bg: 'rgb(var(--warning))', color: 'rgb(var(--warning))', label: 'Achievement' },
  payment:     { emoji: '💳', bg: 'rgb(var(--success))', color: 'rgb(var(--success))', label: 'Payment' },
  reminder:    { emoji: '⏰', bg: 'rgb(var(--warning))', color: '#EA580C', label: 'Reminder' },
  celebration: { emoji: '🎉', bg: '#FDF4FF', color: '#A21CAF', label: 'Celebration' },
  system:      { emoji: '⚙️', bg: 'rgb(var(--muted))', color: 'rgb(var(--muted-foreground))', label: 'System' },
  community:   { emoji: '👥', bg: '#F0F9FF', color: 'rgb(var(--primary))', label: 'Community' },
};

const TABS = [
  { id: 'all',         label: 'All' },
  { id: 'workout',     label: 'Workouts' },
  { id: 'nutrition',   label: 'Nutrition' },
  { id: 'checkin',     label: 'Check-ins' },
  { id: 'message',     label: 'Coach' },
  { id: 'achievement', label: 'Achievements' },
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
    week:      { label: 'This Week',  items: [] },
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
function NotifRow({ n, onTap, onDismiss }) {
  const cfg = CAT[n.category] || CAT.system;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
      className="flex items-start gap-3 px-4 py-4 border-b border-border active:bg-muted transition-colors relative"
      style={{ background: !n.is_read ? 'rgb(var(--primary) / 0.025)' : 'transparent' }}
      onClick={() => onTap(n)}
    >
      {/* Unread dot */}
      {!n.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: cfg.bg }}>
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug line-clamp-1"
          style={{ fontWeight: n.is_read ? 500 : 700, color: n.is_read ? 'rgb(var(--foreground))' : 'rgb(var(--foreground))' }}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
        )}
        <p className="text-[11px] text-border mt-1">{timeLabel(n.created_date)}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-border flex-shrink-0 mt-1" />
    </motion.div>
  );
}

/* ── Detail sheet ── */
function NotifDetail({ n, onClose, navigate }) {
  const cfg = CAT[n.category] || CAT.system;
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl"
      style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-4" />

      <div className="px-5 pb-8">
        {/* Icon + category */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: cfg.bg }}>
            {cfg.emoji}
          </div>
          <div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">{timeLabel(n.created_date)}</p>
          </div>
        </div>

        {/* Title & body */}
        <h2 className="text-lg font-black text-foreground leading-snug mb-2">{n.title}</h2>
        {n.body && <p className="text-muted-foreground text-sm leading-relaxed">{n.body}</p>}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {n.action_label && n.link && (
            <button
              onClick={() => { navigate(n.link); onClose(); }}
              className="w-full py-4 rounded-2xl font-bold text-white text-base"
              style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}CC)`, boxShadow: `0 4px 20px ${cfg.color}40` }}>
              {n.action_label}
            </button>
          )}
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl font-semibold text-muted-foreground border border-border bg-muted text-sm">
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Preferences sheet ── */
function PrefsSheet({ onClose }) {
  const PREFS = [
    { id: 'workout',   label: 'Workout reminders',  locked: false, default: true },
    { id: 'nutrition', label: 'Meal reminders',      locked: false, default: true },
    { id: 'checkin',   label: 'Check-in reminders',  locked: false, default: true },
    { id: 'message',   label: 'Coach messages',      locked: true,  default: true },
    { id: 'achievement',label: 'Achievement alerts', locked: false, default: true },
    { id: 'payment',   label: 'Payment reminders',   locked: true,  default: true },
    { id: 'community', label: 'Community updates',   locked: false, default: false },
  ];
  const [prefs, setPrefs] = useState(() => Object.fromEntries(PREFS.map(p => [p.id, p.default])));

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl"
      style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
      <div className="flex items-center justify-between px-5 py-3">
        <h3 className="font-black text-foreground text-lg">Notification Preferences</h3>
        <button onClick={onClose} className="text-primary font-bold text-sm">Done</button>
      </div>
      <div className="px-5 pb-8 space-y-0">
        {PREFS.map(p => (
          <div key={p.id} className="flex items-center justify-between py-4 border-b border-border last:border-0">
            <div>
              <p className="text-foreground font-semibold text-[14px]">{p.label}</p>
              {p.locked && <p className="text-[11px] text-muted-foreground">Required — cannot disable</p>}
            </div>
            <button
              disabled={p.locked}
              onClick={() => !p.locked && setPrefs(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
              className={`relative rounded-full transition-all flex-shrink-0 ${p.locked ? 'opacity-60' : ''}`}
              style={{ width: 44, height: 24, background: prefs[p.id] ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--border))' }}
            >
              <div className="absolute top-0.5 rounded-full bg-card shadow transition-all"
                style={{ width: 20, height: 20, left: prefs[p.id] ? 22 : 2, transition: 'left 0.15s' }} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Empty state ── */
function EmptyState({ tab, onClear, navigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="text-6xl mb-4">🔔</div>
      <p className="font-black text-foreground text-xl mb-2">No notifications yet</p>
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
        {tab === 'all'
          ? 'Your activity and coach updates will appear here'
          : `No ${TABS.find(t => t.id === tab)?.label.toLowerCase()} notifications`}
      </p>
      {tab !== 'all' && (
        <button onClick={onClear}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary bg-accent border border-primary">
          Show all notifications
        </button>
      )}
      <button onClick={() => navigate('/portal')}
        className="mt-3 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
        Go to Dashboard
      </button>
    </div>
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
    queryFn: () => base44.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['portal-notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter(
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
    Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
    });
  }, [notifications.length, user?.id]);

  // Real-time
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_id !== user.id) return;
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
    });
    return unsub;
  }, [user?.id]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
  };

  const handleTap = async (n) => {
    if (!n.is_read) {
      await base44.entities.Notification.update(n.id, { is_read: true });
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
    <div className="fixed inset-0 bg-card flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-border flex-shrink-0 bg-card"
        style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <button onClick={() => navigate('/portal')}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h1 className="font-black text-foreground text-[17px]">Notifications</h1>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-bold text-primary px-2 py-1 rounded-lg">
              <CheckCheck className="w-3.5 h-3.5" />
              All read
            </button>
          )}
          <button onClick={() => setShowPrefs(true)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 bg-accent border-b border-accent flex-shrink-0">
          <p className="text-xs font-bold text-primary">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide flex-shrink-0 border-b border-border">
        {TABS.map(t => {
          const count = t.id === 'all'
            ? notifications.length
            : notifications.filter(n => n.category === t.id).length;
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold flex-shrink-0 whitespace-nowrap transition-all"
              style={{
                background: isActive ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--muted))',
                color: isActive ? 'white' : 'rgb(var(--muted-foreground))',
                border: isActive ? 'none' : '1px solid rgb(var(--border))',
              }}>
              {t.label}
              {count > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'rgb(var(--border))', color: isActive ? 'white' : 'rgb(var(--muted-foreground))' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <EmptyState tab={tab} onClear={() => setTab('all')} navigate={navigate} />
        ) : (
          <AnimatePresence>
            {groups.map(group => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-muted border-y border-border">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{group.label}</p>
                </div>
                {group.items.map(n => (
                  <NotifRow key={n.id} n={n}
                    onTap={handleTap}
                    onDismiss={async (id) => {
                      await base44.entities.Notification.update(id, { is_dismissed: true });
                      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
                    }}
                  />
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}

        {notifications.length > 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-border">Notifications are stored for 60 days</p>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelected(null)} />
            <NotifDetail n={selected} onClose={() => setSelected(null)} navigate={navigate} />
          </>
        )}
      </AnimatePresence>

      {/* Prefs sheet */}
      <AnimatePresence>
        {showPrefs && (
          <>
            <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowPrefs(false)} />
            <PrefsSheet onClose={() => setShowPrefs(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}