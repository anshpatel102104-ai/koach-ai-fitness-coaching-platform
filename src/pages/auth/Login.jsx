import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { safeNext, parseEmail, planFromUser, takePendingPlan, startCheckout, WEBSITE_PRICING_URL } from '@/lib/authRedirect';
import AuthShell, { AuthField, AuthSubmit, AuthError, AuthNotice, authLinkClass } from './AuthShell.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const next = safeNext(params.get('next')) || safeNext(params.get('from_url')) || '/';
  const [email, setEmail] = useState(() => parseEmail(window.location.search));
  const resumed = useRef(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the form.
  useEffect(() => {
    if (submitting || isLoadingAuth || !isAuthenticated || resumed.current) return;
    resumed.current = true;
    // Arrived signed in (e.g. via the email-confirmation link): if they picked a
    // plan at signup and never started checkout, continue to Stripe for it.
    const subscribedAlready = ['active', 'trialing', 'past_due'].includes(user?.billing_status);
    const pending = takePendingPlan() || planFromUser(user);
    if (pending && !subscribedAlready) {
      startCheckout(db, pending.plan, pending.interval).catch(() => navigate('/subscription', { replace: true }));
      return;
    }
    navigate(next, { replace: true });
  }, [isAuthenticated, isLoadingAuth, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const me = await supabase.auth.login({ email, password });
      // Signed up with a plan but had to confirm their email first → resume checkout.
      const pending = takePendingPlan() || planFromUser(me);
      resumed.current = true;
      const subscribed = ['active', 'trialing', 'past_due'].includes(me?.billing_status);
      if (pending && !subscribed) {
        try { await startCheckout(db, pending.plan, pending.interval); return; } catch { /* fall through to /subscription */ }
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your email and password.');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Sign in">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" />
        {params.get('confirm') === '1' && <AuthNotice message="Confirm your email, then sign in." />}
        <AuthError message={error} />
        <AuthSubmit disabled={submitting || !email || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </AuthSubmit>
      </form>
      <div className="flex flex-col items-center gap-3 text-[13px]">
        <Link to="/forgot-password" className={authLinkClass}>Forgot password?</Link>
        <span className="text-white/50">
          Don&apos;t have an account?{' '}
          <a href={WEBSITE_PRICING_URL} className="text-white hover:underline">Start free trial</a>
        </span>
      </div>
    </AuthShell>
  );
}
