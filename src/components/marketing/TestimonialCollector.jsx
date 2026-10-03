import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Star, CheckCircle2, XCircle, Download } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Pending', value: stats.pending },
          { label: 'Approved', value: stats.approved },
          { label: 'Avg Rating', value: `${stats.avg_rating}★` },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs text-muted-foreground font-bold">{stat.label}</p>
            <p className="text-2xl font-black text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Export */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">Testimonials</h3>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground font-bold hover:bg-muted">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Rating</label>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-3 py-1 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All</option>
              <option value="5">5 stars</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
            </select>
          </div>
        </div>

        {/* Testimonials grid */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((testimonial) => (
              <div key={testimonial.id} className={`p-4 rounded-lg border-2 ${
                testimonial.status === 'approved' ? 'border-success bg-success/10' :
                testimonial.status === 'rejected' ? 'border-destructive bg-destructive/10' :
                'border-warning bg-warning/10'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-foreground">{testimonial.client_name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4" fill={i < testimonial.rating ? 'var(--tc-warning)' : 'var(--tc-border)'} color={i < testimonial.rating ? 'var(--tc-warning)' : 'var(--tc-border)'} />
                      ))}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    testimonial.status === 'approved' ? 'bg-success text-success' :
                    testimonial.status === 'rejected' ? 'bg-destructive text-destructive' :
                    'bg-warning text-warning'
                  }`}>
                    {testimonial.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-3">{testimonial.content}</p>
                <div className="flex gap-2">
                  {testimonial.status === 'pending_approval' && (
                    <>
                      <button onClick={() => approveMutation.mutate(testimonial.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-success text-white text-xs font-bold hover:bg-success">
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => rejectMutation.mutate(testimonial.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  <button onClick={() => toggleFeatureMutation.mutate(testimonial.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      testimonial.is_featured
                        ? 'bg-primary text-primary-foreground hover:bg-primary'
                        : 'bg-border text-foreground hover:bg-border'
                    }`}>
                    {testimonial.is_featured ? '⭐ Featured' : 'Feature'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No testimonials yet</p>
          )}
        </div>
      </div>
    </div>
  );
}