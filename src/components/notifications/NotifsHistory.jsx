import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// Filter chips -> notifications.category values (CHECK constraint in the DB).
const TYPE_LABELS = {
  all: 'All', client: 'Client', payment: 'Payments',
  message: 'Messages', ai: 'AI', schedule: 'Schedule', system: 'System',
};
const CATEGORY_GROUP = {
  client: 'client', client_activity: 'client', checkin: 'client', workout: 'client', achievement: 'client',
  nutrition: 'client', intake: 'client', reminder: 'client',
  payment: 'payment', message: 'message', ai: 'ai', atrisk: 'ai', schedule: 'schedule', system: 'system',
};

/** The coach's real notifications from the last 30 days (previously a hardcoded sample list). */
export default function NotifsHistory({ onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['notification-history', user?.id],
    queryFn: () => db.entities.Notification.filter({ recipient_id: user.id }, '-created_date', 300),
    enabled: !!user?.id,
  });
  const since = subDays(new Date(), 30);
  const items = rows
    .filter((n) => new Date(n.created_at) >= since)
    .map((n) => ({ id: n.id, type: CATEGORY_GROUP[n.category] || 'system', title: n.title, body: n.body, time: new Date(n.created_at), read: !!n.is_read }));

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.type !== filter) return false;
    if (readFilter === 'unread' && i.read) return false;
    if (readFilter === 'read' && !i.read) return false;
    return true;
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const markRead = async (id) => {
    await db.entities.Notification.update(id, { is_read: true });
    refresh();
  };
  const markAllRead = async () => {
    await Promise.allSettled(items.filter(i => !i.read).map(i => db.entities.Notification.update(i.id, { is_read: true })));
    refresh();
  };

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgb(17_19_24/0.5)]">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-card w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-[22px] text-foreground">Notification history</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">{unreadCount > 0 ? `${unreadCount} unread` : 'All read'} · last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
                Mark all read
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="touch-compact w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 px-5 pb-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide rounded-lg bg-card p-0.5 shadow-[0_0_0_1px_rgb(var(--border)/0.9)] max-w-full">
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={cn('touch-compact h-7 px-2.5 rounded-md text-[12px] font-medium flex-shrink-0 transition-colors',
                  filter === val ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent')}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 rounded-lg bg-card p-0.5 shadow-[0_0_0_1px_rgb(var(--border)/0.9)]">
            {['all', 'unread', 'read'].map(v => (
              <button key={v} onClick={() => setReadFilter(v)}
                className={cn('touch-compact h-7 px-2.5 rounded-md text-[12px] font-medium capitalize transition-colors',
                  readFilter === v ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent')}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-5 py-10 text-sm text-muted-foreground" role="status">Loading notifications…</p>
          ) : isError ? (
            <div className="px-5 py-10">
              <p className="text-[15px] font-semibold text-foreground">Notifications didn't load.</p>
              <button onClick={() => refetch()} className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10">
              <p className="text-[15px] font-semibold text-foreground">{items.length ? 'Nothing matches this filter.' : 'No notifications in the last 30 days.'}</p>
              <p className="text-sm text-muted-foreground mt-1">{items.length ? 'Try a different filter.' : 'Check-ins, messages, payments and at-risk alerts show up here.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(n => (
                <button type="button" key={n.id} onClick={() => !n.read && markRead(n.id)}
                  className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-accent transition-colors">
                  <span aria-hidden className={cn('mt-[7px] h-2 w-2 rounded-full flex-shrink-0', n.read ? 'bg-transparent' : 'bg-brand')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm text-foreground truncate', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">{format(n.time, 'MMM d, h:mm a')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
