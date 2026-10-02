import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Home, Dumbbell, BarChart2, MessageSquare, Users, CalendarDays } from 'lucide-react';
import { addDays, parseISO, differenceInDays } from 'date-fns';
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

const NAV = [
  { icon: Home,          label: 'Home',      path: '/portal' },
  { icon: Dumbbell,      label: 'Train',     path: '/portal/workouts' },
  { icon: CalendarDays,  label: 'Schedule',  path: '/portal/calendar' },
  { icon: BarChart2,     label: 'Progress',  path: '/portal/progress' },
  { icon: Users,         label: 'Community', path: '/portal/community' },
  { icon: MessageSquare, label: 'Coach',     path: '/portal/messages' },
];

function BottomNav({ user, hideForActiveWorkout }) {
  const location = useLocation();

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-nav', user?.email],
    queryFn: () => base44.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-msgs-nav', myClient?.id],
    queryFn: () => base44.entities.Message.filter({ client_id: myClient.id }, '-created_date', 50),
    enabled: !!myClient?.id,
    refetchInterval: 30000,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins-nav', myClient?.id],
    queryFn: () => base44.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 5),
    enabled: !!myClient?.id,
  });

  const { data: communityPosts = [] } = useQuery({
    queryKey: ['portal-community-nav'],
    queryFn: () => base44.entities.CommunityPost.filter({ is_announcement: true, is_hidden: false }, '-created_date', 5),
    refetchInterval: 60000,
  });

  const unreadMsgs = messages.filter(m => m.sender === 'coach' && !m.is_read).length;
  const lastCI = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const nextDue = lastCI ? addDays(parseISO(lastCI.date), 7) : null;
  const checkInDue = !nextDue || differenceInDays(nextDue, new Date()) <= 0;
  const newCommunityPosts = communityPosts.filter(p => {
    if (!p.created_date) return false;
    return differenceInDays(new Date(), new Date(p.created_date)) < 1;
  }).length;

  const badges = {
    '/portal/messages': unreadMsgs > 0 ? unreadMsgs : null,
    '/portal/workouts': checkInDue ? '!' : null,
    '/portal/community': newCommunityPosts > 0 ? newCommunityPosts : null,
  };

  const hiddenPaths = ['/portal/profile', '/portal/billing'];
  if (hideForActiveWorkout || hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card"
      style={{
        borderTop: '1px solid var(--tc-muted)',
        boxShadow: '0 -4px 24px color-mix(in srgb, black 7%, transparent)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      <div className="flex">
        {NAV.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/portal' && location.pathname.startsWith(item.path));
          const badge = badges[item.path];
          return (
            <Link key={item.path} to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-3 gap-1 transition-all relative">
              {isActive && (
                <motion.div layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-ai))' }} />
              )}
              <div className="relative">
                <item.icon
                  className="w-5 h-5 transition-all"
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}
                />
                {badge && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
                    style={{ background: badge === '!' ? 'var(--tc-destructive)' : 'var(--tc-primary)' }}>
                    {badge}
                  </motion.div>
                )}
              </div>
              <span className="text-[10px] font-semibold transition-all"
                style={{ color: isActive ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>
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

  // Register service worker
  useEffect(() => {
    pushNotificationManager.registerServiceWorker();
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
    <div className="fixed inset-0" style={{ background: 'var(--tc-muted)' }}>
      <div className="absolute inset-0 overflow-y-auto">
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