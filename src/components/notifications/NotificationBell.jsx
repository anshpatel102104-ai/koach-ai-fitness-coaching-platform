import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export default function NotificationBell({ onDark = false }) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const { notifications, unreadCount, loading, markRead, markAllRead, dismiss } = useNotifications();
  const isMobile = useIsMobile();
  const prevCountRef = useRef(unreadCount);
  const wrapperRef = useRef(null);
  const bellRef = useRef(null);

  // Pulse when new notification arrives
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // Keyboard shortcut: N
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Calculate panel position from bell's bounding rect
  const calcPos = useCallback(() => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const panelWidth = 420;
    // Position panel below the bell, ensure it stays within viewport
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    setPanelPos({
      top: rect.bottom + 8,
      left: Math.max(8, left),
    });
  }, []);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    calcPos();
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isMobile, calcPos]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(o => !o)}
        className={onDark
          ? 'touch-compact relative flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors'
          : 'touch-compact relative flex h-11 w-11 items-center justify-center rounded-lg border border-input bg-card text-foreground hover:bg-accent transition-colors'}
        title="Notifications (N)"
        aria-label={displayCount ? `Notifications, ${displayCount} unread` : 'Notifications'}
      >
        <motion.div
          animate={pulse ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </motion.div>

        {displayCount && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-brand-foreground flex items-center justify-center ring-2 ${onDark ? 'ring-sidebar' : 'ring-card'}`}
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Mobile: full page overlay */}
      {isMobile && (
        <AnimatePresence>
          {open && (
            <NotificationCenter
              notifications={notifications}
              unreadCount={unreadCount}
              loading={loading}
              markRead={markRead}
              markAllRead={markAllRead}
              dismiss={dismiss}
              onClose={() => setOpen(false)}
              isMobile={true}
            />
          )}
        </AnimatePresence>
      )}

      {/* Desktop: dropdown panel rendered in a portal so it escapes sidebar overflow/stacking */}
      {!isMobile && createPortal(
        <>
          {open && <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />}
          <AnimatePresence>
            {open && (
              <div
                className="fixed z-[9999]"
                style={{ top: panelPos.top, left: panelPos.left }}
              >
                <NotificationCenter
                  notifications={notifications}
                  unreadCount={unreadCount}
                  loading={loading}
                  markRead={markRead}
                  markAllRead={markAllRead}
                  dismiss={dismiss}
                  onClose={() => setOpen(false)}
                  isMobile={false}
                />
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}