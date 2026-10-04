import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

const OFFER_TYPES = [
  { value: 'discount_percent', label: 'X% Off' },
  { value: 'discount_dollar', label: '$X Off' },
  { value: 'free_week', label: 'Free Week' },
  { value: 'bonus_service', label: 'Bonus Service' },
];

export default function CampaignBuilder({ coachId }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    campaign_name: '',
    campaign_slug: '',
    start_date: '',
    end_date: '',
    offer_type: 'discount_percent',
    offer_value: 0,
    referrer_bonus: 0,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketing-campaigns', coachId],
    queryFn: () => db.entities.MarketingCampaign.filter({ coach_id: coachId }, '-created_at'),
    enabled: !!coachId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const slug = data.campaign_slug || data.campaign_name.toLowerCase().replace(/\s+/g, '-');
      return db.entities.MarketingCampaign.create({
        ...data,
        coach_id: coachId,
        campaign_slug: slug,
        campaign_url: `koachai.com/campaign/${slug}`,
        status: 'draft',
      });
    },
    onSuccess: () => {
      toast.success('Campaign created');
      setNewCampaign({
        campaign_name: '',
        campaign_slug: '',
        start_date: '',
        end_date: '',
        offer_type: 'discount_percent',
        offer_value: 0,
        referrer_bonus: 0,
      });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', coachId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.MarketingCampaign.delete(id),
    onSuccess: () => {
      toast.success('Campaign deleted');
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', coachId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newCampaign.campaign_name || !newCampaign.start_date || !newCampaign.end_date) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate(newCampaign);
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Campaign URL copied');
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const otherCampaigns = campaigns.filter(c => c.status !== 'active');

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-foreground">Referral Campaigns</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary">
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg bg-muted border border-border space-y-4">
            <input
              type="text"
              placeholder="Campaign name"
              value={newCampaign.campaign_name}
              onChange={(e) => setNewCampaign({ ...newCampaign, campaign_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />

            <input
              type="text"
              placeholder="Campaign slug (auto-generated)"
              value={newCampaign.campaign_slug}
              onChange={(e) => setNewCampaign({ ...newCampaign, campaign_slug: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Start Date</label>
                <input
                  type="date"
                  value={newCampaign.start_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">End Date</label>
                <input
                  type="date"
                  value={newCampaign.end_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Offer Type</label>
                <select
                  value={newCampaign.offer_type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, offer_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {OFFER_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Value</label>
                <input
                  type="number"
                  value={newCampaign.offer_value}
                  onChange={(e) => setNewCampaign({ ...newCampaign, offer_value: parseFloat(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">Referrer Bonus (optional)</label>
              <input
                type="number"
                value={newCampaign.referrer_bonus}
                onChange={(e) => setNewCampaign({ ...newCampaign, referrer_bonus: parseFloat(e.target.value) })}
                placeholder="Extra bonus"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary disabled:opacity-50">
                Create
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg bg-border text-foreground text-sm font-bold hover:bg-border">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Active campaigns */}
        {activeCampaigns.length > 0 && (
          <>
            <h3 className="font-bold text-foreground mb-3">Active</h3>
            <div className="space-y-3 mb-6">
              {activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 rounded-lg bg-success/10 border-2 border-success">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-foreground">{campaign.campaign_name}</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-success text-success">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Clicks: {campaign.clicks || 0} | Signups: {campaign.signups || 0} | Revenue: ${campaign.revenue?.toFixed(2) || '0.00'}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleCopy(campaign.campaign_url)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button onClick={() => deleteMutation.mutate(campaign.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Other campaigns */}
        {otherCampaigns.length > 0 && (
          <>
            <h3 className="font-bold text-foreground mb-3">Other</h3>
            <div className="space-y-2">
              {otherCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-3 rounded-lg bg-muted border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{campaign.campaign_name}</p>
                    <p className="text-xs text-muted-foreground">{campaign.status}</p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(campaign.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {campaigns.length === 0 && !showCreateForm && (
          <p className="text-center text-muted-foreground py-8">No campaigns yet. Create one to get started!</p>
        )}
      </div>
    </div>
  );
}