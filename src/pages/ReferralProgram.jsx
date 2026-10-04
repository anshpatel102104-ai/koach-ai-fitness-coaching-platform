import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const TIERS = [
  { min: 0, max: 5, rate: 50, emoji: '🌱' },
  { min: 6, max: 10, rate: 75, emoji: '🚀' },
  { min: 11, max: Infinity, rate: 100, emoji: '⭐' },
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

export default function ReferralProgram({ user }) {
  const [expandedTerms, setExpandedTerms] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: program } = useQuery({
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
    toast.success('Copied! ✓');
  };

  const handleShare = (platform) => {
    const link = program?.referral_link || '';
    const message = `Hey! I use KOACH AI to run my entire online coaching business. Use my link to get started: ${link}`;
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

  return (
    <div className="pb-20 bg-gradient-to-b from-card to-muted">
      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-6 pb-8 rounded-b-3xl text-primary-foreground text-center"
        style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-ai) 100%)', boxShadow: '0 4px 24px color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
        <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">Earn Passive Income</p>
        <h1 className="text-3xl font-black mb-2">Earn with every coach you refer 💰</h1>
        <p className="text-white/80 text-sm mb-4">Get $50 for every coach who signs up and stays for 30 days</p>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {TIERS.map(t => (
            <span key={t.min} className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'color-mix(in srgb, white 15%, transparent)', border: '1px solid color-mix(in srgb, white 30%, transparent)' }}>
              {t.emoji} {t.min}-{t.max}: ${t.rate}/ref
            </span>
          ))}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="px-4 mt-6 grid grid-cols-2 gap-3">
        {[
          { label: 'Total Earned', value: `$${program?.total_earned || 0}`, color: 'var(--tc-success)', icon: '$' },
          { label: 'Pending', value: `$${program?.pending_balance || 0}`, color: 'var(--tc-warning)', icon: '⏳' },
          { label: 'This Month', value: `$${program?.month_earnings || 0}`, color: 'var(--tc-primary)', icon: '📊' },
          { label: 'Referrals', value: program?.total_referrals || 0, color: 'var(--tc-ai)', icon: '👥' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl p-4" style={{ boxShadow: '0 2px 12px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
            <p className="text-muted-foreground text-xs font-semibold mb-1">{stat.label}</p>
            <p className="text-foreground font-black text-xl">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Referral Links */}
      <div className="px-4 mt-6">
        <h2 className="text-foreground font-black text-lg mb-3">Your Referral Links</h2>
        <div className="bg-card rounded-2xl p-4 space-y-4" style={{ boxShadow: '0 2px 12px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
          {/* Referral Link */}
          <div>
            <p className="text-muted-foreground text-xs font-bold mb-2">Full Link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl text-sm font-mono text-foreground bg-muted border border-border truncate">
                {program?.referral_link || 'Loading...'}
              </div>
              <button onClick={() => handleCopy(program?.referral_link || '')}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--tc-accent)', border: '1px solid var(--tc-accent)' }}>
                <Copy className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>

          {/* Referral Code */}
          <div>
            <p className="text-muted-foreground text-xs font-bold mb-2">Code</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl text-lg font-black text-foreground bg-accent border border-primary text-center">
                {program?.referral_code || 'LOADING'}
              </div>
              <button onClick={() => handleCopy(program?.referral_code || '')}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--tc-accent)', border: '1px solid var(--tc-accent)' }}>
                <Copy className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Options */}
      <div className="px-4 mt-6">
        <h2 className="text-foreground font-black text-lg mb-3">Share & Earn</h2>
        <div className="bg-card rounded-2xl p-4" style={{ boxShadow: '0 2px 12px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '🐦', label: 'Twitter', key: 'twitter' },
              { icon: '📘', label: 'Facebook', key: 'facebook' },
              { icon: '💼', label: 'LinkedIn', key: 'linkedin' },
              { icon: '📧', label: 'Email', key: 'email' },
              { icon: '💬', label: 'WhatsApp', key: 'whatsapp' },
              { icon: '📋', label: 'Copy', key: 'copy' },
            ].map(s => (
              <button key={s.key}
                onClick={() => s.key === 'copy' ? handleCopy(`Hey! I use KOACH AI to run my entire online coaching business. Programs, nutrition plans, check-ins, payments — all in one place. Use my link to get started: ${program?.referral_link}`) : handleShare(s.key)}
                className="py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-bold transition-all hover:bg-muted"
                style={{ border: '1px solid var(--tc-muted)' }}>
                <span className="text-lg">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      {nextTier && (
        <div className="px-4 mt-6">
          <div className="bg-card rounded-2xl p-5" style={{ boxShadow: '0 2px 12px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-foreground font-bold">Next Tier Unlocking</p>
              <span className="text-sm font-bold text-muted-foreground">{nextTier.min - (program?.total_referrals || 0)} more referrals</span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <motion.div animate={{ width: `${progressToNext * 100}%` }} transition={{ duration: 0.5 }}
                className="h-full" style={{ background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-ai))' }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Unlock {nextTier.emoji} ${nextTier.rate}/referral tier</p>
          </div>
        </div>
      )}

      {/* Referrals List */}
      <div className="px-4 mt-6">
        <h2 className="text-foreground font-black text-lg mb-3">Referral Tracker</h2>
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {['all', 'signed_up', 'active_30_days', 'paid', 'expired'].map(status => (
            <button key={status}
              onClick={() => setFilterStatus(status)}
              className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
              style={{
                background: filterStatus === status ? 'var(--tc-primary)' : 'var(--tc-muted)',
                color: filterStatus === status ? 'white' : 'var(--tc-muted-foreground)',
              }}>
              {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filteredReferrals.map(ref => (
            <motion.div key={ref.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-4" style={{ boxShadow: '0 1px 4px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-foreground font-bold text-sm">{ref.referred_coach_name}</p>
                  <p className="text-muted-foreground text-xs">{maskEmail(ref.referred_coach_email)}</p>
                  <p className="text-muted-foreground text-[10px] mt-1">{new Date(ref.date_referred).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-foreground font-black text-sm">${ref.commission_amount}</p>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full inline-block mt-1"
                    style={{
                      background: { signed_up: 'var(--tc-accent)', active_30_days: 'var(--tc-success)', paid: 'var(--tc-muted)', expired: 'var(--tc-destructive)' }[ref.status],
                      color: { signed_up: 'var(--tc-primary)', active_30_days: 'var(--tc-success)', paid: 'var(--tc-foreground)', expired: 'var(--tc-destructive)' }[ref.status],
                    }}>
                    {ref.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payout Section */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="text-foreground font-black text-lg mb-3">Payout</h2>
        <div className="bg-card rounded-2xl p-5 space-y-4" style={{ boxShadow: '0 2px 12px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
          <div>
            <p className="text-muted-foreground text-xs font-bold mb-1">Available Balance</p>
            <p className="text-foreground font-black text-2xl">${program?.pending_balance || 0}</p>
            <p className="text-muted-foreground text-xs mt-1">Minimum payout: $50</p>
          </div>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={!program || program.pending_balance < 50}
            className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: program?.pending_balance >= 50 ? 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' : 'var(--tc-muted-foreground)' }}>
            Request Payout
          </button>
        </div>

        {/* Payout History */}
        <div className="mt-6">
          <h3 className="text-foreground font-bold text-base mb-3">Payout History</h3>
          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p.id} className="bg-card rounded-xl p-3 flex items-center justify-between text-sm"
                style={{ boxShadow: '0 1px 4px color-mix(in srgb, black 5%, transparent)', border: '1px solid var(--tc-muted)' }}>
                <div>
                  <p className="text-foreground font-bold">${p.amount}</p>
                  <p className="text-muted-foreground text-xs">{new Date(p.requested_date).toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: p.status === 'paid' ? 'var(--tc-success)' : 'var(--tc-warning)', color: p.status === 'paid' ? 'var(--tc-success)' : 'var(--tc-warning)' }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="px-4 pb-6">
        <button onClick={() => setExpandedTerms(!expandedTerms)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border"
          style={{ boxShadow: '0 1px 4px color-mix(in srgb, black 5%, transparent)' }}>
          <p className="font-bold text-foreground text-sm">Referral Program Terms</p>
          {expandedTerms ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedTerms && (
          <div className="mt-2 bg-card rounded-xl p-4 text-xs text-muted-foreground space-y-2 border border-border">
            <p>• Referred coach must sign up using your unique link</p>
            <p>• Must remain active for 30 days to earn commission</p>
            <p>• Commissions paid after 30-day retention period</p>
            <p>• No self-referrals or fraudulent activity</p>
            <p>• KOACH AI reserves right to modify program terms</p>
            <a href="/terms" className="text-primary font-bold">View full terms →</a>
          </div>
        )}
      </div>
    </div>
  );
}