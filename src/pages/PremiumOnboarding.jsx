import React, { useState, useEffect } from 'react';
// PremiumOnboarding — coach-only onboarding flow
// FLOW ORDER: splash → welcome → onboarding steps → create account → choose tier → Stripe checkout → dashboard
import { motion, AnimatePresence } from 'framer-motion';
import SplashScreen from '@/components/onboarding/SplashScreen';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import CoachProfileScreen from '@/components/onboarding/CoachProfileScreen';
import CoachClientsScreen from '@/components/onboarding/CoachClientsScreen';
import CoachTypeScreen from '@/components/onboarding/CoachTypeScreen';
import CoachBottleneckScreen from '@/components/onboarding/CoachBottleneckScreen';
import CoachSoftwareScreen from '@/components/onboarding/CoachSoftwareScreen';
import CoachPricingScreen from '@/components/onboarding/CoachPricingScreen';
import CoachAccountScreen from '@/components/onboarding/CoachAccountScreen';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

// Step 1–6: onboarding, Step 7: create account, Step 8: pricing (→ Stripe)
const FLOW = [
  'splash',
  'welcome',
  'coach_profile',
  'coach_clients',
  'coach_type',
  'coach_bottleneck',
  'coach_software',
  'coach_account',   // create account AFTER onboarding, BEFORE pricing
  'coach_pricing',   // tier selection → fires Stripe checkout
];

const NO_PROGRESS = new Set(['splash', 'welcome', 'coach_account', 'coach_pricing']);

// localStorage key for carrying onboarding data across the account-creation redirect
const LS_ONBOARDING_DATA = 'koach_pending_onboarding_data';
const LS_RESUME_PRICING  = 'koach_resume_pricing';

export default function PremiumOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, user, updateMe } = useAuth();
  const [step, setStep] = useState('splash');
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState(() => {
    // Restore any onboarding data that was stashed before account creation
    try {
      const stashed = localStorage.getItem(LS_ONBOARDING_DATA);
      return stashed ? JSON.parse(stashed) : {};
    } catch { return {}; }
  });

  // --- Handle authenticated users landing on /start ---
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;

    if (isAuthenticated) {
      const urlParams = new URLSearchParams(window.location.search);
      const resumeCheckout = urlParams.get('resume') === 'checkout' || localStorage.getItem(LS_RESUME_PRICING) === '1';

      if (resumeCheckout) {
        // User created account and was sent back to finish tier selection
        // Flush any pending onboarding data to their profile
        flushOnboardingData();
        localStorage.removeItem(LS_RESUME_PRICING);
        setStep('coach_pricing');
        return;
      }

      // Already has an active/trialing/past_due subscription — go straight to dashboard
      const hasActiveSubscription =
        ['active', 'trialing', 'past_due'].includes(user?.billing_status) ||
        (user?.stripe_subscription_id && user?.billing_status !== 'canceled');

      if (hasActiveSubscription) {
        navigate('/', { replace: true });
        return;
      }

      // Authenticated but no subscription — resume at pricing (incomplete new signup)
      flushOnboardingData();
      setStep('coach_pricing');
    }
  }, [isAuthenticated, isLoadingAuth, isLoadingPublicSettings, user]);

  const flushOnboardingData = async () => {
    const stashed = localStorage.getItem(LS_ONBOARDING_DATA);
    if (!stashed) return;
    try {
      const onboardingData = JSON.parse(stashed);
      // Save all collected onboarding fields to the user's profile
      const ONBOARDING_FIELDS = [
        'business_name', 'social_handle', 'niche',
        'client_count', 'coach_type', 'bottlenecks', 'current_software',
      ];
      const profileUpdate = {};
      ONBOARDING_FIELDS.forEach(key => {
        if (onboardingData[key] !== undefined) profileUpdate[key] = onboardingData[key];
      });
      if (Object.keys(profileUpdate).length > 0) {
        await updateMe(profileUpdate);
      }
      localStorage.removeItem(LS_ONBOARDING_DATA);
    } catch (e) {
      console.warn('Could not flush onboarding data:', e);
    }
  };

  // Loading spinner while auth resolves
  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--tc-sidebar)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  const idx = FLOW.indexOf(step);

  const next = async (newData = {}) => {
    const merged = { ...data, ...newData };
    setData(merged);

    if (step === 'coach_account') {
      // Actually create the Supabase account. The old flow stashed the data
      // (including the plaintext password) and redirected to login WITHOUT ever
      // calling signup — so the primary /start path could not create an account.
      const { account_email, account_name, account_password, ...onboarding } = merged;
      // Persist only NON-credential onboarding fields for the post-auth profile
      // flush. The plaintext password is never written to localStorage.
      localStorage.setItem(LS_ONBOARDING_DATA, JSON.stringify(onboarding));
      localStorage.setItem(LS_RESUME_PRICING, '1');
      const { needsConfirmation } = await supabase.auth.signup({
        email: account_email, password: account_password, full_name: account_name,
      });
      if (needsConfirmation) {
        // Project requires email confirmation → finish after they confirm.
        navigate('/login?confirm=1', { replace: true });
        return;
      }
      await flushOnboardingData(); // save business_name/niche/etc. to the new profile
      setStep('coach_pricing');
      return;
    }

    if (idx < FLOW.length - 1) {
      setDirection(1);
      setStep(FLOW[idx + 1]);
    }
  };

  const back = () => {
    if (idx > 0) {
      setDirection(-1);
      setStep(FLOW[idx - 1]);
    }
  };

  // Progress bar only for question steps
  const questionSteps = FLOW.filter(s => !NO_PROGRESS.has(s));
  const progressIdx = questionSteps.indexOf(step);
  const showProgress = progressIdx >= 0;
  const progress = showProgress ? (progressIdx + 1) / questionSteps.length : 0;

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };
  const transition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.38 };

  const props = { onNext: next, onBack: back, data, setData };

  const renderStep = () => {
    switch (step) {
      case 'splash':           return <SplashScreen onDone={() => { setDirection(1); setStep('welcome'); }} />;
      case 'welcome':          return <WelcomeScreen {...props} />;
      case 'coach_profile':    return <CoachProfileScreen {...props} />;
      case 'coach_clients':    return <CoachClientsScreen {...props} />;
      case 'coach_type':       return <CoachTypeScreen {...props} />;
      case 'coach_bottleneck': return <CoachBottleneckScreen {...props} />;
      case 'coach_software':   return <CoachSoftwareScreen {...props} />;
      case 'coach_account':    return <CoachAccountScreen {...props} />;
      case 'coach_pricing':    return <CoachPricingScreen {...props} resuming={isAuthenticated} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--tc-sidebar)' }}>
      {showProgress && (
        <div className="absolute top-0 left-0 right-0 z-50 h-[2px]" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-primary))' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          />
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={step === 'splash' ? {} : variants}
          initial={step === 'splash' ? { opacity: 0 } : 'enter'}
          animate={step === 'splash' ? { opacity: 1 } : 'center'}
          exit={step === 'splash' ? { opacity: 0 } : 'exit'}
          transition={transition}
          className="absolute inset-0"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}