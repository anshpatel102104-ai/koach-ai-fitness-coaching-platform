import React from 'react';
import { X, Phone, Target, Calendar, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LifecycleBadge from './LifecycleBadge';
import ClientFeedbackHistory from './ClientFeedbackHistory';
import { compositeAdherenceScore } from '@/lib/adherence';
import { format } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

const goalLabels = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness'
};

const StatPill = ({ label, value }) => (
  <div className="flex flex-col items-center bg-muted rounded-xl px-4 py-3 flex-1 min-w-0">
    <span className="text-base font-bold text-foreground tabular-nums">{value ?? '—'}</span>
    <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
  </div>
);

export default function ClientProfileDrawer({ client, checkIns = [], onClose, onEdit }) {
  if (!client) return null;

  const initials = client.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const score = compositeAdherenceScore(checkIns);
  const lastCI = checkIns[0];
  const scoreColor = score === null ? 'var(--tc-muted-foreground)' : score >= 80 ? 'var(--tc-success)' : score >= 60 ? 'var(--tc-warning)' : 'var(--tc-destructive)';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      {/* Drawer */}
      <div
        className="relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-heading font-bold text-foreground text-base">Client Profile</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="w-4 h-4 text-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4 text-foreground" />
            </Button>
          </div>
        </div>

        {/* Identity */}
        <div className="flex flex-col items-center pt-6 pb-5 px-5 text-center border-b border-border">
          <div className="w-16 h-16 rounded-full bg-accent/10 text-primary flex items-center justify-center font-bold text-xl mb-3 overflow-hidden">
            {client.avatar_url
              ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
              : initials}
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight">{client.name}</h3>
          <p className="text-sm text-muted-foreground mb-2">{client.email}</p>
          <LifecycleBadge status={client.lifecycle_status || 'lead'} />
        </div>

        {/* Stats row */}
        <div className="flex gap-2 px-5 py-4 border-b border-border">
          <StatPill label="Adherence" value={score !== null ? `${score}%` : '—'} />
          <StatPill label="Check-ins" value={checkIns.length} />
          {client.monthly_rate && <StatPill label="Rate" value={`$${client.monthly_rate}`} />}
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3 border-b border-border">
          {client.phone && (
            <div className="flex items-center gap-3 text-sm text-foreground">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {client.phone}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {goalLabels[client.goal] || 'General Fitness'}
          </div>
          {client.start_date && (
            <div className="flex items-center gap-3 text-sm text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              Started {format(new Date(client.start_date), 'MMM d, yyyy')}
            </div>
          )}
          {(client.current_weight || client.target_weight) && (
            <div className="flex items-center gap-4 text-sm text-foreground">
              {client.current_weight && <span className="flex items-center gap-1"><span className="text-muted-foreground text-xs">CW</span> {client.current_weight} lbs</span>}
              {client.target_weight && <span className="flex items-center gap-1"><span className="text-muted-foreground text-xs">TW</span> {client.target_weight} lbs</span>}
            </div>
          )}
          {lastCI && (
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="text-muted-foreground text-xs w-4 text-center">CI</span>
              Last check-in: {format(new Date(lastCI.date), 'MMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Tags */}
        {client.tags?.length > 0 && (
          <div className="px-5 py-3 border-b border-border">
            <div className="flex flex-wrap gap-1.5">
              {client.tags.map(tag => (
                <span key={tag} className="text-xs bg-accent/10 text-primary border border-accent rounded-lg px-2 py-0.5 font-medium">#{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {client.notes && (
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Coach Notes</p>
            <p className="text-sm text-foreground leading-relaxed">{client.notes}</p>
          </div>
        )}

        {/* Feedback History */}
        {checkIns.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Check-in History</p>
            <ClientFeedbackHistory checkIns={checkIns} />
          </div>
        )}
      </div>
    </div>
  );
}