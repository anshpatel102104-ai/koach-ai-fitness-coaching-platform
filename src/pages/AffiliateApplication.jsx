import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Page, PageHeader, Panel, PanelHeader } from '@/components/kit';
import { selectClass } from '@/components/marketing/MarketingLinksSection';
import { toast } from 'sonner';

const PLATFORMS = [
  'Fitness Coach',
  'Personal Trainer',
  'Fitness Influencer',
  'Content Creator',
  'Podcaster',
  'YouTuber',
  'Gym Owner',
  'Fitness Educator',
  'Other',
];

const AUDIENCE_OPTIONS = [
  { value: 'under_1k', label: 'Under 1K' },
  { value: '1k_10k', label: '1K to 10K' },
  { value: '10k_50k', label: '10K to 50K' },
  { value: '50k_100k', label: '50K to 100K' },
  { value: '100k_plus', label: '100K+' },
];

const CONTENT_OUTPUT = [
  { value: '1_4_posts', label: '1 to 4' },
  { value: '5_10_posts', label: '5 to 10' },
  { value: '10_20_posts', label: '10 to 20' },
  { value: '20_plus_posts', label: 'More than 20' },
];

export default function AffiliateApplication() {
  const { me } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [formData, setFormData] = useState({
    website_url: '',
    audience_size: '',
    promotion_plan: '',
    content_output_monthly: '',
    has_used_koachai: null,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => me(),
  });

  const { data: existingApp } = useQuery({
    queryKey: ['affiliate-app', user?.email],
    queryFn: () => db.entities.AffiliateApplication.filter({ coach_email: user?.email }, '-created_date', 1),
    enabled: !!user?.email,
  });

  const appMutation = useMutation({
    mutationFn: (data) => db.entities.AffiliateApplication.create({
      ...data,
      coach_id: user.id,
      coach_email: user.email,
      coach_name: user.full_name,
      platforms: selectedPlatforms,
    }),
    onSuccess: () => {
      toast.success('Application sent. We reply within 48 hours.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlatforms.length) {
      toast.error('Pick at least one that describes you');
      return;
    }
    if (!formData.website_url || !formData.audience_size || !formData.content_output_monthly) {
      toast.error('Fill in your link, audience size and posts a month');
      return;
    }
    appMutation.mutate(formData);
  };

  const chip = (on) => `h-10 px-4 rounded-md text-sm font-semibold border transition-colors ${on ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-input text-foreground hover:bg-accent'}`;

  // Show status if already applied
  if (existingApp && existingApp.length > 0) {
    const app = existingApp[0];
    const statusConfig = {
      pending: {
        eyebrow: 'Applied',
        title: 'We are reviewing your application',
        msg: "You'll get an email from us within 48 hours.",
      },
      approved: {
        eyebrow: 'Approved',
        title: "You're in",
        msg: 'Your affiliate dashboard has your link, assets and earnings.',
      },
      rejected: {
        eyebrow: 'Not approved',
        title: 'Not this time',
        msg: app.rejection_reason || "We'll look again as your platform grows.",
      },
    };
    const config = statusConfig[app.status] || statusConfig.pending;
    return (
      <Page className="max-w-xl">
        <Panel className="p-6 sm:p-8 mt-6">
          <p className={app.status === 'approved' ? 'text-sm font-semibold text-success' : app.status === 'rejected' ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold text-warning'}>{config.eyebrow}</p>
          <h1 className="text-[32px] text-foreground mt-1">{config.title}</h1>
          <p className="text-[15px] text-muted-foreground mt-2">{config.msg}</p>
          {app.status === 'approved' && (
            <Button asChild className="mt-6"><a href="/affiliate-dashboard">Open your dashboard</a></Button>
          )}
        </Panel>
      </Page>
    );
  }

  const BENEFITS = [
    ['30% recurring', 'on every coach you refer, every month they stay'],
    ['Monthly payouts', 'through Stripe Connect'],
    ['A partner manager', 'from Gold tier up'],
    ['Ready-made assets', 'posts, banners and email copy'],
    ['Live tracking', 'clicks, sign-ups and earnings'],
  ];

  return (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow="Affiliate program"
        title="Earn 30% of every coach you refer"
        subtitle="For coaches, trainers and creators with an audience of other coaches. You're paid every month for as long as they stay."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <Panel as="form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 order-2 lg:order-1">
          <h2 className="text-[22px] text-foreground">Apply</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" value={user?.full_name || ''} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1.5" type="email" value={user?.email || ''} disabled />
            </div>
          </div>

          <div>
            <Label htmlFor="aa-url">Website or social profile</Label>
            <Input id="aa-url" className="mt-1.5" type="url" placeholder="https://instagram.com/yourname" value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} required />
          </div>

          <div>
            <Label className="block mb-2">What describes you <span className="text-muted-foreground font-normal">pick all that apply</span></Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <button key={platform} type="button" aria-pressed={selectedPlatforms.includes(platform)}
                  onClick={() => setSelectedPlatforms(p => p.includes(platform) ? p.filter(x => x !== platform) : [...p, platform])}
                  className={chip(selectedPlatforms.includes(platform))}>
                  {platform.charAt(0) + platform.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aa-aud">Audience size</Label>
              <select id="aa-aud" value={formData.audience_size} onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })} className={`${selectClass} mt-1.5`} required>
                <option value="">Choose one</option>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="aa-out">Posts a month</Label>
              <select id="aa-out" value={formData.content_output_monthly} onChange={(e) => setFormData({ ...formData, content_output_monthly: e.target.value })} className={`${selectClass} mt-1.5`} required>
                <option value="">Choose one</option>
                {CONTENT_OUTPUT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="aa-plan">How would you promote KOACH AI?</Label>
            <Textarea id="aa-plan" className="mt-1.5" placeholder="Where you'd post, who sees it, and how often" value={formData.promotion_plan}
              onChange={(e) => setFormData({ ...formData, promotion_plan: e.target.value })} rows={4} required />
          </div>

          <div>
            <Label className="block mb-2">Have you used KOACH AI?</Label>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button key={String(val)} type="button" aria-pressed={formData.has_used_koachai === val}
                  onClick={() => setFormData({ ...formData, has_used_koachai: val })} className={chip(formData.has_used_koachai === val)}>
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <Button type="submit" disabled={appMutation.isPending}>{appMutation.isPending ? 'Sending' : 'Send application'}</Button>
            <p className="text-[13px] text-muted-foreground">We reply within 48 hours.</p>
          </div>
        </Panel>

        <Panel className="order-1 lg:order-2">
          <PanelHeader title="What you get" />
          <ul className="divide-y divide-border px-5 sm:px-6 pb-2">
            {BENEFITS.map(([title, desc]) => (
              <li key={title} className="py-3">
                <p className="text-[15px] font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Page>
  );
}
