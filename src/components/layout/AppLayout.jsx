import React, { useState, createContext, useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '@/lib/AuthContext';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import BillingBanners from '@/components/subscription/BillingBanners';
import PlanBlockDialog from '@/components/subscription/PlanBlockDialog';
import { isClientRole } from '@/lib/useRoleGuard';
import { Menu, X } from 'lucide-react';
import KoachLogo from '@/components/brand/KoachLogo';
import NotificationBell from '@/components/notifications/NotificationBell';
import { ThemeToggleButton } from '@/components/settings/ThemeToggle';
import { useBrandColor } from '@/lib/useBrandColor';
import { darkModeEnabled } from '@/lib/flags';
import { CommandPaletteProvider, useCommandPalette } from '@/components/command/CommandPalette';
import { Search } from 'lucide-react';

function TopbarSearchButton() {
  const { open } = useCommandPalette();
  return (
    <button
      onClick={open}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-[var(--kc-w-10)] transition-colors"
      aria-label="Search (Command K)"
    >
      <Search className="w-5 h-5" />
    </button>
  );
}

export const SubscriptionContext = createContext({
  user: null,
  setUser: () => {},
  openUpgradeModal: () => {},
});

export function useUpgradeModal() {
  return useContext(SubscriptionContext);
}

export default function AppLayout() {
  const { user, setUser } = useAuth();
  const [upgradeFeature, setUpgradeFeature] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Apply the coach's white-label brand color across the app (light + dark).
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

        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-30 flex md:hidden items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-[var(--kc-w-10)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <KoachLogo size={28} rounded="rounded-xl" glow={false} bg={true} />
          <div className="flex items-center gap-1">
            <TopbarSearchButton />
            {darkModeEnabled && <ThemeToggleButton onDark />}
            <NotificationBell />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Sidebar panel */}
            <div className="relative w-72 max-w-[85vw] h-full flex flex-col bg-sidebar">
              <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <KoachLogo size={28} rounded="rounded-xl" glow={true} bg={true} />
                  <div>
                    <span className="block font-bold text-[13px] text-white tracking-tight leading-none">KOACH AI</span>
                    <span className="block text-[9px] tracking-[0.12em] uppercase mt-0.5" style={{ color: 'color-mix(in srgb, white 25%, transparent)' }}>Coaching OS</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-[var(--kc-w-10)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Reuse the Sidebar content by rendering it inside the overlay */}
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
        <main
          className="md:ml-[210px] min-h-screen pb-24 md:pb-0 pt-14 md:pt-0 transition-all duration-200 bg-background overflow-x-hidden"
        >
          <BillingBanners user={user} />
          <Outlet />
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