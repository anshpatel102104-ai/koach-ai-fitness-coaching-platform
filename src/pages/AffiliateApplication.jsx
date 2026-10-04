import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
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
  { value: '1k_10k', label: '1K - 10K' },
  { value: '10k_50k', label: '10K - 50K' },
  { value: '50k_100k', label: '50K - 100K' },
  { value: '100k_plus', label: '100K+' },
];

const CONTENT_OUTPUT = [
  { value: '1_4_posts', label: '1-4 posts per month' },
  { value: '5_10_posts', label: '5-10 posts per month' },
  { value: '10_20_posts', label: '10-20 posts per month' },
  { value: '20_plus_posts', label: '20+ posts per month' },
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
      toast.success('Application submitted! We\'ll review within 48 hours.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlatforms.length) {
      toast.error('Please select at least one platform');
      return;
    }
    if (!formData.website_url || !formData.audience_size || !formData.content_output_monthly) {
      toast.error('Please fill all required fields');
      return;
    }
    appMutation.mutate(formData);
  };

  // Show status if already applied
  if (existingApp && existingApp.length > 0) {
    const app = existingApp[0];
    const statusConfig = {
      pending: {
        icon: Clock,
        bg: 'bg-warning/10',
        border: 'border-warning',
        color: 'text-warning',
        title: 'Application Under Review',
        msg: 'We\'ll review your application and email you within 48 hours.',
      },
      approved: {
        icon: CheckCircle2,
        bg: 'bg-success/10',
        border: 'border-success',
        color: 'text-success',
        title: 'Application Approved! 🎉',
        msg: 'Access your affiliate dashboard to start earning.',
      },
      rejected: {
        icon: XCircle,
        bg: 'bg-destructive/10',
        border: 'border-destructive',
        color: 'text-destructive',
        title: 'Application Not Approved',
        msg: app.rejection_reason || 'We\'ll revisit as your platform grows.',
      },
    };
    const config = statusConfig[app.status];
    const Icon = config.icon;
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-card flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`max-w-md w-full rounded-3xl p-8 border-2 ${config.bg} ${config.border}`}>
          <Icon className={`w-16 h-16 mx-auto mb-4 ${config.color}`} />
          <h1 className={`text-2xl font-black text-center mb-2 ${config.color}`}>{config.title}</h1>
          <p className={`text-center ${config.color.replace('text-', 'text-opacity-70')}`}>{config.msg}</p>
          {app.status === 'approved' && (
            <a href="/affiliate-dashboard"
              className="block mt-6 py-3 rounded-xl font-bold text-primary-foreground text-center"
              style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
              Go to Dashboard →
            </a>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Hero */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="py-16 px-4 text-center"
        style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-ai) 100%)' }}>
        <h1 className="text-white font-black text-4xl mb-4">Partner with KOACH AI and earn recurring commissions 💰</h1>
        <p className="text-white/80 text-lg max-w-2xl mx-auto">Join our affiliate program and get paid every month for every coach you refer</p>
      </motion.div>

      {/* Benefits */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {[
            { emoji: '💵', title: '30% Recurring', desc: 'Commission on every coach' },
            { emoji: '🏦', title: 'Monthly Payouts', desc: 'Via Stripe Connect' },
            { emoji: '👔', title: 'Dedicated Manager', desc: 'Personal support (Gold+)' },
            { emoji: '🎨', title: 'Marketing Assets', desc: 'Ready-to-use content' },
            { emoji: '📊', title: 'Real-time Tracking', desc: 'Dashboard + API access' },
          ].map((b, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
              className="text-center p-4 rounded-2xl bg-muted border border-border">
              <div className="text-3xl mb-2">{b.emoji}</div>
              <p className="font-bold text-foreground text-sm">{b.title}</p>
              <p className="text-muted-foreground text-xs mt-1">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-black text-foreground mb-6">Apply to Join</h2>
        <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-2xl border border-border p-8">

          {/* Name & Email (pre-filled) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
              <input type="text" value={user?.full_name || ''} disabled className="w-full px-4 py-2 rounded-lg bg-muted text-muted-foreground" />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Email</label>
              <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-2 rounded-lg bg-muted text-muted-foreground" />
            </div>
          </div>

          {/* Website/URL */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Website or Social URL *</label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Platforms (multi-select) */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Your Platforms *</label>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatforms(p => p.includes(platform) ? p.filter(x => x !== platform) : [...p, platform])}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                    selectedPlatforms.includes(platform)
                      ? 'bg-primary border-primary text-white'
                      : 'bg-card border-border text-foreground hover:border-primary'
                  }`}>
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Audience size */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Audience Size *</label>
            <select
              value={formData.audience_size}
              onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required>
              <option value="">Select...</option>
              {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Promotion plan */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">How will you promote KOACH AI? *</label>
            <textarea
              placeholder="Describe your promotion strategy..."
              value={formData.promotion_plan}
              onChange={(e) => setFormData({ ...formData, promotion_plan: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Content output */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Monthly Content Output *</label>
            <select
              value={formData.content_output_monthly}
              onChange={(e) => setFormData({ ...formData, content_output_monthly: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required>
              <option value="">Select...</option>
              {CONTENT_OUTPUT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Used KOACH AI */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Have you used KOACH AI?</label>
            <div className="flex gap-4">
              {[true, false].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormData({ ...formData, has_used_koachai: val })}
                  className={`px-6 py-2 rounded-lg font-bold border transition-all ${
                    formData.has_used_koachai === val
                      ? 'bg-primary border-primary text-white'
                      : 'bg-card border-border text-foreground hover:border-primary'
                  }`}>
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={appMutation.isPending}
            className="w-full py-3 rounded-xl font-black text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            {appMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </button>

          <p className="text-center text-xs text-muted-foreground">⏱ Applications reviewed within 48 hours</p>
        </form>
      </div>
    </div>
  );
}