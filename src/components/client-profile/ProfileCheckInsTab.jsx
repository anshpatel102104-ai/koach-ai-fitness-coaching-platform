import React, { useState } from 'react';
import { ClipboardCheck, ChevronDown, ChevronUp, CheckCircle2, Flag, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const moodEmoji = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😤' };

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,         class: 'bg-warning/10 border-warning text-warning' },
  reviewed: { label: 'Reviewed', icon: CheckCircle2,  class: 'bg-success/10 border-success text-success' },
  flagged:  { label: 'Flagged',  icon: Flag,          class: 'bg-destructive/10 border-destructive text-destructive' },
};

function StatusBadge({ status, onChange }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <select
      value={status || 'pending'}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className={cn(
        'text-[10px] font-bold border rounded-lg px-2 py-1 cursor-pointer appearance-none text-center',
        cfg.class
      )}
    >
      <option value="pending">Pending</option>
      <option value="reviewed">Reviewed</option>
      <option value="flagged">Flagged</option>
    </select>
  );
}

function CheckInCard({ ci, clientId }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status) => db.entities.CheckIn.update(ci.id, { review_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', clientId] });
      toast.success('Status updated');
    },
  });

  const status = ci.review_status || 'pending';

  return (
    <div className={cn(
      'bg-card rounded-2xl border overflow-hidden transition-all',
      status === 'flagged' ? 'border-destructive' : status === 'reviewed' ? 'border-success' : 'border-border'
    )}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-base flex-shrink-0">
          {moodEmoji[ci.mood] || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{format(new Date(ci.date), 'MMM d, yyyy')}</p>
          <p className="text-xs text-muted-foreground">
            {[ci.weight && `${ci.weight} lbs`, ci.compliance_training != null && `${ci.compliance_training}% training`]
              .filter(Boolean).join(' · ') || 'No metrics'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <StatusBadge status={status} onChange={(val) => updateStatus.mutate(val)} />
        </div>
        <div className="ml-1 flex-shrink-0">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2">
            {ci.weight && (
              <div className="bg-muted rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold tabular-nums text-foreground">{ci.weight}</p>
                <p className="text-[9px] text-muted-foreground">lbs</p>
              </div>
            )}
            {ci.sleep_hours && (
              <div className="bg-muted rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold tabular-nums text-foreground">{ci.sleep_hours}h</p>
                <p className="text-[9px] text-muted-foreground">sleep</p>
              </div>
            )}
            {ci.energy_level && (
              <div className="bg-muted rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold tabular-nums text-foreground">{ci.energy_level}/10</p>
                <p className="text-[9px] text-muted-foreground">energy</p>
              </div>
            )}
          </div>

          {/* Compliance bars */}
          {(ci.compliance_training != null || ci.compliance_nutrition != null) && (
            <div className="space-y-2">
              {ci.compliance_training != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">Training</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${ci.compliance_training}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-primary w-8 text-right">{ci.compliance_training}%</span>
                </div>
              )}
              {ci.compliance_nutrition != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">Nutrition</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="bg-success h-full rounded-full" style={{ width: `${ci.compliance_nutrition}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-success w-8 text-right">{ci.compliance_nutrition}%</span>
                </div>
              )}
            </div>
          )}

          {ci.notes && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Client Notes</p>
              <p className="text-sm text-foreground leading-relaxed">{ci.notes}</p>
            </div>
          )}

          {ci.coach_notes && (
            <div className="bg-accent/10 rounded-xl p-3">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Coach Response</p>
              <p className="text-sm text-foreground leading-relaxed">{ci.coach_notes}</p>
            </div>
          )}

          {ci.photo_urls?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {ci.photo_urls.map((url, i) => (
                  <SignedLink key={i} href={url} target="_blank" rel="noreferrer">
                    <SignedImg src={url} alt="progress" className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity" />
                  </SignedLink>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileCheckInsTab({ client, checkIns }) {
  const [filter, setFilter] = useState('all');

  const filtered = checkIns.filter(ci => {
    if (filter === 'all') return true;
    return (ci.review_status || 'pending') === filter;
  });

  const counts = {
    pending: checkIns.filter(ci => !ci.review_status || ci.review_status === 'pending').length,
    reviewed: checkIns.filter(ci => ci.review_status === 'reviewed').length,
    flagged: checkIns.filter(ci => ci.review_status === 'flagged').length,
  };

  if (checkIns.length === 0) return (
    <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-14 text-center px-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">No check-ins yet</p>
      <p className="text-xs text-muted-foreground mt-1">Client check-ins will appear here once submitted</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'all', label: `All (${checkIns.length})` },
          { key: 'pending', label: `Pending (${counts.pending})` },
          { key: 'reviewed', label: `Reviewed (${counts.reviewed})` },
          { key: 'flagged', label: `Flagged (${counts.flagged})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors',
              filter === f.key
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-card text-foreground border-border hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.map(ci => (
        <CheckInCard key={ci.id} ci={ci} clientId={client.id} />
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-xs text-muted-foreground">No check-ins for this filter</div>
      )}
    </div>
  );
}