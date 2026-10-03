import React from 'react';
import { MoreHorizontal, Edit, Trash2, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LifecycleBadge, { LIFECYCLE_CONFIG } from './LifecycleBadge';
import PriorityScoreBadge from '@/components/intelligence/PriorityScoreBadge';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const LIFECYCLE_ORDER = ['lead', 'active', 'at_risk', 'completed', 'alumni'];

// Small onboarding progress indicator
function OnboardingDots({ client, checkIns }) {
  const steps = [
    !!client.goal || !!client.height,          // intake
    !!client.assigned_program_id,              // program
    !!client.assigned_nutrition_id,            // nutrition
    checkIns > 0,                              // first check-in
  ];
  const done = steps.filter(Boolean).length;
  if (done === steps.length) return null; // fully onboarded — don't clutter the row
  return (
    <div className="flex items-center gap-0.5 ml-1" title={`Onboarding: ${done}/${steps.length} steps`}>
      {steps.map((s, i) => (
        <div key={i} className={cn('w-1.5 h-1.5 rounded-full', s ? 'bg-success' : 'bg-muted-foreground')} />
      ))}
    </div>
  );
}

// Lead pipeline stage badge
const STAGE_COLORS = {
  new_lead: 'text-muted-foreground',
  dmd: 'text-primary',
  call_booked: 'text-warning',
  proposal_sent: 'text-ai',
  closed: 'text-success',
  lost: 'text-destructive',
};
const STAGE_LABELS = {
  new_lead: 'New', dmd: "DM'd", call_booked: 'Call', proposal_sent: 'Proposal', closed: 'Closed', lost: 'Lost',
};

const GOAL_LABELS = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  strength: 'Strength',
  endurance: 'Endurance',
  flexibility: 'Flexibility',
  general_fitness: 'General Fitness',
};

const AVATAR_COLORS = [
  ['bg-muted', 'text-foreground'],
  ['bg-muted', 'text-foreground'],
  ['bg-muted', 'text-foreground'],
  ['bg-muted', 'text-foreground'],
  ['bg-muted', 'text-foreground'],
  ['bg-muted', 'text-foreground'],
];

function getAvatarColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function CheckInAge({ lastCheckIn }) {
  if (!lastCheckIn) return (
    <span className="text-[10px] text-muted-foreground">No check-ins yet</span>
  );
  const days = Math.floor((Date.now() - new Date(lastCheckIn.date)) / 86400000);
  const label = days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  const color = days <= 7 ? 'text-success' : days <= 14 ? 'text-warning' : 'text-destructive';
  return <span className={cn('text-[10px] font-medium', color)}>{label}</span>;
}

/* ── Adherence bar (expanded view) ── */
function AdherenceBar({ score }) {
  if (score === null) return <div className="h-1 w-full rounded-full bg-border mt-1" />;
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="h-1 w-full rounded-full bg-border mt-1 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
  );
}

export default function ClientRow({ client, score, priorityScore, lastCheckIn, checkInCount = 0, compact = false, onEdit, onDelete, onStatusChange, onView, selected, onSelect }) {
  const initials = (client.name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const [avatarBg, avatarText] = getAvatarColor(client.name);
  const scoreColor = score === null ? '' : score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
  const isLead = (client.lifecycle_status || 'lead') === 'lead';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 bg-card border-b border-border hover:bg-background transition-colors cursor-pointer group',
        compact ? 'py-2' : 'py-3',
        selected && 'bg-muted hover:bg-muted'
      )}
      onClick={onView}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); onSelect?.(); }}>
        {selected
          ? <CheckSquare className="w-4 h-4 text-primary" />
          : <Square className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </div>

      {/* Avatar */}
      <div className={cn(
        'rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden',
        compact ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs',
        client.avatar_url ? '' : `${avatarBg} ${avatarText}`
      )}>
        {client.avatar_url
          ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
          : initials}
      </div>

      {/* Name + email + (expanded: goal/tags/bar) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('font-bold text-foreground truncate leading-tight', compact ? 'text-xs' : 'text-sm')}>{client.name}</p>
          {priorityScore !== null && priorityScore !== undefined && <PriorityScoreBadge score={priorityScore} />}
          {!compact && <OnboardingDots client={client} checkIns={checkInCount} />}
          {isLead && client.pipeline_stage && client.pipeline_stage !== 'new_lead' && (
            <span className={cn('text-[10px] font-bold flex-shrink-0', STAGE_COLORS[client.pipeline_stage])}>
              · {STAGE_LABELS[client.pipeline_stage]}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate leading-tight">{client.email}</p>

        {/* Expanded-only: goal + tags + adherence bar */}
        {!compact && (
          <>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {client.goal ? (
                <span className="text-[10px] font-medium px-1.5 py-0 rounded-md bg-muted text-foreground flex-shrink-0">
                  {GOAL_LABELS[client.goal] || client.goal}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">No goal set</span>
              )}
              {(client.tags || []).slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] font-medium px-1.5 py-0 rounded-md bg-muted text-foreground flex-shrink-0">#{tag}</span>
              ))}
              {(client.tags || []).length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{client.tags.length - 2}</span>
              )}
            </div>
            <AdherenceBar score={score} />
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="hidden sm:block flex-shrink-0">
        <LifecycleBadge status={client.lifecycle_status || 'lead'} />
      </div>

      {/* Adherence number */}
      <div className="hidden md:flex flex-col items-end flex-shrink-0 w-20">
        {score !== null ? (
          <>
            <span className={cn('font-bold tabular-nums leading-tight', compact ? 'text-xs' : 'text-sm', scoreColor)}>{score}%</span>
            {compact && <span className="text-[10px] text-muted-foreground">adherence</span>}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Last check-in */}
      <div className="hidden lg:flex flex-col items-end flex-shrink-0 w-24">
        <CheckInAge lastCheckIn={lastCheckIn} />
        <span className="text-[10px] text-muted-foreground">check-in</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-foreground" onClick={onView}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Move to Stage</div>
            {LIFECYCLE_ORDER.filter(s => s !== (client.lifecycle_status || 'lead')).map(s => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                <span className={cn('w-2 h-2 rounded-full mr-2 flex-shrink-0 inline-block', {
                  'bg-warning': s === 'lead',
                  'bg-success': s === 'active',
                  'bg-destructive': s === 'at_risk',
                  'bg-primary': s === 'completed',
                  'bg-ai': s === 'alumni',
                })} />
                {LIFECYCLE_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}