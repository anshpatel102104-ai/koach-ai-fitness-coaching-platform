import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export function useNotifications() {
  const { me } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [badges, setBadges] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 50;

  const fetchNotifications = useCallback(async (currentUser, reset = false) => {
    if (!currentUser) return;
    const data = await base44.entities.Notification.filter(
      { recipient_id: currentUser.id, is_dismissed: false }, // recipient_id is uuid (auth user id)
      '-created_date',
      PAGE_SIZE
    );
    setNotifications(reset ? data : prev => {
      const ids = new Set(prev.map(n => n.id));
      return [...prev, ...data.filter(n => !ids.has(n.id))];
    });
  }, []);

  const fetchBadges = useCallback(async () => {
    const all = await base44.entities.ClientBadge.list('-created_date', 20);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    setBadges(all.filter(b => {
      const d = new Date(b.earned_date || b.created_date).getTime();
      return d > cutoff;
    }));
  }, []);

  useEffect(() => {
    me().then(u => {
      setUser(u);
      Promise.all([fetchNotifications(u, true), fetchBadges()]).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, [fetchNotifications, fetchBadges]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_id !== user.id) return;
      if (event.type === 'create') {
        setNotifications(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return unsub;
  }, [user]);

  // Combine notifications + recent badges into one feed
  const combined = useMemo(() => {
    const badgeNotifs = badges.map(b => ({
      id: `badge_${b.id}`,
      category: 'achievement',
      is_read: true,
      is_dismissed: false,
      title: `${b.client_name || 'Client'} earned a badge!`,
      body: (b.badge_key || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      created_date: b.earned_date || b.created_date,
      link: '/adherence',
      client_name: b.client_name,
    }));
    return [...notifications, ...badgeNotifs].sort((a, b) =>
      new Date(b.created_date) - new Date(a.created_date)
    );
  }, [notifications, badges]);

  const markRead = useCallback(async (id) => {
    if (String(id).startsWith('badge_')) return;
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [notifications]);

  const dismiss = useCallback(async (id) => {
    if (String(id).startsWith('badge_')) {
      setBadges(prev => prev.filter(b => `badge_${b.id}` !== id));
      return;
    }
    await base44.entities.Notification.update(id, { is_dismissed: true, is_read: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(async () => {
    await Promise.all(notifications.map(n => base44.entities.Notification.update(n.id, { is_dismissed: true, is_read: true })));
    setNotifications([]);
    setBadges([]);
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications: combined, unreadCount, loading, markRead, markAllRead, dismiss, dismissAll };
}