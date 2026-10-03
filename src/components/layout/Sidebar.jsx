import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import KoachLogo from '@/components/brand/KoachLogo.jsx';
import NotificationBell from '@/components/notifications/NotificationBell';
import { ThemeToggleButton } from '@/components/settings/ThemeToggle';

import {
  LayoutDashboard, Users, MessageSquare, Calendar,
  Dumbbell, Salad, ClipboardList,
  Sparkles, Bot, BarChart3,
  CreditCard, Settings, LogOut, ChevronLeft, ChevronRight,
  Lock, UserPlus, Trophy, ShoppingBag, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/subscription';
import { useTeamRole } from '@/lib/useTeamRole';
import { useCommandPalette } from '@/components/command/CommandPalette';
import { track } from '@/lib/telemetry';
import { darkModeEnabled } from '@/lib/flags';

function SidebarSearchButton({ collapsed }) {
  const { open } = useCommandPalette();
  return (
    <button
      onClick={open}
      title="Search (⌘K)"
      className={cn(
        'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors w-full min-h-[40px]',
        collapsed ? 'justify-center px-0' : 'px-3'
      )}
      style={{ color: 'color-mix(in srgb, white 50%, transparent)', background: 'color-mix(in srgb, white 4%, transparent)' }}
    >
      <Search className="w-[16px] h-[16px] flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Search</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, white 8%, transparent)' }}>⌘K</kbd>
        </>
      )}
    </button>
  );
}

// Consolidated to 13 visible items across 4 groups. Everything else lives in the
// ⌘K command palette + Settings (routes are preserved — nothing is deleted).
// At-Risk is folded into Adherence (surfaced there as a filter/tab).
const NAV_GROUPS = [
  {
    label: 'MAIN',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Clients', path: '/clients' },
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      { icon: Calendar, label: 'Calendar', path: '/schedule' },
    ],
  },
  {
    label: 'COACHING',
    items: [
      { icon: Dumbbell, label: 'Programs', path: '/programs' },
      { icon: Salad, label: 'Nutrition', path: '/nutrition' },
      { icon: ClipboardList, label: 'Check-ins', path: '/checkin-review', feature: 'checkin_review' },
      { icon: Trophy, label: 'Adherence', path: '/adherence', feature: 'adherence' },
    ],
  },
  {
    label: 'GROW',
    items: [
      { icon: BarChart3, label: 'Business', path: '/business' },
      { icon: UserPlus, label: 'Leads', path: '/sales', feature: 'sales' },
      { icon: ShoppingBag, label: 'Store', path: '/store', feature: 'store' },
    ],
  },
  {
    label: 'AI',
    items: [
      { icon: Sparkles, label: 'Assistant', path: '/assistant', feature: 'assistant' },
      { icon: Bot, label: 'Automations', path: '/automations' },
    ],
  },
];

const ALL_BOTTOM_ITEMS = [
  { icon: CreditCard, label: 'Subscription', path: '/subscription', ownerOnly: true },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

function useUnreadCount() {
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => db.entities.Message.list('-created_date', 200),
    staleTime: 30000,
  });
  return messages.filter(m => m.sender === 'client' && !m.is_read).length;
}

function NavItem({ item, collapsed, onUpgrade, user }) {
  const location = useLocation();
  const isActive = location.pathname === item.path ||
    (item.path !== '/' && location.pathname.startsWith(item.path));
  const isLocked = item.feature && !hasFeature(user, item.feature);
  const unreadCount = useUnreadCount();
  const showUnread = item.path === '/messages' && unreadCount > 0;

  if (isLocked) {
    return (
      <button
        onClick={() => onUpgrade?.(item.feature)}
        className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors min-h-[40px]"
        style={{ color: 'color-mix(in srgb, white 20%, transparent)' }}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="w-[16px] h-[16px] flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-[13px]">{item.label}</span>
            <Lock className="w-3 h-3 opacity-30" />
          </>
        )}
      </button>
    );
  }

  return (
    <Link
      to={item.path}
      onClick={() => track('nav.click', { path: item.path, label: item.label })}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 min-h-[40px]',
        isActive
          ? 'text-white'
          : 'hover:text-white'
      )}
      style={{
        color: isActive ? 'var(--tc-sidebar-accent-foreground)' : 'color-mix(in srgb, white 38%, transparent)',
        background: isActive ? 'color-mix(in srgb, var(--tc-sidebar-primary) 14%, transparent)' : 'transparent',
      }}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full" style={{ background: 'var(--tc-sidebar-primary)' }} />
      )}
      <item.icon className={cn('w-[16px] h-[16px] flex-shrink-0 transition-colors')} />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && showUnread && (
        <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {collapsed && showUnread && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive" />
      )}
    </Link>
  );
}

