import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

const MOCK_HISTORY = [
  { id: 1, type: 'client_activity', title: 'New check-in submitted', body: 'Sarah Johnson submitted her weekly check-in', time: new Date(), read: false },
  { id: 2, type: 'payments', title: 'Payment received', body: '$299 received from Marcus Williams', time: subDays(new Date(), 1), read: false },
  { id: 3, type: 'messages', title: 'New message from client', body: 'Alex Torres: "Hey coach, quick question about..."', time: subDays(new Date(), 1), read: true },
  { id: 4, type: 'ai_insights', title: 'At-risk client flagged', body: 'Emily Chen hasn\'t logged in for 8 days — risk of churn', time: subDays(new Date(), 2), read: true },
  { id: 5, type: 'scheduling', title: 'Session starting in 1 hour', body: 'Video call with Marcus Williams at 3:00 PM', time: subDays(new Date(), 2), read: true },
  { id: 6, type: 'client_activity', title: 'Client milestone achieved', body: 'Jake Miller is down 10 lb since starting', time: subDays(new Date(), 3), read: true },
  { id: 7, type: 'payments', title: 'Payment failed', body: 'Retry needed: Chris Lee — $199/month', time: subDays(new Date(), 4), read: true },
  { id: 8, type: 'leads', title: 'New lead added', body: 'Jordan Smith entered your pipeline', time: subDays(new Date(), 5), read: true },
  { id: 9, type: 'system', title: 'Plan limit approaching', body: 'You\'re at 90% of your 20-client limit', time: subDays(new Date(), 7), read: true },
  { id: 10, type: 'client_activity', title: 'Check-in overdue', body: 'Ryan Chen hasn\'t submitted this week\'s check-in', time: subDays(new Date(), 10), read: true },
];

const TYPE_LABELS = {
  all: 'All', client_activity: 'Client', payments: 'Payments',
  messages: 'Messages', ai_insights: 'AI', scheduling: 'Schedule',
  leads: 'Leads', system: 'System',
};

export default function NotifsHistory({ onClose }) {
  const [filter, setFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [items, setItems] = useState(MOCK_HISTORY);

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.type !== filter) return false;
    if (readFilter === 'unread' && i.read) return false;
    if (readFilter === 'read' && !i.read) return false;
    return true;
  });

  const markAllRead = () => setItems(prev => prev.map(i => ({ ...i, read: true })));
  const markRead = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));

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
          {filtered.length === 0 ? (
            <div className="px-5 py-10">
              <p className="text-[15px] font-semibold text-foreground">Nothing here.</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  className="flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-accent transition-colors">
                  <span aria-hidden className={cn('mt-[7px] h-2 w-2 rounded-full flex-shrink-0', n.read ? 'bg-transparent' : 'bg-brand')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm text-foreground truncate', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">{format(n.time, 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
