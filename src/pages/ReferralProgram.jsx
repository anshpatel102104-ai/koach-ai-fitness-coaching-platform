import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Page, PageHeader, Panel, PanelHeader, InkPanel, Stat, Segmented, EmptyState, Initials } from '@/components/kit';

const TIERS = [
  { min: 0, max: 5, rate: 50 },
  { min: 6, max: 10, rate: 75 },
  { min: 11, max: Infinity, rate: 100 },
];

function getTierInfo(referrals) {
  return TIERS.find(t => referrals >= t.min && referrals <= t.max) || TIERS[2];
}

function getNextTier(referrals) {
  if (referrals < 6) return TIERS[1];
  if (referrals < 11) return TIERS[2];
  return null;
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name[0]}***@${domain}`;
}

export default function ReferralProgram({ user: userProp }) {
  // The route renders this page without props; fall back to the signed-in user.
  const { user: authUser } = useAuth();
  const user = userProp || authUser;
  const [expandedTerms, setExpandedTerms] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['referral-program', user?.email],
    queryFn: () => db.entities.ReferralProgram.filter({ coach_email: user?.email }, '', 1).then(r => r[0]),
    enabled: !!user?.email,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => db.entities.Referral.filter({ referrer_email: user?.email }, '-date_referred', 100),
    enabled: !!user?.email,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['referral-payouts', user?.email],
    queryFn: () => db.entities.ReferralPayout.filter({ coach_email: user?.email }, '-requested_date', 50),
    enabled: !!user?.email,
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const handleShare = (platform) => {
    const link = program?.referral_link || '';
    const message = `I use KOACH AI to run my online coaching business. Here's my link if you want to try it: ${link}`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
      email: `mailto:?subject=Check out KOACH AI&body=${encodeURIComponent(message)}`,
    };
    if (navigator.share && platform === 'whatsapp') {
      navigator.share({ text: message });
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank');
    }
  };

  const currentTier = getTierInfo(program?.total_referrals || 0);
  const nextTier = getNextTier(program?.total_referrals || 0);
  const progressToNext = nextTier
    ? ((program?.total_referrals || 0) - (nextTier.min - 1)) / (nextTier.max - nextTier.min + 1)
    : 100;

  const filteredReferrals = filterStatus === 'all' 
    ? referrals 
    : referrals.filter(r => r.status === filterStatus);

  const totalRefs = program?.total_referrals || 0;
  const shareMessage = `I use KOACH AI to run my online coaching business: programs, nutrition plans, check-ins and payments in one place. Here's my link if you want to try it: ${program?.referral_link}`;
  const SHARE = [
    { label: 'X (Twitter)', key: 'twitter' },
    { label: 'Facebook', key: 'facebook' },
    { label: 'LinkedIn', key: 'linkedin' },
    { label: 'Email', key: 'email' },
    { label: 'WhatsApp', key: 'whatsapp' },
    { label: 'Copy message', key: 'copy' },
  ];
  const STATUS_LABEL = { signed_up: 'Signed up', active_30_days: 'Active 30 days', paid: 'Paid', expired: 'Expired' };
  const STATUS_BADGE = { signed_up: 'secondary', active_30_days: 'success', paid: 'outline', expired: 'destructive' };
  const canRequest = !!program && program.pending_balance >= 50;

  return (
    <Page>
      <PageHeader
        title="Referrals"
        subtitle={`Earn $${currentTier.rate} for every coach who signs up with your link and stays 30 days. ${totalRefs} referred so far.`}
      />

      <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden bg-border mb-5 [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Total earned" value={`$${program?.total_earned || 0}`} />
        <Stat label="Waiting to pay out" value={`$${program?.pending_balance || 0}`} />
        <Stat label="This month" value={`$${program?.month_earnings || 0}`} />
        <Stat label="Coaches referred" value={totalRefs} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        <InkPanel className="lg:col-span-3" title="Your link">
          <p>Share it anywhere. Anyone who signs up through it, or enters your code, is tracked to you.</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 min-w-0 h-11 px-4 rounded-md bg-ai-foreground/10 font-mono text-sm flex items-center truncate">
              {program?.referral_link || (programLoading ? 'Loading' : 'Your link appears here once your account is set up')}
            </div>
            <Button className="h-11 bg-ai-foreground text-ai hover:bg-ai-foreground/90" onClick={() => handleCopy(program?.referral_link || '')}>
              <Copy /> Copy
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-ai-foreground/70">Code</span>
            <span className="num text-xl tracking-wide">{program?.referral_code || '—'}</span>
            <button onClick={() => handleCopy(program?.referral_code || '')} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">Copy code</button>
          </div>
          <div className="mt-5 pt-4 border-t border-ai-foreground/15 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {SHARE.map(sh => (
              <button key={sh.key} onClick={() => sh.key === 'copy' ? handleCopy(shareMessage) : handleShare(sh.key)}
                className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                {sh.label}
              </button>
            ))}
          </div>
        </InkPanel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Rates" subtitle="Your rate goes up as you refer more coaches." />
          <ul className="divide-y divide-border px-5 sm:px-6">
            {TIERS.map(t => {
              const current = t === currentTier;
              return (
                <li key={t.min} className="flex items-center justify-between py-3">
                  <span className={current ? 'text-[15px] font-semibold text-foreground' : 'text-[15px] text-foreground/80'}>
                    {t.max === Infinity ? `${t.min}+ referrals` : `${t.min} to ${t.max} referrals`}
                    {current && <span className="text-[13px] font-medium text-muted-foreground ml-2">You are here</span>}
                  </span>
                  <span className="num text-lg">${t.rate}</span>
                </li>
              );
            })}
          </ul>
          {nextTier && (
            <div className="px-5 sm:px-6 py-4 border-t border-border">
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progressToNext * 100))}%` }} />
              </div>
              <p className="text-[13px] text-muted-foreground mt-2">
                {nextTier.min - totalRefs} more to reach ${nextTier.rate} per referral.
              </p>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mb-5">
        <PanelHeader
          title="Coaches you referred"
          right={null}
        />
        <div className="px-5 sm:px-6 pb-3">
          <Segmented size="sm" value={filterStatus} onChange={setFilterStatus}
            options={['all', 'signed_up', 'active_30_days', 'paid', 'expired'].map(st => ({ value: st, label: st === 'all' ? 'All' : STATUS_LABEL[st] }))} />
        </div>
        {filteredReferrals.length === 0 ? (
          <EmptyState className="border-t border-border" title="Nobody here yet" body="Coaches who use your link will show up here as they sign up." />
        ) : (
          <ul className="divide-y divide-border border-t border-border px-5 sm:px-6">
            {filteredReferrals.map(ref => (
              <li key={ref.id} className="flex items-center gap-3 py-3">
                <Initials name={ref.referred_coach_name || ''} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{ref.referred_coach_name}</p>
                  <p className="text-[13px] text-muted-foreground truncate">
                    {ref.referred_coach_email ? maskEmail(ref.referred_coach_email) : ''}{ref.date_referred ? `, ${new Date(ref.date_referred).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[ref.status] || 'secondary'} className="hidden sm:inline-flex">{STATUS_LABEL[ref.status] || String(ref.status || '').replace(/_/g, ' ')}</Badge>
                <span className="num text-lg w-16 text-right">${ref.commission_amount}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Panel>
          <PanelHeader title="Payout" />
          <div className="px-5 sm:px-6 pb-5">
            <Stat label="Available" value={`$${program?.pending_balance || 0}`} size="lg" sub="You can request a payout from $50." />
            <Button className="mt-4 w-full sm:w-auto" onClick={() => setShowPayoutModal(true)} disabled={!canRequest}>Request payout</Button>
          </div>
          {payouts.length > 0 && (
            <ul className="divide-y divide-border border-t border-border px-5 sm:px-6">
              {payouts.map(p => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="num text-lg">${p.amount}</p>
                    <p className="text-[13px] text-muted-foreground">{new Date(p.requested_date).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="capitalize">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <button onClick={() => setExpandedTerms(!expandedTerms)} className="w-full flex items-center justify-between px-5 sm:px-6 py-5 text-left" aria-expanded={expandedTerms}>
            <h2 className="text-[22px] text-foreground">Terms</h2>
            {expandedTerms ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {expandedTerms && (
            <div className="px-5 sm:px-6 pb-5 -mt-2 text-sm text-foreground/80 space-y-2">
              <p>The coach has to sign up with your link or code.</p>
              <p>They need to stay active for 30 days before you earn the commission.</p>
              <p>Commissions are paid after that 30-day period.</p>
              <p>No self-referrals. Fraud cancels earnings.</p>
              <p>KOACH AI can change these terms.</p>
              <a href="/terms" className="inline-block mt-1 font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">Read the full terms</a>
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
}
