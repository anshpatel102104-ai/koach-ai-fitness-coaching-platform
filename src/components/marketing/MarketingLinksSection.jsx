import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Copy, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const DESTINATION_OPTIONS = [
  { value: 'coach_profile', label: 'Coach Profile Page' },
  { value: 'package_page', label: 'All Packages' },
  { value: 'booking', label: 'Free Consultation' },
  { value: 'signup', label: 'KOACH AI Signup' },
];

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
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate(newLink);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-foreground">Smart Link Builder</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary">
            <Plus className="w-4 h-4" /> Create Link
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg bg-muted border border-border space-y-4">
            <input
              type="text"
              placeholder="Link name (e.g., Instagram Bio)"
              value={newLink.link_name}
              onChange={(e) => setNewLink({ ...newLink, link_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />

            <select
              value={newLink.destination_type}
              onChange={(e) => setNewLink({ ...newLink, destination_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {DESTINATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="UTM Source (e.g., instagram)"
              value={newLink.utm_source}
              onChange={(e) => setNewLink({ ...newLink, utm_source: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="text"
              placeholder="UTM Campaign (optional)"
              value={newLink.utm_campaign}
              onChange={(e) => setNewLink({ ...newLink, utm_campaign: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

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

        {/* Links table */}
        {links.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-3 font-bold text-foreground">Name</th>
                  <th className="text-left py-3 px-3 font-bold text-foreground">URL</th>
                  <th className="text-right py-3 px-3 font-bold text-foreground">Clicks</th>
                  <th className="text-right py-3 px-3 font-bold text-foreground">Conversions</th>
                  <th className="text-center py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-3 font-semibold text-foreground">{link.link_name}</td>
                    <td className="py-3 px-3 text-muted-foreground font-mono text-xs truncate">{link.full_url}</td>
                    <td className="py-3 px-3 text-right text-foreground font-bold">{link.clicks || 0}</td>
                    <td className="py-3 px-3 text-right text-foreground font-bold">{link.conversions || 0}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleCopy(link.full_url)} className="text-primary hover:text-primary" title="Copy">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(link.id)} className="text-destructive hover:text-destructive" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No links yet. Create one to start tracking!</p>
        )}
      </div>
    </div>
  );
}