import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Shield, Globe, Download, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PasswordChange from '@/components/settings/PasswordChange';
import { SettingsShell, SettingsPanel, SettingsRow, fieldClass } from '@/components/settings/SettingsLayout';
import { userMessage } from '@/lib/appErrors';
import { exportMyData } from '@/lib/dataExport';

/*
 * Account and privacy. Every control on this page does what it says. (It used
 * to show invented devices, a calendar that always read "Connected", privacy
 * switches stored nowhere, an email change and a data export that did nothing,
 * and a delete flow that ended in "disabled in demo mode".)
 */

const SUPPORT_EMAIL = 'support@koachai.net';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return user.slice(0, 2) + '***@' + domain;
}

function EmailForm({ currentEmail, onClose }) {
  const [newEmail, setNewEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return toast.error('Enter a valid email address.');
    if (next !== confirm.trim().toLowerCase()) return toast.error('The two email addresses do not match.');
    if (next === (currentEmail || '').toLowerCase()) return toast.error('That is already your email address.');
    setSaving(true);
    try {
      await supabase.auth.requestEmailChange(next);
      toast.success(`Check ${next} for a confirmation link. Your email changes once you click it.`);
      onClose();
    } catch (err) {
      toast.error(userMessage(err, "Couldn't start the email change. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-secondary p-4">
      <label className="block">
        <span className="sr-only">New email address</span>
        <input type="email" autoComplete="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" className={fieldClass} required />
      </label>
      <label className="block">
        <span className="sr-only">Confirm new email</span>
        <input type="email" autoComplete="email" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new email" className={fieldClass} required />
      </label>
      <p className="text-[13px] text-muted-foreground">We send a confirmation link to the new address. Nothing changes until you click it.</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Update email</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

const NAV = [{
  items: [
    { id: 'security', label: 'Login and security', icon: Lock },
    { id: 'details', label: 'Account details', icon: Shield },
    { id: 'connected', label: 'Connected accounts', icon: Globe },
    { id: 'privacy', label: 'Your data', icon: Download },
    { id: 'danger', label: 'Delete account', icon: AlertTriangle },
  ],
}];

export default function AccountSettings() {
  const { me } = useAuth();
  const [section, setSection] = useState('security');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const signOutOthers = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOutOtherSessions();
      toast.success('Signed out of every other browser and device.');
    } catch (err) {
      toast.error(userMessage(err, "Couldn't sign out other devices. Please try again."));
    } finally {
      setSigningOut(false);
    }
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const out = await exportMyData(user);
      toast.success(out.errors ? 'Export downloaded. A few sections could not be read; see "errors" in the file.' : 'Your data export has downloaded.');
    } catch (err) {
      toast.error(userMessage(err, "Couldn't build the export. Please try again."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <SettingsShell
      backTo="/settings"
      title="Account and privacy"
      subtitle="Your login, devices and data."
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
              {showEmailForm && <div className="mt-4"><EmailForm currentEmail={user?.email} onClose={() => setShowEmailForm(false)} /></div>}
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
                  <PasswordChange update={(next) => supabase.auth.updatePassword(next)} onDone={() => setShowPasswordForm(false)} onCancel={() => setShowPasswordForm(false)} />
                </div>
              )}
            </div>
          </SettingsPanel>

          <SettingsPanel title="Other devices" subtitle="Lost a phone or used a shared computer? Sign out everywhere except here.">
            <SettingsRow inline label="Sign out of other devices" help="Every other browser and device has to sign in again.">
              <Button variant="outline" size="sm" onClick={signOutOthers} disabled={signingOut}>
                {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out others
              </Button>
            </SettingsRow>
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
            <span className="font-mono text-[13px] text-muted-foreground">{user?.id || '—'}</span>
          </SettingsRow>
          <SettingsRow inline label="Plan">
            <Button asChild variant="outline" size="sm"><Link to="/subscription">Manage plan</Link></Button>
          </SettingsRow>
        </SettingsPanel>
      )}

      {section === 'connected' && (
        <SettingsPanel title="Connected accounts" subtitle="Calendars, video calls and payments.">
          <SettingsRow inline label="Calendars, Zoom and Stripe" help="Connect or disconnect them from Integrations.">
            <Button asChild variant="outline" size="sm"><Link to="/settings">Open integrations</Link></Button>
          </SettingsRow>
        </SettingsPanel>
      )}

      {section === 'privacy' && (
        <SettingsPanel title="Your data">
          <SettingsRow label="Export everything" help="Clients, programs, check-ins, messages, invoices and payments, as one JSON file downloaded now.">
            <div className="flex sm:justify-end">
              <Button variant="outline" onClick={runExport} disabled={exporting}>
                {exporting ? <Loader2 className="animate-spin" /> : <Download />} {exporting ? 'Preparing…' : 'Download my data'}
              </Button>
            </div>
          </SettingsRow>
        </SettingsPanel>
      )}

      {section === 'danger' && (
        <SettingsPanel tone="danger" title="Delete account" subtitle="This affects every client you coach.">
          <SettingsRow
            label={<span className="text-destructive">Delete account and all data</span>}
            help="Download your data first. We cancel your subscription, then permanently delete your account, clients, programs, messages and check-ins."
          >
            <div className="flex sm:justify-end">
              <Button asChild variant="outline" className="text-destructive">
                <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my KOACH account')}&body=${encodeURIComponent(`Please delete my KOACH account (${user?.email || ''}).`)}`}>
                  Request deletion
                </a>
              </Button>
            </div>
          </SettingsRow>
        </SettingsPanel>
      )}
    </SettingsShell>
  );
}
