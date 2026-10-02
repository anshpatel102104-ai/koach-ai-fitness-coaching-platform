import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Lock, Eye, EyeOff, Shield, Monitor, Smartphone,
  Tablet, Check, X, ChevronRight, AlertTriangle, Download, Trash2,
  Pause, RefreshCw, CreditCard, Calendar, ExternalLink, Globe,
  ToggleLeft, ToggleRight
} from 'lucide-react';

/* ── Helpers ── */
function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return user.slice(0, 2) + '***@' + domain;
}

function passwordStrength(pw) {
  if (!pw) return { label: '', color: '', pct: 0 };
  if (pw.length < 8) return { label: 'Weak', color: 'var(--tc-destructive)', pct: 25 };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 12 && hasUpper && hasNum && hasSymbol) return { label: 'Strong', color: 'var(--tc-success)', pct: 100 };
  if (hasNum && hasUpper) return { label: 'Good', color: 'var(--kc-eab308)', pct: 75 };
  return { label: 'Fair', color: 'var(--kc-f97316)', pct: 50 };
}

function SectionCard({ title, icon: Icon, iconBg = 'var(--tc-accent)', iconColor = 'var(--tc-primary)', children, danger }) {
  return (
    <div className={`bg-card rounded-2xl overflow-hidden ${danger ? 'border-2 border-destructive' : 'border border-border'}`}
      style={{ boxShadow: '0 1px 12px color-mix(in srgb, black 5%, transparent)' }}>
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${danger ? 'border-destructive bg-destructive/10' : 'border-border'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: danger ? 'var(--tc-destructive)' : iconBg }}>
          <Icon className="w-4 h-4" style={{ color: danger ? 'var(--tc-destructive)' : iconColor }} />
        </div>
        <h2 className={`font-bold text-base ${danger ? 'text-destructive' : 'text-foreground'}`}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Divider() { return <div className="h-px bg-muted my-5" />; }

function ToggleSetting({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)} className="flex-shrink-0 transition-opacity">
        {value
          ? <ToggleRight className="w-8 h-8 text-primary" />
          : <ToggleLeft className="w-8 h-8 text-border" />
        }
      </button>
    </div>
  );
}

