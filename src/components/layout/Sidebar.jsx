import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Users, SquareCheckBig, MessageCircle, Activity,
  Dumbbell, Apple, NotebookText, Workflow, Sparkles,
  CalendarDays, CreditCard, LineChart, UserPlus, ShoppingBag,
  Settings, LogOut, Lock, Sun, Moon, Palette, UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature, getUserTier, getLimit } from '@/lib/subscription';
import { useTeamRole } from '@/lib/useTeamRole';
import { track } from '@/lib/telemetry';
import { darkModeEnabled } from '@/lib/flags';
import { useTheme } from '@/lib/theme';
import { Initials } from '@/components/kit';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Three groups mirror how a coach's week actually runs: coach people, build
// what they follow, run the business. Everything else lives in ⌘K + Settings
// (routes are preserved — nothing is deleted).
const NAV_GROUPS = [
  {
    label: 'Coaching',
    items: [
      { icon: BarChart3, label: 'Today', path: '/' },
      { icon: Users, label: 'Clients', path: '/clients', count: 'clients' },
      { icon: SquareCheckBig, label: 'Check-ins', path: '/checkin-review', feature: 'checkin_review', badge: 'checkins' },
      { icon: MessageCircle, label: 'Messages', path: '/messages', badge: 'messages' },
      { icon: Activity, label: 'Adherence', path: '/adherence', feature: 'adherence' },
    ],
  },
  {
    label: 'Build',
    items: [
      { icon: Dumbbell, label: 'Programs', path: '/programs', also: ['/program-builder'] },
      { icon: Apple, label: 'Nutrition', path: '/nutrition', also: ['/food-library'] },
      { icon: NotebookText, label: 'Exercise library', path: '/exercises' },
      { icon: Workflow, label: 'Automations', path: '/automations' },
      { icon: Sparkles, label: 'Assistant', path: '/assistant', feature: 'assistant' },
    ],
  },
  {
    label: 'Business',
    items: [
      { icon: CalendarDays, label: 'Schedule', path: '/schedule', count: 'sessions' },
      { icon: CreditCard, label: 'Billing', path: '/invoicing', also: ['/packages'] },
      { icon: LineChart, label: 'Insights', path: '/business', also: ['/analytics', '/revenue'] },
      { icon: UserPlus, label: 'Leads', path: '/sales', feature: 'sales' },
      { icon: ShoppingBag, label: 'Store', path: '/store', feature: 'store' },
    ],
  },
];

/** Live numbers for the nav: roster size, check-ins waiting, unread, sessions today. */
function useNavCounts() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('-created_date'),
    staleTime: 60000,
  });
  const { data: checkins = [] } = useQuery({
    queryKey: ['checkins-review'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
    staleTime: 60000,
  });
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => db.entities.Message.list('-created_date', 200),
    staleTime: 30000,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => db.entities.Session.list('-date', 200),
    staleTime: 60000,
  });
  const today = new Date().toISOString().slice(0, 10);
  const active = clients.filter(c => !c.status || c.status === 'active');
  return {
    clients: active.length,
    checkins: checkins.filter(ci => !ci.coach_responded && ci.review_status !== 'reviewed').length,
    messages: messages.filter(m => m.sender === 'client' && !m.is_read).length,
    sessions: sessions.filter(s => (s.date || '').slice(0, 10) === today && s.status !== 'cancelled').length,
    totalClients: active.length,
  };
}

