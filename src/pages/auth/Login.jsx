import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { safeNext, takePendingPlan, startCheckout, WEBSITE_PRICING_URL } from '@/lib/authRedirect';
import AuthShell, { AuthField, AuthSubmit, AuthError, AuthNotice, authLinkClass } from './AuthShell.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const next = safeNext(params.get('next')) || safeNext(params.get('from_url')) || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the form.
  useEffect(() => {
    if (!submitting && !isLoadingAuth && isAuthenticated) navigate(next, { replace: true });
  }, [isAuthenticated, isLoadingAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const me = await supabase.auth.login({ email, password });
      // Signed up with a plan but had to confirm their email first → resume checkout.
      const pending = takePendingPlan();
      const subscribed = ['active', 'trialing', 'past_due'].includes(me?.billing_status) || !!me?.stripe_subscription_id;
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
      <div className="flex flex-col items-center gap-2 text-xs">
        <Link to="/forgot-password" className={authLinkClass}>Forgot password?</Link>
        <span className="text-white/40">
          Don&apos;t have an account?{' '}
          <a href={WEBSITE_PRICING_URL} className="text-white hover:underline">Start free trial</a>
        </span>
      </div>
    </AuthShell>
  );
}
