import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function CoachAccountScreen({ onNext, onBack, data }) {
  const { navigateToLogin } = useAuth();
  const [form, setForm] = useState({
    full_name: data?.business_name || '',
    email: data?.email || '',
    password: '',
    confirm: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.full_name.trim()) return 'Please enter your full name.';
    if (!form.email.trim() || !form.email.includes('@')) return 'Please enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      // await: onNext now performs the actual Supabase signup, so a failure
      // (e.g. email already registered) must surface here and re-enable the form.
      await onNext({
        account_email: form.email.trim(),
        account_name: form.full_name.trim(),
        account_password: form.password,
      });
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const canSubmit = form.full_name && form.email && form.password && form.confirm && !loading;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--tc-sidebar)' }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, var(--tc-primary) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      {/* Back */}
      <div className="flex-shrink-0 pt-5 px-5 relative z-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--kc-555555)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-36 pt-6 max-w-lg mx-auto w-full relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2 mb-8">
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold" style={{ color: 'var(--tc-primary)' }}>
            Step 2 of 3 · Create Account
          </p>
          <h2 className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.025em' }}>
            Create your account.
          </h2>
          <p className="text-sm" style={{ color: 'var(--kc-6b6b6b)' }}>
            Next: choose your plan and add your card.
          </p>
        </motion.div>

        {/* Fields */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-555555)' }}>Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--kc-444444)' }} />
              <input
                type="text"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Alex Johnson"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-[var(--kc-3a3a3a)] outline-none transition-all"
                style={{
                  background: 'var(--kc-141414)',
                  border: '1px solid color-mix(in srgb, white 8%, transparent)',
                }}
                onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 50%, transparent)'}
                onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-555555)' }}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--kc-444444)' }} />
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="coach@example.com"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-[var(--kc-3a3a3a)] outline-none transition-all"
                style={{
                  background: 'var(--kc-141414)',
                  border: '1px solid color-mix(in srgb, white 8%, transparent)',
                }}
                onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 50%, transparent)'}
                onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-555555)' }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--kc-444444)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-[var(--kc-3a3a3a)] outline-none transition-all"
                style={{
                  background: 'var(--kc-141414)',
                  border: '1px solid color-mix(in srgb, white 8%, transparent)',
                }}
                onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 50%, transparent)'}
                onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--kc-444444)' }}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-555555)' }}>Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--kc-444444)' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="Repeat your password"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-[var(--kc-3a3a3a)] outline-none transition-all"
                style={{
                  background: 'var(--kc-141414)',
                  border: '1px solid color-mix(in srgb, white 8%, transparent)',
                }}
                onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 50%, transparent)'}
                onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
                onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--kc-444444)' }}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password strength hint */}
          {form.password.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              {[4, 6, 8, 12].map((threshold, i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{
                    background: form.password.length >= threshold
                      ? i < 2 ? 'var(--tc-destructive)' : i < 3 ? 'var(--tc-warning)' : 'var(--tc-success)'
                      : 'color-mix(in srgb, white 6%, transparent)',
                  }}
                />
              ))}
              <span className="text-[11px]" style={{ color: 'var(--kc-555555)' }}>
                {form.password.length < 4 ? 'Weak' : form.password.length < 8 ? 'Fair' : form.password.length < 12 ? 'Good' : 'Strong'}
              </span>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-center py-2 px-4 rounded-xl"
              style={{ color: 'var(--tc-destructive)', background: 'color-mix(in srgb, var(--tc-destructive) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 20%, transparent)' }}
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Fine print */}
        <p className="text-xs text-center mt-6" style={{ color: 'var(--kc-2e2e2e)' }}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 z-20"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))', background: 'var(--tc-sidebar)' }}
      >
        <div className="max-w-lg mx-auto w-full pt-4">
          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.02, boxShadow: '0 0 40px color-mix(in srgb, var(--tc-primary) 45%, transparent)' } : {}}
            whileTap={canSubmit ? { scale: 0.97 } : {}}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2.5 transition-opacity"
            style={{
              background: canSubmit ? 'linear-gradient(135deg, var(--tc-primary), var(--tc-primary))' : 'var(--tc-foreground)',
              boxShadow: canSubmit ? '0 0 28px color-mix(in srgb, var(--tc-primary) 30%, transparent)' : 'none',
              opacity: canSubmit ? 1 : 0.4,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? (
              <motion.div
                className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                Create My Account
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--kc-333333)' }}>
            Already have an account?{' '}
            <button
              onClick={() => navigateToLogin()}
              className="underline"
              style={{ color: 'var(--tc-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}