import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Lock, Shield, Monitor, Smartphone, Tablet, X, Download, Globe, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PasswordChange from '@/components/settings/PasswordChange';
import {
  SettingsShell, SettingsPanel, SettingsRow, SettingsSwitchRow, SettingsGroupLabel, fieldClass,
} from '@/components/settings/SettingsLayout';

/* ── Helpers ── */
function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return user.slice(0, 2) + '***@' + domain;
}

/* ── Email Change Form ── */
function EmailForm({ onClose }) {
  const [newEmail, setNewEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!newEmail || !confirm || !password) return toast.error('Fill in all three fields');
    if (newEmail !== confirm) return toast.error('The email addresses do not match');
    if (!newEmail.includes('@')) return toast.error('Enter a valid email address');
    toast.success('Confirmation email sent to ' + newEmail);
    onClose();
  };

  return (
    <div className="space-y-3 rounded-lg bg-secondary p-4">
      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" className={fieldClass} />
      <input type="email" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new email" className={fieldClass} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Current password" className={fieldClass} />
      <p className="text-[13px] text-muted-foreground">We send a confirmation link to the new address. Nothing changes until you click it.</p>
      <div className="flex gap-2">
        <Button onClick={handleSubmit}>Update email</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
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
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>This permanently deletes your account and everything in it. It cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Keep my account</Button>
              <Button variant="destructive" className="flex-1" onClick={() => setStep(2)}>Continue</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>What gets deleted</DialogTitle>
            </DialogHeader>
            <ul className="divide-y divide-border">
              {WHAT_DELETED.map(item => (
                <li key={item} className="flex items-start gap-2 py-2 text-sm text-foreground">
                  <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => setStep(3)}>I understand</Button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Export your data first?</DialogTitle>
              <DialogDescription>Download your clients, programs and messages before they are gone.</DialogDescription>
            </DialogHeader>
            <Button variant="outline" className="w-full" onClick={() => { toast.success("We'll email your data export within 24 hours."); }}>
              <Download /> Download my data
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => setStep(4)}>Skip and continue</Button>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>Type to confirm</DialogTitle>
              <DialogDescription>Type <strong className="text-foreground">DELETE MY ACCOUNT</strong> and your password.</DialogDescription>
            </DialogHeader>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE MY ACCOUNT" className={fieldClass} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className={fieldClass} />
            <p className="rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-foreground">
              Your account stays recoverable for 30 days. The cancellation email has a link to reactivate it.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={confirmText !== 'DELETE MY ACCOUNT' || !password}
                onClick={() => { toast.error('Account deletion is disabled in demo mode.'); onClose(); }}
              >
                Delete my account
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── FAKE SESSIONS ── */
const MOCK_SESSIONS = [
  { id: 1, device: 'laptop', name: 'MacBook Pro', browser: 'Chrome 124', location: 'New York, US', lastActive: 'Now', isCurrent: true },
  { id: 2, device: 'phone', name: 'iPhone 15', browser: 'Safari Mobile', location: 'New York, US', lastActive: '2 hours ago', isCurrent: false },
  { id: 3, device: 'laptop', name: 'Windows PC', browser: 'Edge 123', location: 'Miami, US', lastActive: '3 days ago', isCurrent: false },
];

function DeviceIcon({ type }) {
  const Icon = type === 'phone' ? Smartphone : type === 'tablet' ? Tablet : Monitor;
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

/* ── MAIN PAGE ── */
const NAV = [{
  items: [
    { id: 'security', label: 'Login and security', icon: Lock },
    { id: 'details', label: 'Account details', icon: Shield },
    { id: 'connected', label: 'Connected accounts', icon: Globe },
    { id: 'privacy', label: 'Data and privacy', icon: Download },
    { id: 'danger', label: 'Pause or delete', icon: AlertTriangle },
  ],
}];

export default function AccountSettings() {
  const { me } = useAuth();
  const [section, setSection] = useState('security');
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
    <SettingsShell
      backTo="/settings"
      title="Account and privacy"
      subtitle="Your login, signed-in devices, connected accounts and data."
      nav={NAV}
      active={section}
      onSelect={setSection}
    >
      {section === 'security' && (
        <>
          <SettingsPanel title="Login and security">
            <div className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">Email address</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{maskEmail(user?.email)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setShowEmailForm(s => !s); setShowPasswordForm(false); }}>
                  {showEmailForm ? 'Cancel' : 'Change'}
                </Button>
              </div>
              {showEmailForm && <div className="mt-4"><EmailForm onClose={() => setShowEmailForm(false)} /></div>}
            </div>

            <div className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">Password</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Change it if anyone else might know it.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setShowPasswordForm(s => !s); setShowEmailForm(false); }}>
                  {showPasswordForm ? 'Cancel' : 'Change'}
                </Button>
              </div>
              {showPasswordForm && (
                <div className="mt-4">
                  {/* Actually update the password (this was a no-op that only toasted success). */}
                  <PasswordChange update={(next) => supabase.auth.updatePassword(next)} onDone={() => setShowPasswordForm(false)} onCancel={() => setShowPasswordForm(false)} />
                </div>
              )}
            </div>

            <SettingsRow inline label="Two-factor authentication" help="A code from your phone each time you sign in.">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Off</Badge>
                <Button variant="outline" size="sm" onClick={() => toast.info('Two-factor setup is coming soon')}>Turn on</Button>
              </div>
            </SettingsRow>
          </SettingsPanel>

          <SettingsPanel
            title="Signed-in devices"
            subtitle={`${sessions.length} ${sessions.length === 1 ? 'device' : 'devices'} signed in to your account.`}
            right={sessions.filter(s => !s.isCurrent).length > 0 && (
              <Button variant="outline" size="sm" onClick={signOutAll}>Sign out others</Button>
            )}
          >
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-3.5">
                <DeviceIcon type={s.device} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-foreground">{s.name}</p>
                    {s.isCurrent && <Badge variant="success">This device</Badge>}
                  </div>
                  <p className="text-[13px] text-muted-foreground">{s.browser} · {s.location} · {s.lastActive}</p>
                </div>
                {!s.isCurrent && (
                  <Button variant="link" size="sm" onClick={() => signOutSession(s.id)}>Sign out</Button>
                )}
              </div>
            ))}
          </SettingsPanel>
        </>
      )}

      {section === 'details' && (
        <SettingsPanel title="Account details">
          <SettingsRow inline label="Account email"><span className="text-sm font-semibold text-foreground">{user?.email || '—'}</span></SettingsRow>
          <SettingsRow inline label="Member since">
            <span className="text-sm font-semibold text-foreground">
              {user?.created_date ? new Date(user.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—'}
            </span>
          </SettingsRow>
          <SettingsRow inline label="Account ID">
            <span className="font-mono text-[13px] text-muted-foreground">{user?.id ? user.id.slice(0, 16) + '...' : '—'}</span>
          </SettingsRow>
          <SettingsRow inline label="Plan" help={user?.plan || 'Free plan'}>
            <Button asChild variant="outline" size="sm"><Link to="/subscription">Manage plan</Link></Button>
          </SettingsRow>
        </SettingsPanel>
      )}

      {section === 'connected' && (
        <SettingsPanel title="Connected accounts" subtitle="Sign-in methods, calendars and payments linked to KOACH.">
          <div>
            <SettingsGroupLabel>Sign in with</SettingsGroupLabel>
            <div className="divide-y divide-border">{[
              { name: 'Google', desc: 'Sign in with your Google account' },
              { name: 'Apple', desc: 'Sign in with your Apple ID' },
            ].map(social => (
              <SettingsRow key={social.name} inline label={social.name} help={social.desc}>
                <Button variant="outline" size="sm" onClick={() => toast.info(`${social.name} sign-in is coming soon`)}>Connect</Button>
              </SettingsRow>
            ))}</div>
          </div>
          <div>
            <SettingsGroupLabel>Calendars</SettingsGroupLabel>
            <div className="divide-y divide-border">{[
              { name: 'Google Calendar', connected: true, email: user?.email },
              { name: 'Apple Calendar', connected: false },
              { name: 'Outlook Calendar', connected: false },
            ].map(cal => (
              <SettingsRow
                key={cal.name}
                inline
                label={<span className="inline-flex items-center gap-2">{cal.name}{cal.connected && <Badge variant="success">Connected</Badge>}</span>}
                help={cal.connected && cal.email ? cal.email : undefined}
              >
                <Button variant="outline" size="sm" className={cal.connected ? 'text-destructive' : undefined}
                  onClick={() => toast.info(cal.connected ? `${cal.name} disconnected` : `${cal.name} setup is coming soon`)}>
                  {cal.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </SettingsRow>
            ))}</div>
          </div>
          <div>
            <SettingsGroupLabel>Payments</SettingsGroupLabel>
            <SettingsRow inline label="Stripe" help="How clients pay you. KOACH never holds your money.">
              <Button asChild variant="outline" size="sm"><Link to="/settings">Manage <ExternalLink /></Link></Button>
            </SettingsRow>
          </div>
        </SettingsPanel>
      )}

      {section === 'privacy' && (
        <>
          <SettingsPanel title="Your data">
            <SettingsRow label="Export everything" help="Clients, programs, messages and payment history as a ZIP file, emailed to you.">
              <div className="flex sm:justify-end">
                <Button variant="outline" onClick={() => toast.success("We'll email your data export within 24 hours")}>
                  <Download /> Download my data
                </Button>
              </div>
            </SettingsRow>
          </SettingsPanel>
          <SettingsPanel title="Privacy">
            <SettingsSwitchRow label="Public profile" help="Prospective clients can find your coach profile." checked={privacy.publicProfile} onCheckedChange={v => setPrivacy(p => ({ ...p, publicProfile: v }))} />
            <SettingsSwitchRow label="Search engine indexing" help="Google and others can list your profile." checked={privacy.searchIndex} onCheckedChange={v => setPrivacy(p => ({ ...p, searchIndex: v }))} />
            <SettingsSwitchRow label="Analytics and crash reports" help="Anonymous usage data that helps us fix problems." checked={privacy.analytics} onCheckedChange={v => setPrivacy(p => ({ ...p, analytics: v }))} />
            <SettingsSwitchRow label="Product emails" help="Occasional tips and product updates." checked={privacy.marketing} onCheckedChange={v => setPrivacy(p => ({ ...p, marketing: v }))} />
          </SettingsPanel>
        </>
      )}

      {section === 'danger' && (
        <SettingsPanel tone="danger" title="Pause or delete" subtitle="These affect every client you coach.">
          <SettingsRow inline label="Pause account" help="Temporarily deactivate. Your clients are told you are away.">
            <Button variant="outline" size="sm" onClick={() => toast.info('Pausing accounts is coming soon')}>Pause</Button>
          </SettingsRow>
          <SettingsRow inline label="Transfer account" help="Hand your clients and programs to another coach.">
            <Button variant="outline" size="sm" onClick={() => toast.info('Account transfer is coming soon')}>Transfer</Button>
          </SettingsRow>
          <SettingsRow inline label={<span className="text-destructive">Delete account</span>} help="Permanently deletes your account and all data. Cannot be undone.">
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDeleteModal(true)}>Delete</Button>
          </SettingsRow>
        </SettingsPanel>
      )}

      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
    </SettingsShell>
  );
}
