import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import AuthShell, { AuthField, AuthError, AuthNotice, AuthSubmit } from '@/pages/auth/AuthShell';

function StrengthBar({ password }) {
  if (!password) return null;
  const strength = password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? (strength === 1 ? 'bg-[#ff9b9b]' : 'bg-white') : 'bg-white/10'}`} />
        ))}
      </div>
      <span className="text-[13px] text-white/60">{labels[strength]}</span>
    </div>
  );
}

export default function ClientSetup() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | invalid | valid | success
  const [client, setClient] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    supabase.functions.invoke('validateInviteToken', { token })
      .then(res => {
        const data = res.data;
        if (!data?.valid) { setStatus('invalid'); return; }
        setClient(data.client);
        setStatus('valid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      // One-time account bootstrap (Step 3b): the edge function validates the
      // invite (by hash), creates/links the client's Supabase Auth account, and
      // single-uses the token. The client then signs in with email + password.
      const res = await supabase.functions.invoke('setupPortalAccount', { token, password });
      if (!res.data?.success) throw new Error(res.data?.error || 'Setup failed');
      // existing_account (S1): this email already had an account, which was
      // LINKED without changing its password. Signing in with the just-typed
      // password would fail — send them to login to use their existing
      // credentials (or the password-reset flow) instead.
      if (res.data.existing_account) {
        setError('');
        setStatus('valid');
        setSubmitting(false);
        window.location.assign('/login?existing=1');
        return;
      }
      await supabase.auth.login({ email: res.data.email, password });
      setStatus('success');
      setTimeout(() => { window.location.assign('/portal'); }, 800);
    } catch (err) {
      setError(err.message || 'Could not set up your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <AuthShell title="Checking your invite">
        <p className="text-[15px] text-white/60">One moment while we confirm your link.</p>
      </AuthShell>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthShell title="This link has expired">
        <p className="text-[15px] leading-relaxed text-white/70">
          The invite link is invalid or out of date. Ask your coach to send a new one.
        </p>
        <AuthNotice message="Invite links work for 7 days after they're sent." />
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell title="You're in">
        <p className="text-[15px] text-white/70">Your account is ready. Taking you to your plan.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={client ? `Welcome, ${client.name?.split(' ')[0]}` : 'Set your password'}>
      <>
          <p className="-mt-3 text-[15px] text-white/70">Set a password to open your coaching app.</p>
          {client && <div className="flex items-center gap-3 rounded-md bg-white/5 px-3.5 py-3 ring-1 ring-white/10">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
              {client.name?.[0]?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">{client.name}</p>
              <p className="truncate text-[13px] text-white/50">{client.email}</p>
            </div>
          </div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete="new-password" />
              <StrengthBar password={password} />
            </div>
            <AuthField label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Type it again" autoComplete="new-password" />
            <AuthError message={error} />
            <AuthSubmit disabled={submitting || !password || !confirmPassword}>
              {submitting ? 'Setting up' : 'Set password and continue'}
            </AuthSubmit>
          </form>
      </>
    </AuthShell>
  );
}