export default function Sidebar({ user, onUpgrade, mobileMode = false, onNavClick }) {
  const [collapsed, setCollapsed] = useState(false);
  const { isOwner } = useTeamRole();
  const { logout } = useAuth();

  // Mobile mode: render just the nav content (no fixed positioning, shown inside overlay)
  if (mobileMode) {
    return (
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4 h-full">
        <div onClick={onNavClick}><SidebarSearchButton collapsed={false} /></div>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-1.5" style={{ color: 'color-mix(in srgb, white 20%, transparent)' }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <div key={item.path} onClick={onNavClick}>
                  <NavItem item={item} collapsed={false} onUpgrade={onUpgrade} user={user} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-white/5 space-y-0.5">
          {ALL_BOTTOM_ITEMS.filter(item => !item.ownerOnly || isOwner).map(item => (
            <div key={item.path} onClick={onNavClick}>
              <Link
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all min-h-[44px]"
                style={{ color: 'color-mix(in srgb, white 35%, transparent)' }}
              >
                <item.icon className="w-[16px] h-[16px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </div>
          ))}
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all w-full min-h-[44px]"
            style={{ color: 'color-mix(in srgb, white 25%, transparent)' }}
          >
            <LogOut className="w-[16px] h-[16px] flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-50 flex-col transition-all duration-200 hidden md:flex',
        collapsed ? 'w-[56px]' : 'w-[210px]'
      )}
      style={{ background: 'var(--tc-sidebar-background)', borderRight: '1px solid var(--tc-sidebar-border)' }}
    >
      {/* Logo */}
      <div className={cn(
        'h-[56px] flex items-center flex-shrink-0',
        collapsed ? 'px-3 justify-center' : 'px-4 gap-3'
      )} style={{ borderBottom: '1px solid var(--tc-sidebar-border)' }}>
        <KoachLogo size={32} rounded="rounded-xl" glow={true} bg={true} />
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <span className="block font-bold text-[13px] text-white tracking-tight leading-none">KOACH AI</span>
            </div>
            <div className="flex items-center gap-1">
              {darkModeEnabled && <ThemeToggleButton onDark />}
              <NotificationBell />
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        <SidebarSearchButton collapsed={collapsed} />
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-1.5" style={{ color: 'color-mix(in srgb, white 20%, transparent)' }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.path} item={item} collapsed={collapsed} onUpgrade={onUpgrade} user={user} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-0.5" style={{ borderTop: '1px solid color-mix(in srgb, white 5%, transparent)' }}>
        {ALL_BOTTOM_ITEMS.filter(item => !item.ownerOnly || isOwner).map(item => {
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{ color: 'color-mix(in srgb, white 35%, transparent)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--tc-sidebar-accent-foreground)'}
              onMouseLeave={e => e.currentTarget.style.color = 'color-mix(in srgb, white 35%, transparent)'}
            >
              <item.icon className="w-[16px] h-[16px] flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <button
          onClick={() => logout()}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all w-full"
          style={{ color: 'color-mix(in srgb, white 25%, transparent)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--tc-destructive)'}
          onMouseLeave={e => e.currentTarget.style.color = 'color-mix(in srgb, white 25%, transparent)'}
        >
          <LogOut className="w-[16px] h-[16px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center w-full py-2 rounded-lg transition-all mt-1"
          style={{ color: 'color-mix(in srgb, white 20%, transparent)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'color-mix(in srgb, white 60%, transparent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'color-mix(in srgb, white 20%, transparent)'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}