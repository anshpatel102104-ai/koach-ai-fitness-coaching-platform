import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Home, Dumbbell, Apple, TrendingUp, MessageCircle } from 'lucide-react';
import { addDays, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import PortalHome from '@/components/portal/PortalHome';
import PortalProfile from '@/pages/portal/PortalProfile';
import PortalBilling from '@/pages/portal/PortalBilling';
import PortalWorkouts from '@/pages/portal/PortalWorkouts';
import PortalNutritionPage from '@/pages/portal/PortalNutrition';
import PortalCheckIn from '@/pages/portal/PortalCheckIn';
import PortalProgress from '@/pages/portal/PortalProgress';
import PortalMessages from '@/pages/portal/PortalMessages';
import PortalNotifications from '@/pages/portal/PortalNotifications';
import PortalCommunity from '@/pages/portal/PortalCommunity';
import PortalCalendar from '@/pages/portal/PortalCalendar';
import NotificationPrompt from '@/components/pwa/NotificationPrompt';
import AddToHomeScreenPrompt from '@/components/pwa/AddToHomeScreenPrompt';
import { pushNotificationManager } from '@/lib/pushNotificationManager';

/*
 * Client app shell. Five tabs, as in the reference: Today / Train / Food /
 * Progress / Coach. Schedule, community, check-ins, notifications, profile
 * and billing are reached from the Today screen (and the Train header for
 * the schedule), so every route stays one tap from home.
 */
const NAV = [
  { icon: Home,          label: 'Today',    path: '/portal' },
  { icon: Dumbbell,      label: 'Train',    path: '/portal/workouts' },
  { icon: Apple,         label: 'Food',     path: '/portal/nutrition' },
  { icon: TrendingUp,    label: 'Progress', path: '/portal/progress' },
  { icon: MessageCircle, label: 'Coach',    path: '/portal/messages' },
];

function BottomNav({ user, hideForActiveWorkout }) {
  const location = useLocation();

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-nav', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-msgs-nav', myClient?.id],
    queryFn: () => portalDb.entities.Message.filter({ client_id: myClient.id }, '-created_date', 50),
    enabled: !!myClient?.id,
    refetchInterval: 30000,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins-nav', myClient?.id],
    queryFn: () => portalDb.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 5),
    enabled: !!myClient?.id,
  });

  const unreadMsgs = messages.filter(m => m.sender === 'coach' && !m.is_read).length;
  const lastCI = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const nextDue = lastCI ? addDays(parseISO(lastCI.date), 7) : null;
  const checkInDue = !nextDue || differenceInDays(nextDue, new Date()) <= 0;

  // Count = number badge; true = a quiet dot.
  const badges = {
    '/portal/messages': unreadMsgs > 0 ? unreadMsgs : null,
    '/portal/workouts': checkInDue ? true : null,
  };

  const hiddenPaths = ['/portal/profile', '/portal/billing'];
  if (hideForActiveWorkout || hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Client app"
    >
      <div className="mx-auto flex max-w-[480px]">
        {NAV.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/portal' && location.pathname.startsWith(item.path));
          const badge = badges[item.path];
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 pt-2.5 pb-2"
            >
              <span className="relative">
                <item.icon
                  className={cn('h-[22px] w-[22px]', isActive ? 'text-brand' : 'text-muted-foreground')}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                {badge === true && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-card" aria-label="Check-in due" />
                )}
                {typeof badge === 'number' && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold tabular-nums text-brand-foreground ring-2 ring-card">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className={cn('text-[12px]', isActive ? 'font-bold text-foreground' : 'font-medium text-muted-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function ClientPortal() {
  const { me } = useAuth();
  const [user, setUser] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showAddToHomePrompt, setShowAddToHomePrompt] = useState(false);
  const [activeWorkoutMode, setActiveWorkoutMode] = useState(false);

  useEffect(() => {
    me().then(setUser).catch(() => {});
  }, []);

  // Track portal visits and show prompts
  useEffect(() => {
    pushNotificationManager.trackPortalVisit();

    // Show add-to-home prompt after 3 visits
    if (pushNotificationManager.shouldShowAddToHomeScreen()) {
      setShowAddToHomePrompt(true);
      pushNotificationManager.recordAddToHomeScreenShown();
    }

    // Show notification prompt (after onboarding)
    if (pushNotificationManager.shouldAskPermission()) {
      const timer = setTimeout(() => setShowNotifPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const swReg = await navigator.serviceWorker.ready;
      await pushNotificationManager.subscribeToPush(swReg);
      setShowNotifPrompt(false);
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      pushNotificationManager.recordDenial();
      setShowNotifPrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0 overflow-y-auto">
        {/* Mobile-first column; centred on larger screens. */}
        <div className="mx-auto min-h-full w-full max-w-[480px] bg-background">
          <Routes>
            <Route path="/"          element={<PortalHome user={user} />} />
            <Route path="/workouts"  element={<PortalWorkouts user={user} onActiveWorkoutChange={setActiveWorkoutMode} />} />
            <Route path="/nutrition" element={<PortalNutritionPage user={user} />} />
            <Route path="/checkin"   element={<PortalCheckIn user={user} />} />
            <Route path="/progress"  element={<PortalProgress user={user} />} />
            <Route path="/calendar"  element={<PortalCalendar user={user} />} />
            <Route path="/community" element={<PortalCommunity user={user} />} />
            <Route path="/messages"  element={<PortalMessages user={user} />} />
            <Route path="/notifications" element={<PortalNotifications user={user} />} />
            <Route path="/profile"   element={<PortalProfile user={user} />} />
            <Route path="/billing"   element={<PortalBilling user={user} />} />
          </Routes>
        </div>
      </div>
      <BottomNav user={user} hideForActiveWorkout={activeWorkoutMode} />

      {/* Notification permission prompt */}
      <NotificationPrompt
        isOpen={showNotifPrompt}
        onEnable={handleEnableNotifications}
        onDismiss={() => {
          pushNotificationManager.recordDenial();
          setShowNotifPrompt(false);
        }}
      />

      {/* iOS add-to-home screen prompt */}
      <AddToHomeScreenPrompt
        isOpen={showAddToHomePrompt}
        onDismiss={() => setShowAddToHomePrompt(false)}
        isIOS={pushNotificationManager.isIOS()}
      />
    </div>
  );
}
