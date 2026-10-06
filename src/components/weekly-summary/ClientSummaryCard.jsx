import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Initials, ComplianceStrip } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { weeklyCompliance } from '@/components/dashboard/todayModel';

const pctTone = (v) => v == null ? 'text-muted-foreground' : v >= 80 ? 'text-foreground' : v >= 60 ? 'text-warning' : 'text-destructive';

/** Small label-over-value cell used across the row. */
function Cell({ label, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[12px] text-muted-foreground lg:hidden">{label}</p>
      {children}
    </div>
  );
}

/**
 * One client's week as a table row: who, why they need you (or not),
 * last 8 weeks, weight change, workouts, check-in, compliance, and actions.
 */
export default function ClientSummaryCard({ client, checkIns, sessions }) {
  const navigate = useNavigate();

  const sorted    = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest    = sorted[0];
  const prev      = sorted[1];
  const lastCheckInDays = latest ? differenceInDays(new Date(), parseISO(latest.date)) : null;
  const missedCI  = lastCheckInDays === null || lastCheckInDays >= 7;

  // Workouts this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = sessions.filter(s => s.client_id === client.id && new Date(s.completed_at || s.created_date) >= weekAgo);
  const weekWorkouts = weekSessions.length;

  // Weight change (last 2 check-ins)
  const weightNow  = latest?.weight;
  const weightPrev = prev?.weight;
  const weightDiff = weightNow && weightPrev ? +(weightNow - weightPrev).toFixed(1) : null;

  // Flags
  const lowAdherence = latest && (latest.compliance_training != null && latest.compliance_training < 60);
  const lowNutrition = latest && (latest.compliance_nutrition != null && latest.compliance_nutrition < 60);
  const lowMood      = latest?.mood === 'stressed' || latest?.mood === 'tired';
  const hasFlags     = missedCI || lowAdherence || lowNutrition || lowMood;

  const reasons = [];
  if (missedCI) reasons.push(lastCheckInDays === null ? 'No check-in yet' : `No check-in for ${lastCheckInDays} days`);
  if (lowAdherence) reasons.push(`training ${Math.round(latest.compliance_training)}%`);
  if (lowNutrition) reasons.push(`nutrition ${Math.round(latest.compliance_nutrition)}%`);
  if (lowMood) reasons.push(`feeling ${latest.mood}`);
  const statusLine = hasFlags
    ? reasons.join(', ').replace(/^./, c => c.toUpperCase())
    : `On plan${latest?.mood ? `, feeling ${latest.mood}` : ''}`;

  const goal = client.goal ? client.goal.replace(/_/g, ' ') : 'general fitness';

  return (
    <div className="border-t border-border px-5 py-4 first:border-t-0 sm:px-6">
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,2.2fr)_auto_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto]">
        {/* Who + why */}
        <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
          <Initials name={client.name} size={40} tone={hasFlags ? 'alert' : 'default'} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">{client.name}</p>
            <p className={cn('truncate text-[13px]', hasFlags ? 'text-destructive' : 'text-muted-foreground')}>{statusLine}</p>
            <p className="truncate text-[13px] capitalize text-muted-foreground lg:hidden">{goal}</p>
          </div>
        </div>

        <ComplianceStrip
          weeks={weeklyCompliance(client, sorted, 8)}
          size="sm"
          className="col-span-2 lg:col-span-1"
          label={`${client.name}, last 8 weeks`}
        />

        <Cell label="Weight">
          <p className="num text-[18px] text-foreground">{weightNow ? <>{weightNow}<span className="ml-0.5 text-[0.65em]">lb</span></> : '—'}</p>
          {weightDiff !== null && (
            <p className="text-[12px] text-muted-foreground">{weightDiff > 0 ? '+' : ''}{weightDiff} lb</p>
          )}
        </Cell>

        <Cell label="Workouts">
          <p className="num text-[18px] text-foreground">{weekWorkouts}</p>
          <p className="text-[12px] text-muted-foreground">this week</p>
        </Cell>

        <Cell label="Check-in">
          {missedCI ? (
            <p className="text-sm font-semibold text-destructive">{lastCheckInDays !== null ? `${lastCheckInDays} days ago` : 'Never'}</p>
          ) : (
            <p className="text-sm font-semibold text-foreground">{lastCheckInDays === 0 ? 'Today' : lastCheckInDays === 1 ? 'Yesterday' : `${lastCheckInDays} days ago`}</p>
          )}
          {latest?.sleep_hours != null && (
            <p className={cn('text-[12px]', latest.sleep_hours < 6 ? 'text-destructive' : 'text-muted-foreground')}>{latest.sleep_hours}h sleep</p>
          )}
        </Cell>

        <Cell label="Training / nutrition">
          <p className="text-sm font-semibold tabular-nums">
            <span className={pctTone(latest?.compliance_training)}>{latest?.compliance_training != null ? `${Math.round(latest.compliance_training)}%` : '—'}</span>
            <span className="text-muted-foreground"> / </span>
            <span className={pctTone(latest?.compliance_nutrition)}>{latest?.compliance_nutrition != null ? `${Math.round(latest.compliance_nutrition)}%` : '—'}</span>
          </p>
        </Cell>

        <div className="col-span-2 flex items-center gap-1.5 lg:col-span-1 lg:justify-end">
          <Button size="sm" variant={hasFlags ? 'default' : 'outline'} onClick={() => navigate('/checkin-review')}>Review</Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-8 px-0"
            title={`Message ${client.name}`}
            aria-label={`Message ${client.name}`}
            onClick={() => navigate(`/messages?clientId=${client.id}`)}
          >
            <MessageSquare />
          </Button>
        </div>
      </div>

      {latest?.notes && (
        <p className="mt-2.5 line-clamp-2 border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground lg:ml-[52px]">
          &ldquo;{latest.notes}&rdquo;
        </p>
      )}
    </div>
  );
}
