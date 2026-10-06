import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { SubscriptionContext } from './AppLayout';

export default function FocusLayout() {
  const { user, setUser } = useAuth();
  const [upgradeFeature, setUpgradeFeature] = useState(null);

  return (
    <SubscriptionContext.Provider value={{ user, setUser, openUpgradeModal: setUpgradeFeature }}>
      <div className="min-h-screen bg-background">
        {/* Minimal top bar */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 bg-sidebar">
          <div className="flex items-center gap-4">
            <img src="/koach-logo-white.png" alt="KOACH AI" className="h-6 w-auto" />
            <span className="hidden sm:block h-5 w-px bg-white/15" />
            <span className="hidden sm:block text-[15px] font-semibold text-white">Run my day</span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors px-3 h-9 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" /> Exit
          </Link>
        </header>

        {/* Page content pushed below header */}
        <main className="pt-14 min-h-screen">
          <ErrorBoundary scope="page"><Outlet /></ErrorBoundary>
        </main>
      </div>
      <UpgradeModal
        open={!!upgradeFeature}
        onClose={() => setUpgradeFeature(null)}
        featureKey={upgradeFeature}
        user={user}
        onUserUpdate={setUser}
      />
    </SubscriptionContext.Provider>
  );
}