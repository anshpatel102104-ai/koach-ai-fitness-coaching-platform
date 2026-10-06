import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Panel, PanelHeader, Stat, EmptyState, Initials } from '@/components/kit';
import { selectClass } from './MarketingLinksSection';
import { toast } from 'sonner';

export default function TestimonialCollector({ coachId }) {
  const queryClient = useQueryClient();
  const [filterRating, setFilterRating] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials', coachId],
    queryFn: () => db.entities.Testimonial.filter({ coach_id: coachId }, '-submitted_at'),
    enabled: !!coachId,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => db.entities.Testimonial.update(id, { status: 'approved', approved_at: new Date().toISOString() }),
    onSuccess: () => {
      toast.success('Testimonial approved');
      queryClient.invalidateQueries({ queryKey: ['testimonials', coachId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => db.entities.Testimonial.update(id, { status: 'rejected' }),
    onSuccess: () => {
      toast.success('Testimonial rejected');
      queryClient.invalidateQueries({ queryKey: ['testimonials', coachId] });
    },
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: (id) => {
      const testimonial = testimonials.find(t => t.id === id);
      return db.entities.Testimonial.update(id, { is_featured: !testimonial.is_featured });
    },
    onSuccess: () => {
      toast.success('Testimonial updated');
      queryClient.invalidateQueries({ queryKey: ['testimonials', coachId] });
    },
  });

  const filtered = testimonials.filter(t => {
    const ratingMatch = filterRating === 'all' || t.rating >= parseInt(filterRating);
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    return ratingMatch && statusMatch;
  });

  const stats = {
    total: testimonials.length,
    pending: testimonials.filter(t => t.status === 'pending_approval').length,
    approved: testimonials.filter(t => t.status === 'approved').length,
    avg_rating: testimonials.length > 0 ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1) : 0,
  };

  const handleExport = () => {
    const csv = [
      ['Client', 'Rating', 'Content', 'Status', 'Date'],
      ...filtered.map(t => [
        t.client_name,
        t.rating,
        t.content.substring(0, 50) + '...',
        t.status,
        new Date(t.submitted_at).toLocaleDateString(),
      ]),
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testimonials.csv';
    a.click();
  };

  const STATUS = {
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'destructive' },
    pending_approval: { label: 'Waiting on you', variant: 'warning' },
  };

  return (
    <div className="space-y-5">
      <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden bg-border [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Testimonials" value={stats.total} />
        <Stat label="Waiting on you" value={stats.pending} tone={stats.pending > 0 ? 'warning' : undefined} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Average rating" value={stats.avg_rating} unit="/ 5" />
      </Panel>

      <Panel>
        <PanelHeader
          title="Testimonials"
          subtitle="Approve the ones you're happy to show. Featured ones go first on your page."
          right={<Button size="sm" variant="outline" onClick={handleExport}><Download /> Export CSV</Button>}
        />
        <div className="flex gap-3 flex-wrap px-5 sm:px-6 pb-4">
          <div>
            <Label htmlFor="t-status" className="text-[13px] text-muted-foreground">Status</Label>
            <select id="t-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${selectClass} mt-1 w-44`}>
              <option value="all">All</option>
              <option value="pending_approval">Waiting on you</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <Label htmlFor="t-rating" className="text-[13px] text-muted-foreground">Rating</Label>
            <select id="t-rating" value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className={`${selectClass} mt-1 w-44`}>
              <option value="all">All</option>
              <option value="5">5 stars</option>
              <option value="4">4 and up</option>
              <option value="3">3 and up</option>
            </select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <ul className="divide-y divide-border border-t border-border px-5 sm:px-6">
            {filtered.map((testimonial) => {
              const st = STATUS[testimonial.status] || { label: String(testimonial.status || '').replace(/_/g, ' '), variant: 'secondary' };
              return (
                <li key={testimonial.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Initials name={testimonial.client_name || ''} />
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-foreground truncate">{testimonial.client_name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {testimonial.rating} of 5{testimonial.submitted_at ? `, ${new Date(testimonial.submitted_at).toLocaleDateString()}` : ''}{testimonial.is_featured ? ', featured' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={st.variant} className="flex-shrink-0">{st.label}</Badge>
                  </div>
                  <p className="text-[15px] text-foreground leading-relaxed mt-3">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="flex items-center gap-2 mt-3">
                    {testimonial.status === 'pending_approval' && (
                      <>
                        <Button size="sm" onClick={() => approveMutation.mutate(testimonial.id)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(testimonial.id)}>Reject</Button>
                      </>
                    )}
                    <button onClick={() => toggleFeatureMutation.mutate(testimonial.id)} className="ml-1 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
                      {testimonial.is_featured ? 'Unfeature' : 'Feature'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState className="border-t border-border" title="No testimonials yet" body="They show up here when clients send one from their app." />
        )}
      </Panel>
    </div>
  );
}
