import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import KoachLogo from '@/components/brand/KoachLogo.jsx';

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 pr-16 rounded-xl bg-[var(--kc-w-5)] border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-primary/60 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors"
        >
          {show ? 'HIDE' : 'SHOW'}
        </button>
      </div>
    </div>
  );
}

function StrengthBar({ password }) {
  if (!password) return null;
  const strength = password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const colors = ['', 'var(--tc-destructive)', 'var(--tc-warning)', 'var(--tc-primary)', 'var(--tc-success)'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= strength ? colors[strength] : 'color-mix(in srgb, white 8%, transparent)' }} />
        ))}
      </div>
      <span className="text-[10px] font-bold" style={{ color: colors[strength] }}>{labels[strength]}</span>
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

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--tc-sidebar)' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, var(--tc-primary) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">

        <KoachLogo size={56} rounded="rounded-2xl" glow bg />

        {/* ── LOADING ── */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-blue-500 animate-spin" />
            <p className="text-sm text-white/40">Verifying your invite…</p>
          </div>
        )}

        {/* ── INVALID ── */}
        {status === 'invalid' && (
          <div className="w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--tc-destructive) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 25%, transparent)' }}>
              <span className="text-2xl">⛔</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Link Invalid or Expired</h1>
              <p className="text-sm text-white/40 leading-relaxed">
                This invite link is invalid or has expired. Please ask your coach to resend your invite.
              </p>
            </div>
            <div className="pt-2 px-4 py-3 rounded-xl text-xs text-white/30 leading-relaxed"
              style={{ background: 'color-mix(in srgb, white 3%, transparent)', border: '1px solid color-mix(in srgb, white 6%, transparent)' }}>
              Invite links are valid for 7 days after they are sent.
            </div>
          </div>
        )}

        {/* ── VALID — SET PASSWORD FORM ── */}
        {status === 'valid' && client && (
          <div className="w-full space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                Welcome, {client.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm text-white/40 leading-relaxed">
                Set your password to access your coaching portal.
              </p>
            </div>

            {/* Client identity card */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--tc-primary) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-primary) 18%, transparent)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'color-mix(in srgb, var(--tc-primary) 20%, transparent)', color: 'var(--tc-primary)' }}>
                {client.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{client.name}</p>
                <p className="text-xs text-white/40">{client.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                />
                <StrengthBar password={password} />
              </div>

              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter your password"
              />

              {error && (
                <div className="px-4 py-3 rounded-xl text-xs font-medium text-destructive"
                  style={{ background: 'color-mix(in srgb, var(--tc-destructive) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 20%, transparent)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !password || !confirmPassword}
                className="w-full py-4 rounded-xl font-bold text-base text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-primary))',
                  boxShadow: '0 0 24px color-mix(in srgb, var(--tc-primary) 25%, transparent)',
                }}
              >
                {submitting ? 'Setting up…' : 'Set Password & Continue →'}
              </button>
            </form>
          </div>
        )}

        {/* ── SUCCESS (placeholder) ── */}
        {status === 'success' && (
          <div className="w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--tc-success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-success) 25%, transparent)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14L11 19L22 8" stroke="var(--tc-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Account created!</h1>
              <p className="text-sm text-white/40 leading-relaxed">
                Your account is ready. Fragment 3 will redirect you to the portal here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}