import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { CheckCircle2, Flag, Clock, ChevronDown } from 'lucide-react';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,        bg: 'bg-warning/10 text-warning border-warning',  dot: 'bg-warning' },
  reviewed: { label: 'Reviewed', icon: CheckCircle2, bg: 'bg-success/10 text-success border-success', dot: 'bg-success' },
  flagged:  { label: 'Flagged',  icon: Flag,         bg: 'bg-destructive/10 text-destructive border-destructive',        dot: 'bg-destructive' },
};

export default function CheckInStatusBadge({ checkIn, queryKey = 'checkins-review', compact = false }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const status = checkIn.review_status || (checkIn.coach_responded ? 'reviewed' : 'pending');
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const mutation = useMutation({
    mutationFn: (newStatus) => db.entities.CheckIn.update(checkIn.id, {
      review_status: newStatus,
      coach_responded: newStatus === 'reviewed',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
    },
  });

  const STATUSES = ['pending', 'reviewed', 'flagged'];

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all hover:opacity-80',
          cfg.bg,
          compact ? 'py-0.5' : ''
        )}
      >
        <Icon className="w-3 h-3" />
        {cfg.label}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[130px]">
            {STATUSES.map(s => {
              const c = STATUS_CONFIG[s];
              const SIcon = c.icon;
              return (
                <button
                  key={s}
                  onClick={() => { mutation.mutate(s); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-muted transition-colors text-left',
                    status === s && 'bg-muted'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                  <SIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}