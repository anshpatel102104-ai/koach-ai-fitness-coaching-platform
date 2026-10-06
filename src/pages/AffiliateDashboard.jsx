import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Panel, Segmented, EmptyState } from '@/components/kit';
import AffiliateEarningsOverview from '@/components/affiliate/AffiliateEarningsOverview';
import AffiliateCommissionStructure from '@/components/affiliate/AffiliateCommissionStructure';
import AffiliateLinksSection from '@/components/affiliate/AffiliateLinksSection';
import AffiliatePerformanceChart from '@/components/affiliate/AffiliatePerformanceChart';
import AffiliateReferralTable from '@/components/affiliate/AffiliateReferralTable';
import AffiliatePayoutCenter from '@/components/affiliate/AffiliatePayoutCenter';
import AffiliateAssetLibrary from '@/components/affiliate/AffiliateAssetLibrary';

const TIERS = {
  bronze: { min: 0, max: 10, rate: 20, label: 'Bronze' },
  silver: { min: 11, max: 25, rate: 25, label: 'Silver' },
  gold: { min: 26, max: 50, rate: 30, label: 'Gold' },
  platinum: { min: 51, max: Infinity, rate: 35, label: 'Platinum' },
};

export default function AffiliateDashboard() {
  const { me } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => me(),
  });

  const { data: affiliateProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['affiliate-profile', user?.email],
    queryFn: () => db.entities.AffiliateProfile.filter({ coach_email: user?.email }, '-created_date', 1),
    enabled: !!user?.email,
  });

  const profile = affiliateProfile?.[0];
  const tierConfig = (profile && TIERS[profile.tier]) || TIERS.bronze;
  const tierLabel = tierConfig.label;

  if (!profile) {
    return (
      <Page>
        {profileLoading || !user ? (
          <p className="text-sm text-muted-foreground">Loading your affiliate dashboard</p>
        ) : (
          <>
            <PageHeader title="Affiliate" subtitle="You don't have an affiliate account yet." />
            <Panel>
              <EmptyState
                title="Apply to the affiliate program"
                body="Earn 30% of every coach you refer, every month they stay."
                action={<Button asChild><a href="/affiliate-application">Apply</a></Button>}
              />
            </Panel>
          </>
        )}
      </Page>
    );
  }

  const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'links', label: 'Links' },
    { value: 'referrals', label: 'Referrals' },
    { value: 'payouts', label: 'Payouts' },
    { value: 'assets', label: 'Assets' },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={`${tierLabel} tier, ${tierConfig.rate}% commission`}
        title="Affiliate"
        subtitle={`${profile.active_referrals || 0} coaches are paying through your link.${profile.account_manager ? ` Your partner manager is ${profile.account_manager}.` : ''}`}
      />

      <AffiliateEarningsOverview profile={profile} />

      <Segmented className="my-5" options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <AffiliatePerformanceChart profile={profile} />
          <AffiliateCommissionStructure profile={profile} />
        </div>
      )}

      {activeTab === 'links' && <AffiliateLinksSection profile={profile} />}
      {activeTab === 'referrals' && <AffiliateReferralTable profile={profile} />}
      {activeTab === 'payouts' && <AffiliatePayoutCenter profile={profile} />}
      {activeTab === 'assets' && <AffiliateAssetLibrary tier={profile.tier} />}
    </Page>
  );
}
