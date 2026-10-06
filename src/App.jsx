import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout.jsx';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Programs = lazy(() => import('./pages/Programs'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Schedule = lazy(() => import('./pages/Schedule.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));

const Progress = lazy(() => import('./pages/Progress'));
const Store = lazy(() => import('./pages/Store'));
const Settings = lazy(() => import('./pages/Settings'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Adherence = lazy(() => import('./pages/Adherence.jsx'));
const CheckInReview = lazy(() => import('./pages/CheckInReview'));
const Sales = lazy(() => import('./pages/Sales'));

const Community = lazy(() => import('./pages/Community.jsx'));
const Subscription = lazy(() => import('./pages/Subscription'));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'));
const Automations = lazy(() => import('./pages/Automations'));
const Analytics = lazy(() => import('./pages/Analytics'));
const RevenueDashboard = lazy(() => import('./pages/RevenueDashboard'));
const Business = lazy(() => import('./pages/Business'));
const ProgramBuilder = lazy(() => import('./pages/ProgramBuilder'));
const WhiteLabel = lazy(() => import('./pages/WhiteLabel'));
import PageGuard from './components/subscription/PageGuard';
import BillingGate from './components/subscription/BillingGate';
const SubmitCheckIn = lazy(() => import('./pages/SubmitCheckIn'));
const CheckInDetail = lazy(() => import('./pages/CheckInDetail'));
const AtRiskClients = lazy(() => import('./pages/AtRiskClients.jsx'));
const FastReview = lazy(() => import('./pages/FastReview'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
import FocusLayout from './components/layout/FocusLayout';
const CoachingTemplates = lazy(() => import('./pages/CoachingTemplates'));
const ClientOnboarding = lazy(() => import('./pages/ClientOnboarding'));
const OnboardingManager = lazy(() => import('./pages/OnboardingManager'));
const Migration = lazy(() => import('./pages/Migration'));
const FoodLibrary = lazy(() => import('./pages/FoodLibrary'));
const FoodLogPage = lazy(() => import('./pages/FoodLogPage'));
const PremiumOnboarding = lazy(() => import('./pages/PremiumOnboarding'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ClientWorkoutView = lazy(() => import('./pages/ClientWorkoutView'));
const ClientInviteJoin = lazy(() => import('./pages/ClientInviteJoin'));
const ClientSetup = lazy(() => import('./pages/ClientSetup'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));
const EmailCenter = lazy(() => import('./pages/EmailCenter'));
const AIInsightsPage = lazy(() => import('./pages/AIInsightsPage'));
const Invoicing = lazy(() => import('./pages/Invoicing'));
const Packages = lazy(() => import('./pages/Packages'));
const PackageLanding = lazy(() => import('./pages/PackageLanding'));
const CoachProfile = lazy(() => import('./pages/CoachProfile'));
const BusinessSettings = lazy(() => import('./pages/BusinessSettings'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const ReferralProgram = lazy(() => import('./pages/ReferralProgram'));
const AffiliateApplication = lazy(() => import('./pages/AffiliateApplication'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const MarketingTools = lazy(() => import('./pages/MarketingTools'));
const WeeklySummary = lazy(() => import('./pages/WeeklySummary'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Team = lazy(() => import('./pages/Team'));
const SystemStatus = lazy(() => import('./pages/SystemStatus'));
import InstallPrompt from './components/pwa/InstallPrompt';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard entry: logged out → /login. Billing access is enforced for the whole
// coach shell by <BillingGate> (no access → billing page with a subscribe button).
const AuthGuardedDashboard = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Dashboard />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();

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
  // path is sent to login. Public/onboarding/auth/invite paths stay open; /portal/* is NOT public.
  const publicPaths = ['/start', '/join', '/client-onboarding', '/packages', '/login', '/signup', '/forgot-password', '/reset-password', '/client-setup', '/unsubscribe'];
  const isPublicPath = publicPaths.some(p => location.pathname.startsWith(p));
  if (!isAuthenticated && !isPublicPath) {
    const here = location.pathname + location.search;
    return <Navigate to={here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`} replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* ── CLIENT PORTAL (role=client) ── */}
      <Route path="/portal/*" element={<><ClientPortal /><InstallPrompt /></>} />
      <Route element={<BillingGate><AppLayout /></BillingGate>}>
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
        <Route path="/analytics" element={<PageGuard feature="analytics_graphs"><Analytics /></PageGuard>} />
        <Route path="/revenue" element={<PageGuard feature="revenue_dashboard"><RevenueDashboard /></PageGuard>} />
        <Route path="/business" element={<Business />} />
        <Route path="/program-builder" element={<ProgramBuilder />} />
        <Route path="/white-label" element={<PageGuard feature="custom_branding"><WhiteLabel /></PageGuard>} />
        <Route path="/coaching-templates" element={<CoachingTemplates />} />
        <Route path="/onboarding-manager" element={<OnboardingManager />} />
        <Route path="/migration" element={<Migration />} />
        <Route path="/food-library" element={<FoodLibrary />} />
        <Route path="/food-log" element={<FoodLogPage />} />
        <Route path="/email-center" element={<EmailCenter />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/payment-tracking" element={<Navigate to="/invoicing?view=payments" replace />} />
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
        {/* Internal diagnostics: platform admins only (renders Not Found for everyone else). */}
        <Route path="/system" element={<SystemStatus />} />
      </Route>
      <Route element={<BillingGate><FocusLayout /></BillingGate>}>
        <Route path="/fast-review" element={<FastReview />} />
      </Route>
      <Route path="/start" element={<PremiumOnboarding />} />
      {/* Supabase-auth pages */}
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
    </Suspense>
  );
};

// Pages load as separate chunks (the app used to ship as one 3.7 MB file).
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ErrorBoundary scope="app">
          <Router>
            <AuthenticatedApp />
          </Router>
        </ErrorBoundary>
        <Toaster />
        <SonnerToaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App