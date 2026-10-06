import React, { useState, createContext, useContext } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '@/lib/AuthContext';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import BillingBanners from '@/components/subscription/BillingBanners';
import PlanBlockDialog from '@/components/subscription/PlanBlockDialog';
import { isClientRole } from '@/lib/useRoleGuard';
import { Menu, X, Search, Plus, UserPlus, Dumbbell, Apple, CalendarPlus, Megaphone } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useBrandColor } from '@/lib/useBrandColor';
import { CommandPaletteProvider, useCommandPalette } from '@/components/command/CommandPalette';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const SubscriptionContext = createContext({
  user: null,
  setUser: () => {},
  openUpgradeModal: () => {},
});

export function useUpgradeModal() {
  return useContext(SubscriptionContext);
}

const CREATE_ACTIONS = [
  { icon: UserPlus, label: 'Invite a client', path: '/clients?new=1' },
  { icon: Dumbbell, label: 'New program', path: '/program-builder' },
  { icon: Apple, label: 'New meal plan', path: '/nutrition?new=1' },
  { icon: CalendarPlus, label: 'Book a session', path: '/schedule?new=1' },
  { icon: Megaphone, label: 'Message everyone', path: '/messages?broadcast=1' },
];

function CreateMenu({ compact = false }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button className="touch-compact flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[rgb(17,19,24)]" aria-label="Create">
            <Plus className="h-5 w-5" />
          </button>
        ) : (
          <Button className="h-11 px-5 text-[15px]">Create</Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {CREATE_ACTIONS.map(a => (
          <DropdownMenuItem key={a.path} onClick={() => navigate(a.path)} className="h-10">
            <a.icon className="h-4 w-4 text-muted-foreground" />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Desktop topbar: search on the left, notifications + Create on the right. */
function Topbar() {
  const { open } = useCommandPalette();
  return (
    <div className="sticky top-0 z-30 hidden lg:flex h-[76px] items-center justify-between gap-6 border-b border-border bg-card px-8">
      <button
        onClick={open}
        className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-lg bg-secondary px-4 text-left text-[15px] text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        <span className="flex-1">Search clients, programs or foods</span>
        <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground">⌘K</kbd>
      </button>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <CreateMenu />
      </div>
    </div>
  );
}

function MobileSearchButton() {
  const { open } = useCommandPalette();
  return (
    <button
      onClick={open}
      className="touch-compact flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      aria-label="Search"
    >
      <Search className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}

export default function AppLayout() {
  const { user, setUser } = useAuth();
  const [upgradeFeature, setUpgradeFeature] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Apply the coach's white-label accent across the app (light + dark).
  useBrandColor();

  // Clients must use the portal, never the coach app
  if (user && isClientRole(user)) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <SubscriptionContext.Provider value={{ user, setUser, openUpgradeModal: setUpgradeFeature }}>
      <CommandPaletteProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        <Sidebar user={user} onUpgrade={setUpgradeFeature} />

        {/* Mobile / tablet top bar */}
        <div className="fixed top-0 left-0 right-0 z-30 flex lg:hidden items-center justify-between gap-2 px-3 h-14 bg-sidebar">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="touch-compact flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <img src="/koach-logo-white.png" alt="KOACH AI" className="h-6 w-auto" />
          <div className="flex items-center gap-1">
            <MobileSearchButton />
            <NotificationBell onDark />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-[rgb(17_19_24/0.6)]"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative flex h-full w-[288px] max-w-[85vw] flex-col bg-sidebar">
              <div className="flex h-16 flex-shrink-0 items-center justify-between pl-6 pr-3">
                <img src="/koach-logo-white.png" alt="KOACH AI" className="h-7 w-auto" />
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="touch-compact flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar
                  user={user}
                  onUpgrade={setUpgradeFeature}
                  mobileMode={true}
                  onNavClick={() => setMobileSidebarOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="lg:ml-[248px] min-h-screen pb-24 lg:pb-0 pt-14 lg:pt-0 bg-background overflow-x-hidden">
          <Topbar />
          <BillingBanners user={user} />
          <PageBoundary><Outlet /></PageBoundary>
        </main>

        <BottomNav />
      </div>
      <PlanBlockDialog />
      <UpgradeModal
        open={!!upgradeFeature}
        onClose={() => setUpgradeFeature(null)}
        featureKey={upgradeFeature}
        user={user}
        onUserUpdate={setUser}
      />
      </CommandPaletteProvider>
    </SubscriptionContext.Provider>
  );
}

/** A crashing page keeps the shell (sidebar, nav) usable; resets on navigation. */
function PageBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary scope="page" resetKey={pathname}>{children}</ErrorBoundary>;
}
