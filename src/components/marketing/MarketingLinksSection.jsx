import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Copy, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, PanelHeader, EmptyState } from '@/components/kit';

const DESTINATION_OPTIONS = [
  { value: 'coach_profile', label: 'Your coach profile' },
  { value: 'package_page', label: 'All packages' },
  { value: 'booking', label: 'Free consultation booking' },
  { value: 'signup', label: 'KOACH AI sign-up' },
];

export const selectClass = 'w-full h-10 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function MarketingLinksSection({ coachId }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLink, setNewLink] = useState({
    link_name: '',
    destination_type: 'coach_profile',
    utm_source: '',
    utm_campaign: '',
  });

  const { data: links = [] } = useQuery({
    queryKey: ['marketing-links', coachId],
    queryFn: () => db.entities.MarketingLink.filter({ coach_id: coachId }, '-created_at'),
    enabled: !!coachId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const slug = data.link_name.toLowerCase().replace(/\s+/g, '-');
      const fullUrl = `koachai.com/coach/${coachId}/${slug}?utm_source=${data.utm_source || 'direct'}&utm_campaign=${data.utm_campaign || 'default'}`;
      return db.entities.MarketingLink.create({
        ...data,
        coach_id: coachId,
        destination_url: `https://koachai.com/coach/${coachId}`,
        full_url: fullUrl,
      });
    },
    onSuccess: () => {
      toast.success('Link created');
      setNewLink({ link_name: '', destination_type: 'coach_profile', utm_source: '', utm_campaign: '' });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['marketing-links', coachId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.MarketingLink.delete(id),
    onSuccess: () => {
      toast.success('Link deleted');
      queryClient.invalidateQueries({ queryKey: ['marketing-links', coachId] });
    },
  });

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newLink.link_name || !newLink.destination_type) {
      toast.error('Give the link a name first');
      return;
    }
    createMutation.mutate(newLink);
  };

  return (
    <Panel>
      <PanelHeader
        title="Tracked links"
        subtitle="One link per place you post, so you can see which one brings people in."
        right={<Button size="sm" variant={showCreateForm ? 'outline' : 'default'} onClick={() => setShowCreateForm(!showCreateForm)}>{showCreateForm ? 'Close' : <><Plus /> New link</>}</Button>}
      />

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="mx-5 sm:mx-6 mb-5 p-4 rounded-lg bg-secondary grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ml-name">Name</Label>
            <Input id="ml-name" className="mt-1.5 bg-card" placeholder="Instagram bio" value={newLink.link_name}
              onChange={(e) => setNewLink({ ...newLink, link_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="ml-dest">Goes to</Label>
            <select id="ml-dest" value={newLink.destination_type} onChange={(e) => setNewLink({ ...newLink, destination_type: e.target.value })} className={`${selectClass} mt-1.5`}>
              {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="ml-src">Source <span className="text-muted-foreground font-normal">utm_source</span></Label>
            <Input id="ml-src" className="mt-1.5 bg-card" placeholder="instagram" value={newLink.utm_source}
              onChange={(e) => setNewLink({ ...newLink, utm_source: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ml-camp">Campaign <span className="text-muted-foreground font-normal">optional</span></Label>
            <Input id="ml-camp" className="mt-1.5 bg-card" placeholder="october-intake" value={newLink.utm_campaign}
              onChange={(e) => setNewLink({ ...newLink, utm_campaign: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>Create link</Button>
          </div>
        </form>
      )}

      {links.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-border">
              <tr className="text-[13px] text-muted-foreground">
                <th className="text-left font-medium py-3 pl-5 sm:pl-6 pr-3">Link</th>
                <th className="text-right font-medium py-3 px-3">Clicks</th>
                <th className="text-right font-medium py-3 px-3">Conversions</th>
                <th className="py-3 pr-5 sm:pr-6 pl-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-accent/40">
                  <td className="py-3 pl-5 sm:pl-6 pr-3 max-w-[420px]">
                    <p className="text-[15px] font-semibold text-foreground">{link.link_name}</p>
                    <p className="text-[13px] text-muted-foreground font-mono truncate">{link.full_url}</p>
                  </td>
                  <td className="py-3 px-3 text-right"><span className="num text-lg">{link.clicks || 0}</span></td>
                  <td className="py-3 px-3 text-right"><span className="num text-lg">{link.conversions || 0}</span></td>
                  <td className="py-3 pr-5 sm:pr-6 pl-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleCopy(link.full_url)} aria-label="Copy link"><Copy /></Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(link.id)} aria-label="Delete link"><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No links yet" body="Start with the one in your Instagram bio." />
      )}
    </Panel>
  );
}
