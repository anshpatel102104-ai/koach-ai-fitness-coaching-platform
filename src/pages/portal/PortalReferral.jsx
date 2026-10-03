import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import { Copy, Share2, MessageSquare, Mail, Instagram, Twitter, Award, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalReferral({ user }) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('home'); // home | referrals | rewards
  const queryClient = useQueryClient();

  // Get client
  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-ref', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user?.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  // Get referral config
  const { data: configs = [] } = useQuery({
    queryKey: ['referral-config', myClient?.assigned_coach_id],
    queryFn: () => portalDb.entities.ReferralConfiguration.filter({ coach_id: myClient?.assigned_coach_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_coach_id,
  });
  const config = configs[0];

  // Get referrals made
  const { data: myReferrals = [] } = useQuery({
    queryKey: ['my-referrals', myClient?.id],
    queryFn: () => portalDb.entities.ClientReferral.filter({ referrer_client_id: myClient?.id }, '-date_referred', 50),
    enabled: !!myClient?.id,
  });

  // Get rewards earned
  const { data: myRewards = [] } = useQuery({
    queryKey: ['my-rewards', myClient?.id],
    queryFn: () => portalDb.entities.ClientReferralReward.filter({ client_id: myClient?.id }, '-date_earned', 50),
    enabled: !!myClient?.id,
  });

  const referralCode = `${myClient?.name?.split(' ')[0]?.toUpperCase()}-${myClient?.id?.slice(0, 5).toUpperCase()}`;
  const referralLink = `${window.location.origin}/join?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copied! ✓');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${myClient?.assigned_coach_id ? 'my coach' : 'KOACH AI'}`,
        text: `Check out KOACH AI — it's changed how I track my fitness!`,
        url: referralLink,
      });
    }
  };

  const shareOptions = [
    { icon: Instagram, label: 'Instagram Story', color: '#E1306C' },
    { icon: MessageSquare, label: 'Text Message', color: '#25D366' },
    { icon: Mail, label: 'Email', color: '#EA4335' },
    { icon: Twitter, label: 'Twitter', color: '#1DA1F2' },
  ];

  const earnedRewards = myRewards.filter(r => r.status === 'applied').length;
  const pendingRewards = myRewards.filter(r => r.status === 'pending').length;

  return (
    <div className="pb-32 bg-gradient-to-b from-card to-muted">

      {/* Header */}
      <div className="bg-card px-5 pt-12 pb-4"
        style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <h1 className="text-foreground font-black text-[28px]">Refer a Friend</h1>
      </div>

      {!config?.is_enabled ? (
        <div className="mx-5 mt-6 p-6 rounded-2xl text-center bg-muted border border-border">
          <p className="text-muted-foreground font-semibold">Your coach hasn't enabled the referral program yet.</p>
          <p className="text-muted-foreground text-sm mt-1">Check back soon or ask your coach to enable it!</p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="mx-5 mt-6 rounded-3xl p-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--ai)) 100%)', boxShadow: '0 8px 32px rgb(var(--primary) / 0.3)' }}>
            <div style={{ background: 'rgba(0,0,0,0.1)', padding: 20, borderRadius: 20 }}>
              <h2 className="text-white font-black text-3xl mb-2">Share the journey 💪</h2>
              <p className="text-white/70 text-sm mb-6">Refer a friend to our coach and earn rewards</p>
              
              <div className="bg-white/95 rounded-2xl px-4 py-3 inline-block mb-5">
                <p className="text-foreground font-black text-lg">
                  {config.reward_type === 'discount_dollar' && `$${config.reward_amount} off`}
                  {config.reward_type === 'discount_percent' && `${config.reward_amount}% off`}
                  {config.reward_type === 'free_days' && `${config.reward_amount} free days`}
                  {config.reward_type === 'custom' && config.custom_reward_text}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">for every friend who joins</p>
              </div>

              {config.referral_message && (
                <p className="text-white/60 text-xs italic">{config.referral_message}</p>
              )}
            </div>
          </div>

          {/* Referral link */}
          <div className="mx-5 mt-6 bg-card rounded-2xl p-5 border border-border"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Your referral link</p>
            
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-muted border border-border">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-transparent text-foreground text-sm font-semibold focus:outline-none"
              />
              <button onClick={handleCopyLink}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: copied ? 'rgb(var(--success))' : 'rgb(var(--accent))', color: copied ? 'white' : 'rgb(var(--primary))' }}>
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={handleShare}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'rgb(var(--primary))', color: 'white' }}>
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button onClick={() => handleCopyLink()}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-muted-foreground border border-border bg-card">
                Copy Message
              </button>
            </div>

            <p className="text-xs text-muted-foreground">Your code: <span className="font-black text-foreground">{referralCode}</span></p>
          </div>

          {/* Share options */}
          <div className="mx-5 mt-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Share on:</p>
            <div className="grid grid-cols-4 gap-2">
              {shareOptions.map(opt => (
                <button key={opt.label}
                  className="p-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95"
                  style={{ background: 'rgb(var(--muted))', border: '1px solid rgb(var(--muted))' }}>
                  <opt.icon className="w-5 h-5" style={{ color: opt.color }} />
                  <span className="text-[10px] font-bold text-foreground text-center leading-tight">{opt.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* My referrals */}
          <div className="mx-5 mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground font-black text-lg">My Referrals</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--primary))' }}>
                {myReferrals.length}
              </span>
            </div>

            {myReferrals.length === 0 ? (
              <div className="p-6 rounded-2xl text-center bg-muted border border-border">
                <p className="text-muted-foreground font-semibold">No referrals yet</p>
                <p className="text-muted-foreground text-sm mt-1">Share your link to get started!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myReferrals.map(ref => (
                  <motion.div key={ref.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-foreground font-semibold text-sm">
                        {ref.referred_name ? ref.referred_name : 'Pending'}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">{new Date(ref.date_referred).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: ref.status === 'reward_earned' ? 'rgb(var(--success))' : ref.status === 'active' ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                          color: ref.status === 'reward_earned' ? 'rgb(var(--success))' : ref.status === 'active' ? 'rgb(var(--primary))' : 'rgb(var(--muted-foreground))',
                        }}>
                        {ref.status.replace(/_/g, ' ')}
                      </span>
                      {ref.status === 'reward_earned' && <Award className="w-4 h-4 text-warning" />}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Rewards */}
          {myRewards.length > 0 && (
            <div className="mx-5 mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-black text-lg">My Rewards</h3>
                {pendingRewards > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning">
                    {pendingRewards} pending
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {myRewards.map(reward => (
                  <motion.div key={reward.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-foreground font-bold text-sm">{reward.reward_description}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {reward.status === 'applied' ? '✓ Applied to account' : 'Pending approval'}
                        </p>
                      </div>
                      {reward.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-warning/10 text-warning">Pending</span>
                      )}
                      {reward.status === 'applied' && (
                        <Gift className="w-5 h-5 text-success flex-shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}