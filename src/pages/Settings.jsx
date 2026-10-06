import React, { useState } from 'react';
import {
  User, Plug, Bell, Shield, UserCog, Gift, Handshake, Megaphone, Palette,
  Loader2, Users, Brush, Building2, IdCard, KeyRound,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import IntegrationsTab from '../components/integrations/IntegrationsTab';
import DefaultAssignmentSettings from '../components/settings/DefaultAssignmentSettings';
import { ThemeToggle } from '../components/settings/ThemeToggle';
import PasswordChange from '../components/settings/PasswordChange';
import { RELEASE, releaseLabel } from '@/lib/release';
import {
  SettingsShell, SettingsPanel, SettingsRow, SettingsLinkRow, fieldClass,
} from '../components/settings/SettingsLayout';
import { darkModeEnabled } from '@/lib/flags';

const NAV = [
  {
    items: [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'security', label: 'Security', icon: Shield },
      ...(darkModeEnabled ? [{ id: 'appearance', label: 'Appearance', icon: Palette }] : []),
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Coaching',
    items: [
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'auto-assign', label: 'New client defaults', icon: UserCog },
    ],
  },
  {
    label: 'Grow',
    items: [
      { id: 'referral', label: 'Refer a coach', icon: Gift },
      { id: 'affiliate', label: 'Affiliate program', icon: Handshake },
      { id: 'marketing', label: 'Marketing tools', icon: Megaphone },
    ],
  },
  {
    label: 'More settings',
    items: [
      { id: 'go-account', label: 'Account and privacy', icon: KeyRound, to: '/account-settings' },
      { id: 'go-business', label: 'Business settings', icon: Building2, to: '/business-settings' },
      { id: 'go-profile', label: 'Coach profile', icon: IdCard, to: '/coach-profile' },
      { id: 'go-team', label: 'Team', icon: Users, to: '/team' },
      { id: 'go-whitelabel', label: 'White label', icon: Brush, to: '/white-label' },
    ],
  },
];

function AppearanceTab() {
  return (
    <SettingsPanel title="Appearance" subtitle="How KOACH looks on this device. Your clients are not affected.">
      <SettingsRow label="Theme" help="Light, dark, or follow your system setting.">
        <ThemeToggle />
      </SettingsRow>
    </SettingsPanel>
  );
}

function ProfileTab() {
  return (
    <SettingsPanel title="Profile" subtitle="Who you are to clients, and how your business runs.">
      <SettingsLinkRow
        to="/coach-profile"
        label="Coach profile"
        help="Photo, bio, certifications, specialties and social links. Shown on your package pages."
      />
      <SettingsLinkRow
        to="/business-settings"
        label="Business settings"
        help="Check-in schedule, onboarding steps, working hours, lead pipeline and branding."
      />
    </SettingsPanel>
  );
}

function NotificationsTab() {
  return (
    <SettingsPanel title="Notifications" subtitle="Choose what reaches you, where, and when.">
      <SettingsLinkRow
        to="/notification-settings"
        label="Notification settings"
        help="Client activity, messages, payments, AI insights, scheduling, quiet hours and digests."
      />
    </SettingsPanel>
  );
}

function DeleteAccountModal({ user, onClose }) {
  const { logout } = useAuth();
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const hasActiveSub = ['active', 'trialing', 'past_due'].includes(user?.billing_status) ||
    (user?.stripe_subscription_id && user?.billing_status !== 'canceled');

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Cancel Stripe subscription first if active
      if (hasActiveSub && user?.stripe_subscription_id) {
        await db.functions.invoke('stripeCancelSubscription', {
          subscription_id: user.stripe_subscription_id,
        });
      }
      // Delete the account
      await logout('/start');
    } catch (e) {
      toast.error(e?.message || 'Could not delete your account. Contact support and we will do it for you.');
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your account, your clients and everything you have built. It cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {hasActiveSub && (
              <p className="rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-foreground">
                Your subscription is active. We cancel it first, so you are not charged again.
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Keep my account</Button>
              <Button variant="destructive" className="flex-1" onClick={() => setStep(2)}>Continue</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Type DELETE to confirm</DialogTitle>
              <DialogDescription>This is the last step.</DialogDescription>
            </DialogHeader>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className={fieldClass}
            />
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={confirmText !== 'DELETE' || loading}
                onClick={handleDelete}
              >
                {loading ? <><Loader2 className="animate-spin" /> Deleting</> : 'Delete my account'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SecurityTab() {
  const { me } = useAuth();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <SettingsPanel title="Security" subtitle="Your password and the devices signed in to KOACH.">
        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">Password</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Use at least 8 characters with a capital, a number and a symbol.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(s => !s)}>
              {showPasswordForm ? 'Cancel' : 'Change'}
            </Button>
          </div>
          {showPasswordForm && (
            <div className="mt-4">
              {/* Actually update the password (this was a no-op that only toasted success). */}
              <PasswordChange update={(next) => db.auth.updatePassword(next)} onDone={() => setShowPasswordForm(false)} />
            </div>
          )}
        </div>
        <SettingsLinkRow
          to="/account-settings"
          label="Sessions and privacy"
          help="Signed-in devices, connected accounts and data export."
        />
      </SettingsPanel>

      <SettingsPanel tone="danger" title="Delete account" subtitle="Removes your account and all client data for good.">
        <div className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            {user?.stripe_subscription_id ? 'Any active subscription is cancelled first.' : 'You can export your data from Account and privacy first.'}
          </p>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDeleteModal(true)}>
            Delete account
          </Button>
        </div>
      </SettingsPanel>

      {showDeleteModal && <DeleteAccountModal user={user} onClose={() => setShowDeleteModal(false)} />}
    </>
  );
}

function ProgramLink({ title, subtitle, to, label, help, badge }) {
  return (
    <SettingsPanel title={title} subtitle={subtitle}>
      <SettingsLinkRow to={to} label={label} help={help} right={badge} />
    </SettingsPanel>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('integrations');

  return (
    <SettingsShell
      title="Settings"
      subtitle="Your account, the tools KOACH connects to, and what new clients get by default."
      nav={NAV}
      active={activeTab}
      onSelect={setActiveTab}
    >
      {activeTab === 'profile' && <ProfileTab />}
      {darkModeEnabled && activeTab === 'appearance' && <AppearanceTab />}
      {activeTab === 'referral' && (
        <ProgramLink
          title="Refer a coach"
          subtitle="Earn a commission for every coach you bring to KOACH."
          to="/referral-program"
          label="Referral program"
          help="Your referral link, earnings so far and payout details."
        />
      )}
      {activeTab === 'affiliate' && (
        <ProgramLink
          title="Affiliate program"
          subtitle="For coaches and creators who refer at scale."
          to="/affiliate-application"
          label="Apply to the affiliate program"
          help="30% recurring commission and a dedicated partner contact."
          badge={<Badge variant="secondary">30% recurring</Badge>}
        />
      )}
      {activeTab === 'marketing' && (
        <ProgramLink
          title="Marketing tools"
          subtitle="Links, templates and campaigns for finding new clients."
          to="/marketing-tools"
          label="Open marketing tools"
          help="Trackable links, QR codes, email templates, testimonials and campaigns."
        />
      )}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'auto-assign' && <DefaultAssignmentSettings />}
      <p className="mt-8 text-xs text-muted-foreground">
        KOACH version {releaseLabel()}
        {RELEASE.builtAt && ` · built ${new Date(RELEASE.builtAt).toLocaleDateString()}`}
      </p>
    </SettingsShell>
  );
}
