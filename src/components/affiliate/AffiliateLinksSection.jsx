import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Copy, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, PanelHeader, InkPanel, EmptyState } from '@/components/kit';

export default function AffiliateLinksSection({ profile }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLink, setNewLink] = useState({ link_name: '', utm_source: '', utm_campaign: '' });

  const { data: links = [] } = useQuery({
    queryKey: ['affiliate-links', profile.coach_id],
    queryFn: () => db.entities.AffiliateLink.filter({ coach_id: profile.coach_id }, '-created_at'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.AffiliateLink.create({
      coach_id: profile.coach_id,
      affiliate_code: profile.affiliate_code,
      utm_medium: 'affiliate',
      ...data,
      full_url: `${profile.affiliate_url}&utm_source=${data.utm_source || 'direct'}&utm_campaign=${data.utm_campaign || 'default'}`,
    }),
    onSuccess: () => {
      toast.success('Link created');
      setNewLink({ link_name: '', utm_source: '', utm_campaign: '' });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['affiliate-links', profile.coach_id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.AffiliateLink.delete(id),
    onSuccess: () => {
      toast.success('Link deleted');
      queryClient.invalidateQueries({ queryKey: ['affiliate-links', profile.coach_id] });
    },
  });

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-5">
      <InkPanel title="Your affiliate link">
        <p>Every coach who signs up through it is credited to you.</p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 min-w-0 h-11 px-4 rounded-md bg-ai-foreground/10 font-mono text-sm flex items-center truncate">{profile.affiliate_url}</code>
          <Button className="h-11 bg-ai-foreground text-ai hover:bg-ai-foreground/90" onClick={() => handleCopy(profile.affiliate_url)}><Copy /> Copy</Button>
        </div>
      </InkPanel>

      <Panel>
        <PanelHeader
          title="Tracking links"
          subtitle="One per place you post, so you can see which one converts."
          right={<Button size="sm" variant={showCreateForm ? 'outline' : 'default'} onClick={() => setShowCreateForm(!showCreateForm)}>{showCreateForm ? 'Close' : <><Plus /> New link</>}</Button>}
        />

        {showCreateForm && (
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newLink); }}
            className="mx-5 sm:mx-6 mb-5 p-4 rounded-lg bg-secondary grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="al-name">Name</Label>
              <Input id="al-name" className="mt-1.5 bg-card" placeholder="Instagram bio" value={newLink.link_name} onChange={(e) => setNewLink({ ...newLink, link_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="al-src">Source</Label>
              <Input id="al-src" className="mt-1.5 bg-card" placeholder="instagram" value={newLink.utm_source} onChange={(e) => setNewLink({ ...newLink, utm_source: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="al-camp">Campaign <span className="text-muted-foreground font-normal">optional</span></Label>
              <Input id="al-camp" className="mt-1.5 bg-card" placeholder="spring-launch" value={newLink.utm_campaign} onChange={(e) => setNewLink({ ...newLink, utm_campaign: e.target.value })} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button type="submit">Create link</Button>
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
                  <th className="text-right font-medium py-3 px-3">Sign-ups</th>
                  <th className="text-right font-medium py-3 px-3">Earned</th>
                  <th className="py-3 pr-5 sm:pr-6 pl-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="py-3 pl-5 sm:pl-6 pr-3 text-[15px] font-semibold text-foreground">{link.link_name}</td>
                    <td className="py-3 px-3 text-right"><span className="num text-base">{link.clicks}</span></td>
                    <td className="py-3 px-3 text-right"><span className="num text-base">{link.signups}</span></td>
                    <td className="py-3 px-3 text-right"><span className="num text-base">${Number(link.earnings || 0).toFixed(2)}</span></td>
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
          <EmptyState className="border-t border-border" title="No tracking links yet" body="Your main link above works on its own. Add more when you post in more than one place." />
        )}
      </Panel>
    </div>
  );
}
