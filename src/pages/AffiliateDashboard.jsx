import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp, Users, Clock, Zap, Target } from 'lucide-react';
import AffiliateEarningsOverview from '@/components/affiliate/AffiliateEarningsOverview';
import AffiliateCommissionStructure from '@/components/affiliate/AffiliateCommissionStructure';
import AffiliateLinksSection from '@/components/affiliate/AffiliateLinksSection';
import AffiliatePerformanceChart from '@/components/affiliate/AffiliatePerformanceChart';
import AffiliateReferralTable from '@/components/affiliate/AffiliateReferralTable';
import AffiliatePayoutCenter from '@/components/affiliate/AffiliatePayoutCenter';
import AffiliateAssetLibrary from '@/components/affiliate/AffiliateAssetLibrary';

const TIERS = {
  bronze: { min: 0, max: 10, rate: 20, label: 'Bronze', color: 'var(--tc-warning)' },
  silver: { min: 11, max: 25, rate: 25, label: 'Silver', color: 'var(--tc-muted-foreground)' },
  gold: { min: 26, max: 50, rate: 30, label: 'Gold', color: 'var(--tc-warning)' },
  platinum: { min: 51, max: Infinity, rate: 35, label: 'Platinum', color: 'var(--tc-primary)' },
};

export default function AffiliateDashboard() {
  const { me } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => me(),
  });

  const { data: affiliateProfile } = useQuery({
    queryKey: ['affiliate-profile', user?.email],
    queryFn: () => db.entities.AffiliateProfile.filter({ coach_email: user?.email }, '-created_date', 1),
    enabled: !!user?.email,
  });

  const profile = affiliateProfile?.[0];
  const tierConfig = profile ? TIERS[profile.tier] : TIERS.bronze;
  const tierLabel = tierConfig.label;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading affiliate dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-card">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground">Affiliate Dashboard</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ background: tierConfig.color }}>
                  {tierLabel}
                </span>
                {profile.account_manager && (
                  <span className="text-sm text-muted-foreground">Account Manager: {profile.account_manager}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Earnings Overview */}
        <AffiliateEarningsOverview profile={profile} />

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'links', label: 'Affiliate Links', icon: Zap },
            { id: 'referrals', label: 'Referrals', icon: Users },
            { id: 'payouts', label: 'Payouts', icon: Clock },
            { id: 'assets', label: 'Marketing Assets', icon: Target },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <AffiliateCommissionStructure profile={profile} />
            <AffiliatePerformanceChart profile={profile} />
          </div>
        )}

        {activeTab === 'links' && <AffiliateLinksSection profile={profile} />}
        {activeTab === 'referrals' && <AffiliateReferralTable profile={profile} />}
        {activeTab === 'payouts' && <AffiliatePayoutCenter profile={profile} />}
        {activeTab === 'assets' && <AffiliateAssetLibrary tier={profile.tier} />}

      </div>
    </div>
  );
}