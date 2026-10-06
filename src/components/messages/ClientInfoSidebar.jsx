import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, differenceInWeeks, format, parseISO } from 'date-fns';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { BADGE_CONFIG } from '@/lib/badges';
import { ComplianceStrip, TextLink } from '@/components/kit';
import AIFollowUpChip from './AIFollowUpChip';

const GOAL_LABELS = {
  fat_loss: 'Fat loss', weight_loss: 'Fat loss', muscle_gain: 'Muscle gain', hybrid: 'Hybrid', strength: 'Strength',
  endurance: 'Endurance', general_fitness: 'General fitness',
};

function Fact({ label, children, tone }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-semibold text-foreground">{label}:</span>{' '}
      <span className={cn(tone === 'danger' ? 'text-destructive font-medium' : 'text-foreground')}>{children}</span>
    </p>
  );
}

/**
 * "About Alicia" context column beside a conversation: compliance number +
 * strip, program and week, next check-in, then the follow-up nudge and links.
 */
export default function ClientInfoSidebar({ client, checkIns = [], badges = [], allMessages = [], onInsertMessage }) {
  const navigate = useNavigate();
  const [note, setNote] = useState('');

  const { data: program } = useQuery({
    queryKey: ['messages-program', client?.assigned_program_id],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: client.assigned_program_id }).then(r => r[0] || null),
    enabled: !!client?.assigned_program_id,
  });

  const sortedCIs = useMemo(() => [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date)), [checkIns]);

  if (!client) return null;

  const first = client.name?.split(' ')[0] || client.name;

  // Compliance over the last (up to) 4 check-ins, oldest → newest.
  const recent = sortedCIs.slice(0, 4).reverse();
  const scores = recent.map(ci => {
    const vals = [ci.compliance_training, ci.compliance_nutrition].filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + Number(v), 0) / vals.length) : null;
  });
  const known = scores.filter(v => v != null);
  const avgCompliance = known.length ? Math.round(known.reduce((s, v) => s + v, 0) / known.length) : null;

  const lastCI = sortedCIs[0];
  const nextDue = lastCI ? addDays(parseISO(lastCI.date), 7) : null;
  const daysToNext = nextDue ? differenceInCalendarDays(nextDue, new Date()) : null;
  const nextLabel = nextDue == null
    ? 'Not set up yet'
    : daysToNext < 0 ? `${Math.abs(daysToNext)} day${Math.abs(daysToNext) !== 1 ? 's' : ''} overdue`
    : daysToNext === 0 ? 'Today'
    : daysToNext === 1 ? 'Tomorrow'
    : daysToNext < 7 ? format(nextDue, 'EEEE') : format(nextDue, 'MMM d');

  const programWeek = client.start_date ? differenceInWeeks(new Date(), parseISO(client.start_date)) + 1 : null;
  const programLabel = program?.name
    ? `${program.name}${programWeek ? `, week ${programWeek}` : ''}`
    : client.assigned_program_id ? (programWeek ? `Week ${programWeek}` : 'Assigned') : 'None assigned';

  const clientBadges = badges.filter(b => b.client_id === client.id).slice(0, 3);

  return (
    <div className="h-full bg-card border-l border-border flex flex-col overflow-y-auto">
      <div className="px-5 pt-6 pb-5">
        <p className="text-[13px] font-medium text-muted-foreground">About {first}</p>

        {avgCompliance != null ? (
          <>
            <p className="num text-[34px] leading-none text-foreground mt-3">{avgCompliance}%</p>
            <p className="text-sm text-muted-foreground mt-1">compliance over {known.length} week{known.length !== 1 ? 's' : ''}</p>
            <ComplianceStrip weeks={scores} className="mt-3" label={`Compliance, last ${scores.length} check-ins`} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">No check-ins yet, so no compliance to show.</p>
        )}

        <div className="mt-5 space-y-1">
          <Fact label="Program">{programLabel}</Fact>
          <Fact label="Next check-in" tone={daysToNext != null && daysToNext < 0 ? 'danger' : undefined}>{nextLabel}</Fact>
          {client.goal && <Fact label="Goal">{GOAL_LABELS[client.goal] || client.goal.replace(/_/g, ' ')}</Fact>}
          {client.tags?.length > 0 && <Fact label="Tags">{client.tags.join(', ')}</Fact>}
        </div>

        {client.notes && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-4 line-clamp-4">{client.notes}</p>
        )}
      </div>

      {/* Follow-up nudge */}
      {onInsertMessage && (
        <AIFollowUpChip
          client={client}
          allMessages={allMessages}
          checkIns={checkIns}
          onInsert={onInsertMessage}
        />
      )}

      {/* Recent badges */}
      {clientBadges.length > 0 && (
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[13px] font-medium text-muted-foreground mb-2">Recent wins</p>
          <div className="space-y-1.5">
            {clientBadges.map(b => {
              const cfg = BADGE_CONFIG?.[b.badge_key];
              return (
                <p key={b.id} className="text-sm text-foreground flex justify-between gap-3">
                  <span className="truncate">{cfg?.label || b.badge_key}</span>
                  {b.awarded_at && <span className="text-muted-foreground flex-shrink-0">{format(parseISO(b.awarded_at), 'MMM d')}</span>}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Scratch notes (local to this view) */}
      <div className="px-5 py-4 border-t border-border">
        <label htmlFor="msg-quick-note" className="text-[13px] font-medium text-muted-foreground">Scratch note</label>
        <textarea
          id="msg-quick-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={`Something to remember about ${first}`}
          rows={3}
          className="mt-1.5 w-full text-sm rounded-md border border-input bg-card px-3 py-2 resize-none outline-none focus:border-foreground transition-colors text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-auto px-5 py-5 flex flex-col items-start gap-2.5">
        <TextLink onClick={() => navigate(`/client-profile?clientId=${client.id}`)}>Open full profile</TextLink>
        <TextLink onClick={() => navigate(`/checkin-review?clientId=${client.id}`)} className="text-muted-foreground">Check-ins</TextLink>
        <TextLink onClick={() => navigate('/nutrition')} className="text-muted-foreground">Nutrition</TextLink>
      </div>
    </div>
  );
}
