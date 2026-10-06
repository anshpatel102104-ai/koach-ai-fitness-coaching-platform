import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CountBadge } from '@/components/kit';

function getGreeting(firstName) {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Good morning, ${firstName}`;
  if (h >= 12 && h < 17) return `Good afternoon, ${firstName}`;
  if (h >= 17 && h < 21) return `Good evening, ${firstName}`;
  return `Still up, ${firstName}?`;
}

/** Greeting header for client screens: name, date, messages bell, profile. */
export default function PortalHeader({ user, unreadCount, onMessagesTap }) {
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const navigate = useNavigate();

  return (
    <header className="flex items-start justify-between gap-3 px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-[32px] text-foreground">{getGreeting(firstName)}</h1>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={onMessagesTap} aria-label="Messages"
          className="touch-compact relative flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))]">
          <Bell className="h-4 w-4" />
          <CountBadge count={unreadCount} className="absolute -right-1.5 -top-1.5" />
        </button>
        <button type="button" onClick={() => navigate('/portal/profile')} aria-label="Profile"
          className="touch-compact flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {firstName[0]?.toUpperCase()}
        </button>
      </div>
    </header>
  );
}
