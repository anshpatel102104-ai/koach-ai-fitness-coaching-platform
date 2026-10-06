import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, PanelHeader, EmptyState } from '@/components/kit';
import { selectClass } from './MarketingLinksSection';
import { toast } from 'sonner';

const OFFER_TYPES = [
  { value: 'discount_percent', label: 'Percent off' },
  { value: 'discount_dollar', label: 'Dollars off' },
  { value: 'free_week', label: 'Free week' },
  { value: 'bonus_service', label: 'Bonus service' },
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
      toast.error('Add a name and both dates');
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

  const set = (k, v) => setNewCampaign({ ...newCampaign, [k]: v });

  const Row = ({ campaign }) => {
    const active = campaign.status === 'active';
    return (
      <li className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-foreground truncate">{campaign.campaign_name}</p>
            <Badge variant={active ? 'success' : 'secondary'} className="capitalize">{campaign.status || 'draft'}</Badge>
          </div>
          <p className="text-[13px] text-muted-foreground font-mono truncate mt-0.5">{campaign.campaign_url}</p>
          {active && (
            <p className="text-[13px] text-muted-foreground mt-1">
              {campaign.clicks || 0} clicks · {campaign.signups || 0} sign-ups · ${campaign.revenue?.toFixed(2) || '0.00'} revenue
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {active && <Button size="sm" variant="outline" onClick={() => handleCopy(campaign.campaign_url)}><Copy /> Copy link</Button>}
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(campaign.id)} aria-label={`Delete ${campaign.campaign_name}`}><Trash2 /></Button>
        </div>
      </li>
    );
  };

  return (
    <Panel>
      <PanelHeader
        title="Referral campaigns"
        subtitle="A dated offer with its own link, like a free week or 20% off for October."
        right={<Button size="sm" variant={showCreateForm ? 'outline' : 'default'} onClick={() => setShowCreateForm(!showCreateForm)}>{showCreateForm ? 'Close' : <><Plus /> New campaign</>}</Button>}
      />

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="mx-5 sm:mx-6 mb-5 p-4 rounded-lg bg-secondary grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" className="mt-1.5 bg-card" placeholder="October intake" value={newCampaign.campaign_name} onChange={(e) => set('campaign_name', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="c-slug">Link name <span className="text-muted-foreground font-normal">made from the name if empty</span></Label>
            <Input id="c-slug" className="mt-1.5 bg-card" placeholder="october-intake" value={newCampaign.campaign_slug} onChange={(e) => set('campaign_slug', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="c-start">Starts</Label>
            <Input id="c-start" type="date" className="mt-1.5 bg-card" value={newCampaign.start_date} onChange={(e) => set('start_date', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="c-end">Ends</Label>
            <Input id="c-end" type="date" className="mt-1.5 bg-card" value={newCampaign.end_date} onChange={(e) => set('end_date', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="c-offer">Offer</Label>
            <select id="c-offer" value={newCampaign.offer_type} onChange={(e) => set('offer_type', e.target.value)} className={`${selectClass} mt-1.5`}>
              {OFFER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="c-value">Value</Label>
            <Input id="c-value" type="number" className="mt-1.5 bg-card" placeholder="0" value={newCampaign.offer_value} onChange={(e) => set('offer_value', parseFloat(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="c-bonus">Bonus for the person who referred them <span className="text-muted-foreground font-normal">optional</span></Label>
            <Input id="c-bonus" type="number" className="mt-1.5 bg-card sm:w-1/2" placeholder="0" value={newCampaign.referrer_bonus} onChange={(e) => set('referrer_bonus', parseFloat(e.target.value))} />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>Create campaign</Button>
          </div>
        </form>
      )}

      {campaigns.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border px-5 sm:px-6">
          {activeCampaigns.map(c => <Row key={c.id} campaign={c} />)}
          {otherCampaigns.map(c => <Row key={c.id} campaign={c} />)}
        </ul>
      ) : !showCreateForm && (
        <EmptyState className="border-t border-border" title="No campaigns yet" body="Run one when you open new spots, so you can see where sign-ups came from." />
      )}
    </Panel>
  );
}
