import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Page, PageHeader, Panel, Stat, Segmented } from '@/components/kit';
import MarketingLinksSection from '@/components/marketing/MarketingLinksSection';
import QRCodeGenerator from '@/components/marketing/QRCodeGenerator';
import EmailTemplateLibrary from '@/components/marketing/EmailTemplateLibrary';
import TestimonialCollector from '@/components/marketing/TestimonialCollector';
import CampaignBuilder from '@/components/marketing/CampaignBuilder';
import MarketingAnalytics from '@/components/marketing/MarketingAnalytics';

export default function MarketingTools() {
  const { me } = useAuth();
  const [activeSection, setActiveSection] = useState('links');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => me(),
  });

  const { data: marketingStats } = useQuery({
    queryKey: ['marketing-stats', user?.id],
    queryFn: async () => {
      const links = await db.entities.MarketingLink.filter({ coach_id: user.id });
      const testimonials = await db.entities.Testimonial.filter({ coach_id: user.id });
      const campaigns = await db.entities.MarketingCampaign.filter({ coach_id: user.id });
      
      const monthStart = new Date();
      monthStart.setDate(1);
      
      const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
      const monthlyClicks = links
        .filter(l => new Date(l.created_at) >= monthStart)
        .reduce((sum, l) => sum + (l.clicks || 0), 0);
      
      return { totalClicks, monthlyClicks, testimonialCount: testimonials.length, campaignCount: campaigns.length };
    },
    enabled: !!user?.id,
  });

  const SECTIONS = [
    { value: 'links', label: 'Links and QR codes' },
    { value: 'email', label: 'Email templates' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'campaigns', label: 'Campaigns' },
    { value: 'analytics', label: 'Analytics' },
  ];

  const monthly = marketingStats?.monthlyClicks || 0;

  return (
    <Page>
      <PageHeader
        title="Marketing"
        subtitle={monthly
          ? `Your links were clicked ${monthly.toLocaleString()} ${monthly === 1 ? 'time' : 'times'} this month.`
          : 'Tracked links, QR codes, email templates and testimonials in one place.'}
      />

      <Panel className="grid grid-cols-3 gap-px overflow-hidden bg-border mb-5 [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Clicks this month" value={monthly.toLocaleString()} sub={`${(marketingStats?.totalClicks || 0).toLocaleString()} all time`} />
        <Stat label="Testimonials" value={marketingStats?.testimonialCount || 0} />
        <Stat label="Campaigns" value={marketingStats?.campaignCount || 0} />
      </Panel>

      <Segmented className="mb-5" options={SECTIONS} value={activeSection} onChange={setActiveSection} />

      {activeSection === 'links' && (
        <div className="space-y-5">
          <MarketingLinksSection coachId={user?.id} />
          <QRCodeGenerator coachId={user?.id} />
        </div>
      )}
      {activeSection === 'email' && <EmailTemplateLibrary coachId={user?.id} />}
      {activeSection === 'testimonials' && <TestimonialCollector coachId={user?.id} />}
      {activeSection === 'campaigns' && <CampaignBuilder coachId={user?.id} />}
      {activeSection === 'analytics' && <MarketingAnalytics coachId={user?.id} />}
    </Page>
  );
}