/* ── Password Change Form ── */
function PasswordForm({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const strength = passwordStrength(next);

  const reqs = [
    { label: 'At least 8 characters', met: next.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(next) },
    { label: 'At least one number', met: /[0-9]/.test(next) },
    { label: 'At least one special character', met: /[^A-Za-z0-9]/.test(next) },
  ];

  const handleSubmit = async () => {
    if (!current) return toast.error('Please enter your current password');
    if (!reqs.every(r => r.met)) return toast.error('Password does not meet all requirements');
    if (next !== confirm) return toast.error('Passwords do not match');
    // Actually update the password (this was a no-op that only toasted success).
    try {
      await supabase.auth.updatePassword(next);
      toast.success('Password updated successfully ✓');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not update password. Please sign in again and retry.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden">
      <div className="mt-4 p-4 rounded-2xl bg-muted border border-border space-y-3">
        <div className="relative">
          <input type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
            placeholder="Current password"
            className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border text-sm focus:outline-none focus:border-primary bg-card" />
          <button onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <input type={showNext ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)}
            placeholder="New password"
            className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border text-sm focus:outline-none focus:border-primary bg-card" />
          <button onClick={() => setShowNext(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {next && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Strength</span>
              <span className="text-xs font-bold" style={{ color: strength.color }}>{strength.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${strength.pct}%`, background: strength.color }} />
            </div>
            <div className="mt-2 space-y-1">
              {reqs.map(r => (
                <div key={r.label} className="flex items-center gap-2 text-xs">
                  {r.met ? <Check className="w-3 h-3 text-success flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-border flex-shrink-0" />}
                  <span className={r.met ? 'text-success' : 'text-muted-foreground'}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-primary bg-card" />
        <div className="flex gap-2 pt-1">
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-primary-foreground"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            Update Password
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-card border border-border">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Email Change Form ── */
function EmailForm({ onClose }) {
  const [newEmail, setNewEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!newEmail || !confirm || !password) return toast.error('Please fill in all fields');
    if (newEmail !== confirm) return toast.error('Email addresses do not match');
    if (!newEmail.includes('@')) return toast.error('Please enter a valid email address');
    toast.success('Confirmation email sent to ' + newEmail);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden">
      <div className="mt-4 p-4 rounded-2xl bg-muted border border-border space-y-3">
        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
          placeholder="New email address"
          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-primary bg-card" />
        <input type="email" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm new email"
          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-primary bg-card" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Current password (for verification)"
          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-primary bg-card" />
        <p className="text-xs text-muted-foreground bg-accent p-2.5 rounded-lg border border-accent">
          📧 A confirmation email will be sent to your new address before the change takes effect.
        </p>
        <div className="flex gap-2">
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-primary-foreground"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            Update Email
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-card border border-border">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Delete Account Modal ── */
function DeleteAccountModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');

  const WHAT_DELETED = [
    'Your account and personal information',
    'All client profiles and data',
    'All training programs and nutrition plans',
    'All messages and conversations',
    'All billing history and invoices',
    'All check-ins and progress data',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'color-mix(in srgb, black 50%, transparent)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-3xl p-6 w-full max-w-md shadow-2xl">
        {step === 1 && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="text-foreground font-black text-xl text-center mb-2">Delete Account?</h3>
            <p className="text-muted-foreground text-sm text-center mb-6">This will permanently delete your account and all associated data. <strong>This cannot be undone.</strong></p>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl font-bold text-white text-sm bg-destructive">Continue</button>
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-semibold text-muted-foreground border border-border text-sm">Cancel</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="text-foreground font-black text-lg mb-4">What will be deleted:</h3>
            <div className="space-y-2 mb-6">
              {WHAT_DELETED.map(item => (
                <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-2xl font-bold text-white text-sm bg-destructive">I Understand, Continue</button>
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-semibold text-muted-foreground border border-border text-sm">Cancel</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h3 className="text-foreground font-black text-lg mb-2">Export your data first?</h3>
            <p className="text-muted-foreground text-sm mb-4">We recommend downloading your data before deleting.</p>
            <button onClick={() => { toast.success("We'll email you your data export within 24 hours."); }}
              className="w-full py-3 rounded-2xl font-bold text-primary border-2 border-primary bg-accent text-sm mb-3 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download My Data First
            </button>
            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-2xl font-bold text-white text-sm bg-destructive">Skip & Continue Deleting</button>
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-semibold text-muted-foreground border border-border text-sm">Cancel</button>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h3 className="text-foreground font-black text-lg mb-2">Type to confirm</h3>
            <p className="text-muted-foreground text-sm mb-3">Type <strong>DELETE MY ACCOUNT</strong> to confirm</p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-destructive mb-3" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-destructive mb-4" />
            <p className="text-xs text-muted-foreground bg-warning/10 p-2.5 rounded-lg border border-warning mb-4">
              ⏳ Your account will enter a 30-day grace period. You can reactivate by clicking the link in the cancellation email.
            </p>
            <div className="flex gap-3">
              <button
                disabled={confirmText !== 'DELETE MY ACCOUNT' || !password}
                onClick={() => { toast.error('Account deletion is disabled in demo mode.'); onClose(); }}
                className="flex-1 py-3 rounded-2xl font-bold text-white text-sm bg-destructive disabled:opacity-40 disabled:cursor-not-allowed">
                Delete My Account
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-semibold text-muted-foreground border border-border text-sm">Cancel</button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── FAKE SESSIONS ── */
const MOCK_SESSIONS = [
  { id: 1, device: 'laptop', name: 'MacBook Pro', browser: 'Chrome 124', location: 'New York, US', lastActive: 'Now', isCurrent: true },
  { id: 2, device: 'phone', name: 'iPhone 15', browser: 'Safari Mobile', location: 'New York, US', lastActive: '2 hours ago', isCurrent: false },
  { id: 3, device: 'laptop', name: 'Windows PC', browser: 'Edge 123', location: 'Miami, US', lastActive: '3 days ago', isCurrent: false },
];

function DeviceIcon({ type }) {
  if (type === 'phone') return <Smartphone className="w-4 h-4 text-muted-foreground" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4 text-muted-foreground" />;
  return <Monitor className="w-4 h-4 text-muted-foreground" />;
}

/* ── MAIN PAGE ── */
export default function AccountSettings() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [privacy, setPrivacy] = useState({ publicProfile: true, searchIndex: true, analytics: true, marketing: true });

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const signOutSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Session signed out');
  };
  const signOutAll = () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    toast.success('All other sessions signed out');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground">Security, privacy, and account management</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* SECTION 1 — LOGIN & SECURITY */}
        <SectionCard icon={Lock} title="Login & Security" iconBg="var(--tc-warning)" iconColor="var(--tc-warning)">
          {/* Email */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Email Address</p>
                <p className="text-sm text-muted-foreground mt-0.5">{maskEmail(user?.email)}</p>
              </div>
              <button onClick={() => { setShowEmailForm(s => !s); setShowPasswordForm(false); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
                Change Email
              </button>
            </div>
            <AnimatePresence>{showEmailForm && <EmailForm onClose={() => setShowEmailForm(false)} />}</AnimatePresence>
          </div>

          <Divider />

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Password</p>
                <p className="text-sm text-muted-foreground mt-0.5">••••••••••••</p>
              </div>
              <button onClick={() => { setShowPasswordForm(s => !s); setShowEmailForm(false); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
                Change Password
              </button>
            </div>
            <AnimatePresence>{showPasswordForm && <PasswordForm onClose={() => setShowPasswordForm(false)} />}</AnimatePresence>
          </div>

          <Divider />

          {/* 2FA */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-semibold">Not Enabled</span>
              <button onClick={() => toast.info('2FA setup coming soon')}
                className="px-3 py-2 rounded-xl text-xs font-bold text-primary border border-primary bg-accent hover:bg-accent transition-colors">
                Enable
              </button>
            </div>
          </div>

          <Divider />

          {/* Sessions */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Active Sessions</p>
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                  <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0">
                    <DeviceIcon type={s.device} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      {s.isCurrent && (
                        <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full flex-shrink-0">This device</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.browser} · {s.location} · {s.lastActive}</p>
                  </div>
                  {!s.isCurrent && (
                    <button onClick={() => signOutSession(s.id)}
                      className="text-xs font-semibold text-destructive hover:text-destructive flex-shrink-0">
                      Sign Out
                    </button>
                  )}
                </div>
              ))}
            </div>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button onClick={signOutAll}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-destructive border border-destructive bg-destructive/10 hover:bg-destructive/10 transition-colors">
                Sign Out All Other Devices
              </button>
            )}
          </div>
        </SectionCard>

        {/* SECTION 2 — ACCOUNT DETAILS */}
        <SectionCard icon={Shield} title="Account Details" iconBg="var(--tc-accent)" iconColor="var(--tc-primary)">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Email</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{user?.email || '—'}</p>
              </div>
            </div>
            <Divider />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Since</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {user?.created_date ? new Date(user.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—'}
                </p>
              </div>
            </div>
            <Divider />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account ID</p>
                <p className="text-sm font-mono text-muted-foreground mt-0.5">{user?.id ? user.id.slice(0, 16) + '...' : '—'}</p>
              </div>
            </div>
            <Divider />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Plan</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{user?.plan || 'Free Plan'}</p>
              </div>
              <Link to="/subscription"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </SectionCard>

        {/* SECTION 3 — CONNECTED ACCOUNTS */}
        <SectionCard icon={Globe} title="Connected Accounts" iconBg="var(--tc-success)" iconColor="var(--tc-success)">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Social Login</p>
            {[
              { name: 'Google', icon: '🔵', desc: 'Sign in with your Google account' },
              { name: 'Apple', icon: '⚫', desc: 'Sign in with your Apple ID' },
            ].map(social => (
              <div key={social.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{social.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{social.name}</p>
                    <p className="text-xs text-muted-foreground">{social.desc}</p>
                  </div>
                </div>
                <button onClick={() => toast.info(`${social.name} login coming soon`)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground bg-muted border border-border hover:bg-border transition-colors">
                  Connect
                </button>
              </div>
            ))}

            <div className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Calendar Integration</p>
              {[
                { name: 'Google Calendar', connected: true, email: user?.email },
                { name: 'Apple Calendar', connected: false },
                { name: 'Outlook Calendar', connected: false },
              ].map(cal => (
                <div key={cal.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">{cal.name}</p>
                      {cal.connected && <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">Connected</span>}
                    </div>
                    {cal.connected && cal.email && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{cal.email}</p>}
                  </div>
                  <button onClick={() => toast.info(cal.connected ? `${cal.name} disconnected` : `${cal.name} setup coming soon`)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${cal.connected ? 'text-destructive bg-destructive/10 border border-destructive hover:bg-destructive/10' : 'text-muted-foreground bg-muted border border-border hover:bg-border'}`}>
                    {cal.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Account</p>
              <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Stripe</p>
                    <p className="text-xs text-muted-foreground">Process payments from clients</p>
                  </div>
                </div>
                <Link to="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-accent border border-primary">
                  Manage <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* SECTION 4 — DATA & PRIVACY */}
        <SectionCard icon={Download} title="Data & Privacy" iconBg="var(--tc-ai)" iconColor="var(--tc-ai)">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Data Export</p>
            <p className="text-xs text-muted-foreground mb-3">Download all your data including clients, programs, messages, and payment history as a ZIP file.</p>
            <button onClick={() => toast.success("We'll email you your data export within 24 hours ✓")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-ai bg-ai/10 border border-ai hover:bg-ai/10 transition-colors">
              <Download className="w-4 h-4" /> Download My Data
            </button>
          </div>

          <Divider />

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Privacy Settings</p>
            <div className="space-y-1">
              <ToggleSetting label="Public Profile" description="Allow clients to find your profile" value={privacy.publicProfile} onChange={v => setPrivacy(p => ({ ...p, publicProfile: v }))} />
              <ToggleSetting label="Search Engine Indexing" description="Allow search engines to index your profile" value={privacy.searchIndex} onChange={v => setPrivacy(p => ({ ...p, searchIndex: v }))} />
              <ToggleSetting label="Analytics & Crash Reporting" description="Help us improve KOACH AI" value={privacy.analytics} onChange={v => setPrivacy(p => ({ ...p, analytics: v }))} />
              <ToggleSetting label="Marketing Emails" description="Receive tips, updates, and offers" value={privacy.marketing} onChange={v => setPrivacy(p => ({ ...p, marketing: v }))} />
            </div>
          </div>
        </SectionCard>

        {/* SECTION 5 — DANGER ZONE */}
        <SectionCard icon={AlertTriangle} title="Danger Zone" danger>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted">
              <div>
                <p className="text-sm font-bold text-foreground">Pause Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Temporarily deactivate your account. Clients will be notified.</p>
              </div>
              <button onClick={() => toast.info('Account pause feature coming soon')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-warning bg-warning/10 border border-warning hover:bg-warning/10 transition-colors">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted">
              <div>
                <p className="text-sm font-bold text-foreground">Transfer Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Transfer ownership to another coach.</p>
              </div>
              <button onClick={() => toast.info('Account transfer feature coming soon')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground bg-card border border-border hover:bg-muted transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Transfer
              </button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border-2 border-destructive bg-destructive/10">
              <div>
                <p className="text-sm font-bold text-destructive">Delete Account</p>
                <p className="text-xs text-destructive mt-0.5">Permanently delete your account and all data. Cannot be undone.</p>
              </div>
              <button onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-destructive bg-card border-2 border-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </SectionCard>

        <div className="pb-8" />
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
      </AnimatePresence>
    </div>
  );
}