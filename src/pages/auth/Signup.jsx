import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { parsePlan, savePendingPlan, startCheckout, WEBSITE_PRICING_URL } from '@/lib/authRedirect';
import AuthShell, { AuthField, AuthSubmit, AuthError, AuthNotice, authLinkClass } from './AuthShell.jsx';

const LABEL = { starter: 'Starter', pro: 'Pro', elite: 'Elite', enterprise: 'Enterprise' };

export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { plan, interval, explicit } = parsePlan(window.location.search);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → nothing to create.
  useEffect(() => {
    if (!submitting && !isLoadingAuth && isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, isLoadingAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      const { needsConfirmation } = await supabase.auth.signup({ email, password, full_name: fullName });
      if (needsConfirmation) {
        savePendingPlan(plan, interval);
        setNotice('Check your email to confirm your account, then sign in to start your trial.');
        setSubmitting(false);
        return;
      }
      try {
        await startCheckout(db, plan, interval);
      } catch (err) {
        // Account exists; let them finish from the subscription page.
        navigate('/subscription', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Could not create your account.');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Full name" value={fullName} onChange={setFullName} placeholder="Your name" autoComplete="name" />
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete="new-password" />
        <p className="text-xs text-white/50">
          {LABEL[plan]} · {interval === 'annual' ? 'Annual' : 'Monthly'}
          {!explicit && (
            <>
              {' · '}
              <a href={WEBSITE_PRICING_URL} className="text-white hover:underline">Change plan</a>
            </>
          )}
        </p>
        <AuthError message={error} />
        <AuthNotice message={notice} />
        {!notice && (
          <AuthSubmit disabled={submitting || !email || !password}>
            {submitting ? 'Creating account…' : 'Create account'}
          </AuthSubmit>
        )}
      </form>
      <div className="text-center text-xs text-white/40">
        Already have an account? <Link to="/login" className={authLinkClass + ' text-white'}>Sign in</Link>
      </div>
    </AuthShell>
  );
}
