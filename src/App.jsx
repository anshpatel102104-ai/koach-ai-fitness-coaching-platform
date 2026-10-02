import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Programs from './pages/Programs';
import Nutrition from './pages/Nutrition';
import Schedule from './pages/Schedule.jsx';
import Messages from './pages/Messages.jsx';

import Progress from './pages/Progress';
import Store from './pages/Store';
import Settings from './pages/Settings';
import Assistant from './pages/Assistant';
import Adherence from './pages/Adherence.jsx';
import CheckInReview from './pages/CheckInReview';
import Sales from './pages/Sales';

import Community from './pages/Community.jsx';
import Subscription from './pages/Subscription';
import ExerciseLibrary from './pages/ExerciseLibrary';
import Automations from './pages/Automations';
import Analytics from './pages/Analytics';
import RevenueDashboard from './pages/RevenueDashboard';
import Business from './pages/Business';
import ProgramBuilder from './pages/ProgramBuilder';
import WhiteLabel from './pages/WhiteLabel';
import PageGuard from './components/subscription/PageGuard';
import SubmitCheckIn from './pages/SubmitCheckIn';
import CheckInDetail from './pages/CheckInDetail';
import AtRiskClients from './pages/AtRiskClients.jsx';
import FastReview from './pages/FastReview';
import ClientProfile from './pages/ClientProfile';
import FocusLayout from './components/layout/FocusLayout';
import CoachingTemplates from './pages/CoachingTemplates';
import ClientOnboarding from './pages/ClientOnboarding';
import OnboardingManager from './pages/OnboardingManager';
import Migration from './pages/Migration';
import FoodLibrary from './pages/FoodLibrary';
import FoodLogPage from './pages/FoodLogPage';
import PremiumOnboarding from './pages/PremiumOnboarding';
import ClientPortal from './pages/ClientPortal';
import ClientWorkoutView from './pages/ClientWorkoutView';
import ClientInviteJoin from './pages/ClientInviteJoin';
import ClientSetup from './pages/ClientSetup';
import Unsubscribe from './pages/Unsubscribe';
import EmailCenter from './pages/EmailCenter';
import AIInsightsPage from './pages/AIInsightsPage';
import Invoicing from './pages/Invoicing';
import Packages from './pages/Packages';
import PackageLanding from './pages/PackageLanding';
import CoachProfile from './pages/CoachProfile';
import BusinessSettings from './pages/BusinessSettings';
import AccountSettings from './pages/AccountSettings';
import NotificationSettings from './pages/NotificationSettings';
import ReferralProgram from './pages/ReferralProgram';
import AffiliateApplication from './pages/AffiliateApplication';
import AffiliateDashboard from './pages/AffiliateDashboard';
import MarketingTools from './pages/MarketingTools';
import WeeklySummary from './pages/WeeklySummary';
import Challenges from './pages/Challenges';
import Team from './pages/Team';
import InstallPrompt from './components/pwa/InstallPrompt';
import { Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Gates the dashboard: unauthenticated → /start, authenticated without subscription → /start?resume=checkout
const AuthGuardedDashboard = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, user, checkUserAuth } = useAuth();
  const [checkoutPolling, setCheckoutPolling] = React.useState(false);

  // When returning from Stripe checkout, the webhook may not have fired yet.
  // Poll auth up to 8 times (8s) until billing_status is set.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('checkout')) return;
    if (!isAuthenticated) return;
    const hasSubscription = user?.stripe_subscription_id || ['active', 'trialing'].includes(user?.billing_status);
    if (hasSubscription) return;

    setCheckoutPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await checkUserAuth();
      if (attempts >= 8) {
        clearInterval(interval);
        setCheckoutPolling(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.stripe_subscription_id]);

  if (isLoadingAuth || isLoadingPublicSettings || checkoutPolling) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          {checkoutPolling && <p className="text-sm text-muted-foreground">Activating your account…</p>}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/start" replace />;

  // Determine subscription state from multiple possible fields
  const hasActiveSubscription =
    ['active', 'trialing', 'past_due'].includes(user?.billing_status) ||
    (user?.stripe_subscription_id && user?.billing_status !== 'canceled');

  // Authenticated with subscription → dashboard
  if (hasActiveSubscription) return <Dashboard />;

  // Authenticated, account exists but no subscription yet →
  // Only send to checkout resume if this looks like an incomplete new signup
  // (i.e. they went through onboarding but never finished Stripe checkout).
  // Returning coaches who somehow lost billing data are sent to subscription page, not onboarding.
  const isNewSignupIncomplete = localStorage.getItem('koach_resume_pricing') === '1' ||
    new URLSearchParams(window.location.search).get('resume') === 'checkout';

  if (isNewSignupIncomplete) {
    return <Navigate to="/start?resume=checkout" replace />;
  }

  // Returning user with no subscription data — send to subscription management, not onboarding
  return <Navigate to="/subscription" replace />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground font-body">Loading KOACH AI...</p>
        </div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Route-level auth guard. In Supabase mode `authError` is never set, so the
  // old authError-based redirect was dead and unauthenticated users could reach
  // the entire coach shell (/clients, /revenue, …). Confidentiality was held
  // only by RLS with no redirect. Now: anyone without a session on a non-public
  // path is sent to login. Public/onboarding/portal/auth paths stay open.
  const publicPaths = ['/start', '/join', '/client-onboarding', '/packages', '/portal', '/login', '/signup', '/forgot-password', '/reset-password', '/client-setup', '/unsubscribe'];
  const isPublicPath = publicPaths.some(p => window.location.pathname.startsWith(p));
  if (!isAuthenticated && !isPublicPath) {
    navigateToLogin();
    return null;
  }

  return (
    <Routes>
      {/* ── CLIENT PORTAL (role=client) ── */}
      <Route path="/portal/*" element={<><ClientPortal /><InstallPrompt /></>} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<AuthGuardedDashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/progress" element={<PageGuard feature="progress"><Progress /></PageGuard>} />
        <Route path="/store" element={<PageGuard feature="store"><Store /></PageGuard>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/assistant" element={<PageGuard feature="assistant"><Assistant /></PageGuard>} />
        <Route path="/adherence" element={<PageGuard feature="adherence"><Adherence /></PageGuard>} />
        <Route path="/checkin-review" element={<PageGuard feature="checkin_review"><CheckInReview /></PageGuard>} />
        <Route path="/sales" element={<PageGuard feature="sales"><Sales /></PageGuard>} />

        <Route path="/community" element={<PageGuard feature="community"><Community /></PageGuard>} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/exercises" element={<ExerciseLibrary />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/revenue" element={<RevenueDashboard />} />
        <Route path="/business" element={<Business />} />
        <Route path="/program-builder" element={<ProgramBuilder />} />
        <Route path="/white-label" element={<WhiteLabel />} />
        <Route path="/coaching-templates" element={<CoachingTemplates />} />
        <Route path="/onboarding-manager" element={<OnboardingManager />} />
        <Route path="/migration" element={<Migration />} />
        <Route path="/food-library" element={<FoodLibrary />} />
        <Route path="/food-log" element={<FoodLogPage />} />
        <Route path="/email-center" element={<EmailCenter />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/coach-profile" element={<CoachProfile />} />
        <Route path="/business-settings" element={<BusinessSettings />} />
        <Route path="/account-settings" element={<AccountSettings />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/referral-program" element={<ReferralProgram />} />
        <Route path="/affiliate-application" element={<AffiliateApplication />} />
        <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
        <Route path="/marketing-tools" element={<MarketingTools />} />
        <Route path="/weekly-summary" element={<WeeklySummary />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/team" element={<Team />} />
        <Route path="/ai-insights" element={<AIInsightsPage />} />
        <Route path="/submit-checkin" element={<SubmitCheckIn />} />
        <Route path="/checkin-detail" element={<CheckInDetail />} />
        <Route path="/at-risk" element={<AtRiskClients />} />
        <Route path="/client-profile" element={<ClientProfile />} />
      </Route>
      <Route element={<FocusLayout />}>
        <Route path="/fast-review" element={<FastReview />} />
      </Route>
      <Route path="/start" element={<PremiumOnboarding />} />
      {/* Supabase-auth pages (Step 3a; active when VITE_AUTH_PROVIDER=supabase) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/packages/:slug" element={<PackageLanding />} />
      <Route path="/client-onboarding" element={<ClientOnboarding />} />
      <Route path="/join/:code" element={<ClientInviteJoin />} />
      <Route path="/client-setup/:token" element={<ClientSetup />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/join" element={<ClientInviteJoin />} />
      <Route path="/workout" element={<ClientWorkoutView />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App