function isPathActive(pathname, item) {
  const paths = [item.path, ...(item.also || [])];
  return paths.some(p => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')));
}

function NavItem({ item, counts, onUpgrade, user, onNavigate }) {
  const { pathname } = useLocation();
  const active = isPathActive(pathname, item);
  const locked = item.feature && !hasFeature(user, item.feature);
  const Icon = item.icon;
  const badge = item.badge ? counts[item.badge] : 0;
  const count = item.count ? counts[item.count] : 0;

  const base = 'group relative flex items-center gap-3 rounded-lg px-3 h-11 text-[15px] font-medium transition-colors';

  if (locked) {
    return (
      <button
        onClick={() => onUpgrade?.(item.feature)}
        className={cn(base, 'w-full text-left text-sidebar-muted/70 hover:text-sidebar-foreground')}
      >
        <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} />
        <span className="flex-1">{item.label}</span>
        <Lock className="h-3.5 w-3.5 opacity-60" />
      </button>
    );
  }

  return (
    <Link
      to={item.path}
      onClick={() => { track('nav.click', { path: item.path, label: item.label }); onNavigate?.(); }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        base,
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'text-sidebar-primary')} strokeWidth={1.75} />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 && (
        <span className="min-w-[22px] h-[22px] rounded-full bg-sidebar-primary px-1.5 text-[12px] font-bold text-sidebar-primary-foreground flex items-center justify-center tabular-nums">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {!badge && count > 0 && (
        <span className={cn('text-[13px] tabular-nums', active ? 'rounded-md bg-white/10 px-1.5 py-0.5 font-semibold text-white' : 'text-sidebar-muted')}>{count}</span>
      )}
    </Link>
  );
}

/** Coach card pinned to the bottom: plan + client-spot meter + account menu. */
function AccountCard({ user, totalClients }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isOwner } = useTeamRole();
  const { resolved, toggle } = useTheme();
  const tier = getUserTier(user);
  const limit = getLimit(user, 'max_clients');
  const pct = limit > 0 ? Math.min(100, Math.round((totalClients / limit) * 100)) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full rounded-xl bg-sidebar-accent/70 hover:bg-sidebar-accent p-3.5 text-left transition-colors">
          <div className="flex items-center gap-3">
            <Initials name={user?.full_name || user?.email || 'Coach'} size={34} className="bg-white/10 text-white" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white truncate">{user?.full_name || 'Your account'}</p>
              <p className="text-[13px] text-sidebar-muted">{tier?.name || 'Starter'} plan</p>
            </div>
          </div>
          {pct !== null ? (
            <>
              <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-white/80" style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-sidebar-muted">{totalClients} of {limit} client spots used</p>
            </>
          ) : (
            <p className="mt-2 text-[12px] text-sidebar-muted">{totalClients} active clients</p>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[216px]">
        <DropdownMenuItem onClick={() => navigate('/settings')}><Settings className="h-4 w-4" />Settings</DropdownMenuItem>
        {isOwner && <DropdownMenuItem onClick={() => navigate('/subscription')}><CreditCard className="h-4 w-4" />Plan and billing</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => navigate('/white-label')}><Palette className="h-4 w-4" />Branding</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/team')}><UsersRound className="h-4 w-4" />Team</DropdownMenuItem>
        {darkModeEnabled && (
          <DropdownMenuItem onClick={toggle}>
            {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive"><LogOut className="h-4 w-4" />Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarBody({ user, onUpgrade, onNavigate }) {
  const counts = useNavCounts();
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide" aria-label="Main">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[13px] font-medium text-sidebar-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.path} item={item} counts={counts} onUpgrade={onUpgrade} user={user} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 pt-0">
        <AccountCard user={user} totalClients={counts.totalClients} />
      </div>
    </>
  );
}

export default function Sidebar({ user, onUpgrade, mobileMode = false, onNavClick }) {
  // Mobile mode: nav content only, rendered inside the overlay panel.
  if (mobileMode) {
    return (
      <div className="flex h-full flex-col pt-3">
        <SidebarBody user={user} onUpgrade={onUpgrade} onNavigate={onNavClick} />
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[248px] flex-col bg-sidebar lg:flex">
      <Link to="/" className="flex h-[92px] flex-shrink-0 items-center px-6" aria-label="KOACH AI home">
        <img src="/koach-logo-white.png" alt="KOACH AI" className="h-8 w-auto" />
      </Link>
      <SidebarBody user={user} onUpgrade={onUpgrade} />
    </aside>
  );
}
