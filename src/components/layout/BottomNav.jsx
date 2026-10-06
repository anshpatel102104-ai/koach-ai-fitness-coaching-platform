import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Users, SquareCheckBig, MessageCircle, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import MoreSheet from './MoreSheet';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';

function useWaitingCounts() {
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => db.entities.Message.list('-created_date', 200),
    staleTime: 30000,
  });
  const { data: checkins = [] } = useQuery({
    queryKey: ['checkins-review'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
    staleTime: 60000,
  });
  return {
    messages: messages.filter(m => m.sender === 'client' && !m.is_read).length,
    checkins: checkins.filter(ci => !ci.coach_responded && ci.review_status !== 'reviewed').length,
  };
}

// The four things a coach opens from their phone, plus everything else.
const PRIMARY_NAV = [
  { icon: BarChart3,      label: 'Today',     path: '/' },
  { icon: Users,          label: 'Clients',   path: '/clients' },
  { icon: SquareCheckBig, label: 'Check-ins', path: '/checkin-review', badge: 'checkins' },
  { icon: MessageCircle,  label: 'Messages',  path: '/messages', badge: 'messages' },
];

function Tab({ icon: Icon, label, active, badge, ...rest }) {
  return (
    <>
      <span className="relative">
        <Icon className={cn('h-[22px] w-[22px]', active ? 'text-brand' : 'text-muted-foreground')} strokeWidth={active ? 2 : 1.75} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-brand px-1 text-[11px] font-bold text-brand-foreground flex items-center justify-center ring-2 ring-card">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={cn('text-[12px] leading-none', active ? 'font-semibold text-foreground' : 'text-muted-foreground')} {...rest}>
        {label}
      </span>
    </>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const counts = useWaitingCounts();

  const isActive = (p) => (p === '/' ? location.pathname === '/' : location.pathname.startsWith(p));
  const isMoreActive = !PRIMARY_NAV.some(n => isActive(n.path));

  return (
    <>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden bg-card border-t border-border"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        {PRIMARY_NAV.map(item => (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive(item.path) ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Tab icon={item.icon} label={item.label} active={isActive(item.path)} badge={item.badge ? counts[item.badge] : 0} />
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1.5 min-h-[44px]"
        >
          <Tab icon={Menu} label="More" active={isMoreActive} />
        </button>
      </nav>
    </>
  );
}
