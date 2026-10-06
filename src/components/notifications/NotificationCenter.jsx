import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import NotificationItem from './NotificationItem';

const TABS = [
  { id: 'all',         label: 'All' },
  { id: 'unread',      label: 'Unread' },
  { id: 'client',      label: 'Clients' },
  { id: 'achievement', label: 'Wins' },
  { id: 'payment',     label: 'Payments' },
  { id: 'message',     label: 'Messages' },
  { id: 'ai',          label: 'AI' },
  { id: 'system',      label: 'System' },
];

const EMPTY_COPY = {
  all: 'Nothing new. We will let you know when a client needs you.',
  unread: 'You have read everything.',
  client: 'No client updates.',
  achievement: 'No wins logged yet this week.',
  payment: 'No payment updates.',
  message: 'No new messages.',
  ai: 'No AI updates.',
  system: 'No system updates.',
};

function groupNotifications(list) {
  const groups = [
    { key: 'today',     label: 'Today',     items: [] },
    { key: 'yesterday', label: 'Yesterday', items: [] },
    { key: 'week',      label: 'This week', items: [] },
    { key: 'earlier',   label: 'Earlier',   items: [] },
  ];
  for (const n of list) {
    let d;
    try { d = new Date(n.created_date); } catch { d = new Date(); }
    if (isToday(d)) groups[0].items.push(n);
    else if (isYesterday(d)) groups[1].items.push(n);
    else if (isThisWeek(d)) groups[2].items.push(n);
    else groups[3].items.push(n);
  }
  return groups.filter(g => g.items.length > 0);
}

function GroupSection({ group, collapsed, onToggle, onMarkRead, onDismiss, onClose }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="touch-compact w-full flex items-center gap-1.5 px-5 pt-4 pb-1.5 text-left"
      >
        <span className="text-[13px] font-medium text-muted-foreground">{group.label}</span>
        <span className="text-[13px] text-muted-foreground tabular-nums">{group.items.length}</span>
        <span className="ml-auto text-muted-foreground">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {!collapsed && group.items.map(n => (
        <NotificationItem key={n.id} n={n} onMarkRead={onMarkRead} onDismiss={onDismiss} onClose={onClose} />
      ))}
    </div>
  );
}

export default function NotificationCenter({ notifications, unreadCount, loading, markRead, markAllRead, dismiss, onClose, isMobile }) {
  const [tab, setTab] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (tab === 'all') return true;
      if (tab === 'unread') return !n.is_read;
      return n.category === tab;
    });
  }, [notifications, tab]);

  const groups = useMemo(() => groupNotifications(filtered), [filtered]);

  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // Only show filter tabs that have something in them (plus All / Unread).
  const visibleTabs = TABS.filter(t => t.id === 'all' || t.id === 'unread' || notifications.some(n => n.category === t.id));

  const panelClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col bg-card'
    : 'w-[420px] max-h-[calc(100vh-96px)] bg-card rounded-xl ring-1 ring-border shadow-md flex flex-col overflow-hidden';

  return (
    <motion.div
      initial={isMobile ? { x: '100%' } : { opacity: 0 }}
      animate={isMobile ? { x: 0 } : { opacity: 1 }}
      exit={isMobile ? { x: '100%' } : { opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={panelClass}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-[22px] text-foreground">Notifications</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount > 99 ? '99+' : unreadCount} unread` : 'All read'}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2 px-2 h-8"
            >
              Mark all read
            </button>
          )}
          <Link
            to="/notification-settings"
            onClick={onClose}
            aria-label="Notification settings"
            className="touch-compact w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close"
            className="touch-compact w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs: plain underline row */}
      <div className="flex gap-4 px-5 border-b border-border overflow-x-auto scrollbar-hide flex-shrink-0">
        {visibleTabs.map(t => {
          const isActive = tab === t.id;
          const count = t.id === 'unread' ? unreadCount
            : t.id === 'all' ? notifications.length
            : notifications.filter(n => n.category === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'touch-compact -mb-px flex items-center gap-1 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition-colors',
                isActive ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {count > 0 && <span className="tabular-nums text-muted-foreground">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="px-5 py-10">
            <p className="text-[15px] font-semibold text-foreground">You're caught up.</p>
            <p className="text-sm text-muted-foreground mt-1">{EMPTY_COPY[tab] || EMPTY_COPY.all}</p>
          </div>
        ) : (
          groups.map(group => (
            <GroupSection
              key={group.key}
              group={group}
              collapsed={!!collapsedGroups[group.key]}
              onToggle={() => toggleGroup(group.key)}
              onMarkRead={markRead}
              onDismiss={dismiss}
              onClose={onClose}
            />
          ))
        )}

        {notifications.length > 0 && (
          <div className="px-5 pt-4 pb-3">
            <Link
              to="/notification-settings"
              onClick={onClose}
              className="text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              Choose what you get notified about
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
