import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Calendar, BarChart3, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MoreSheet from './MoreSheet';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';

function useUnreadMessages() {
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => db.entities.Message.list('-created_date', 200),
    staleTime: 30000,
  });
  return messages.filter(m => m.sender === 'client' && !m.is_read).length;
}

// The 5 most used pages as specified
const PRIMARY_NAV = [
  { icon: LayoutDashboard, label: 'Home',      path: '/' },
  { icon: Users,           label: 'Clients',   path: '/clients' },
  { icon: MessageSquare,   label: 'Messages',  path: '/messages' },
  { icon: Calendar,        label: 'Calendar',  path: '/schedule' },
  { icon: BarChart3,       label: 'Business',  path: '/business' },
];

export default function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const unreadMessages = useUnreadMessages();

  const PRIMARY_PATHS = PRIMARY_NAV.map(n => n.path);
  const isMoreActive = !PRIMARY_PATHS.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  return (
    <>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-card border-t border-border"
        style={{ height: '64px', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_NAV.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const badge = item.path === '/messages' ? unreadMessages : 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative min-h-[44px]"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
              )}
              <div className="relative">
                <item.icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 text-white bg-destructive">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[9px] font-medium leading-tight', isActive ? 'text-primary font-bold' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center flex-1 gap-0.5 relative min-h-[44px]"
        >
          {isMoreActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
          )}
          <MoreHorizontal className={cn('w-5 h-5', isMoreActive ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-[9px] font-medium', isMoreActive ? 'text-primary font-bold' : 'text-muted-foreground')}>More</span>
        </button>
      </nav>
    </>
  );
}