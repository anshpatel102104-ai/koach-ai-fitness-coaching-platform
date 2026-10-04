import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Link as LinkIcon, Mail, MessageSquare, TrendingUp, Zap } from 'lucide-react';
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
    { id: 'links', label: 'Links & QR Codes', icon: LinkIcon },
    { id: 'email', label: 'Email Templates', icon: Mail },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { id: 'campaigns', label: 'Campaigns', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-card">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-black text-foreground">Marketing Tools</h1>
          <p className="text-muted-foreground mt-1">Everything you need to grow your coaching business</p>
          
          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-accent border border-primary">
              <p className="text-xs text-primary font-bold">CLICKS THIS MONTH</p>
              <p className="text-2xl font-black text-primary mt-1">{marketingStats?.monthlyClicks || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success">
              <p className="text-xs text-success font-bold">TESTIMONIALS</p>
              <p className="text-2xl font-black text-success mt-1">{marketingStats?.testimonialCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-ai/10 border border-ai">
              <p className="text-xs text-ai font-bold">ACTIVE CAMPAIGNS</p>
              <p className="text-2xl font-black text-ai mt-1">{marketingStats?.campaignCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-card border-b border-border sticky top-[130px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-4 font-bold border-b-2 transition-colors whitespace-nowrap ${
                    activeSection === section.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'links' && (
          <div className="space-y-8">
            <MarketingLinksSection coachId={user?.id} />
            <QRCodeGenerator coachId={user?.id} />
          </div>
        )}
        {activeSection === 'email' && <EmailTemplateLibrary coachId={user?.id} />}
        {activeSection === 'testimonials' && <TestimonialCollector coachId={user?.id} />}
        {activeSection === 'campaigns' && <CampaignBuilder coachId={user?.id} />}
        {activeSection === 'analytics' && <MarketingAnalytics coachId={user?.id} />}
      </div>
    </div>
  );
}