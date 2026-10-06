import React from 'react';
import { MoreHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LIFECYCLE_CONFIG } from './LifecycleBadge';
import { Initials, ComplianceStrip } from '@/components/kit';
import { cn } from '@/lib/utils';
import { useSignedUrl } from '@/components/shared/SignedImage';

const LIFECYCLE_ORDER = ['lead', 'active', 'at_risk', 'completed', 'alumni'];

/** Shared column template so the header and rows line up. */
export const CLIENT_GRID = 'xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_243px_84px_minmax(96px,0.6fr)_36px] xl:items-center xl:gap-x-6';

export function ClientTableHeader() {
  return (
    <div className={cn('hidden xl:grid px-6 py-3 border-b border-border text-[13px] text-muted-foreground', CLIENT_GRID)}>
      <span>Client</span>
      <span>Program</span>
      <span>Last 8 weeks</span>
      <span className="text-right">Weight</span>
      <span>Next check-in</span>
      <span />
    </div>
  );
}

function Avatar({ client, alert, selected, onSelect }) {
  const signed = useSignedUrl(client.avatar_url);
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onSelect?.(); }}
      aria-label={selected ? `Deselect ${client.name}` : `Select ${client.name}`}
      aria-pressed={!!selected}
      className="relative flex-shrink-0 rounded-full touch-compact focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Initials name={client.name || ''} src={signed || undefined} tone={alert ? 'alert' : 'default'} size={36} />
      <span
        className={cn(
          'absolute inset-0 rounded-full flex items-center justify-center transition-opacity',
          selected ? 'opacity-100 bg-primary text-primary-foreground' : 'opacity-0 group-hover:opacity-100 bg-card ring-1 ring-input text-transparent'
        )}
      >
        <Check className="w-4 h-4" />
      </span>
    </button>
  );
}

/**
 * One client in the roster table: avatar (red ring when they need you),
 * name + one-line status, program, 8-week compliance strip, weight change
 * and next check-in. Clicking the row opens the client dashboard.
 */
export default function ClientRow({
  client, statusText, programText, weeks = [], weight, next, alert = false,
  priorityScore, compact = false, onEdit, onDelete, onStatusChange, onView, onOpenProfile,
  selected, onSelect,
}) {
  const current = client.lifecycle_status || 'lead';
  const hasDelta = weight && weight.delta !== null && weight.delta !== undefined;
  const deltaText = hasDelta
    ? `${weight.delta < 0 ? '−' : weight.delta > 0 ? '+' : ''}${Math.abs(weight.delta).toFixed(1)}`
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={e => { if (e.key === 'Enter') onView?.(); }}
      title={priorityScore !== null && priorityScore !== undefined ? `Priority ${priorityScore} of 10` : undefined}
      className={cn(
        'group relative flex items-start gap-3 px-4 sm:px-6 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:bg-accent/60',
        compact ? 'py-2.5' : 'py-3.5',
        CLIENT_GRID,
        selected && 'bg-accent hover:bg-accent'
      )}
    >
      {selected && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand" aria-hidden />}

      {/* Client */}
      <div className="flex items-center gap-3 min-w-0 flex-1 xl:flex-none">
        <Avatar client={client} alert={alert} selected={selected} onSelect={onSelect} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground truncate leading-tight">{client.name}</p>
          <p className={cn('text-[13px] truncate mt-0.5', alert ? 'text-foreground/80' : 'text-muted-foreground')}>
            {statusText}
          </p>
          {/* Mobile: strip under the name */}
          <div className="xl:hidden mt-2.5 flex items-center gap-3">
            <ComplianceStrip weeks={weeks} size="sm" />
            {deltaText && <span className="num text-sm text-foreground">{deltaText}<span className="text-[0.75em] ml-0.5">lb</span></span>}
            <span className="hidden sm:inline text-[13px] text-muted-foreground truncate">
              {programText}
              {next?.label && next.label !== '—' && (
                <> · Next check-in <span className={next.overdue ? 'text-destructive font-medium' : 'text-foreground'}>{next.label}</span></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Program */}
      <p className="hidden xl:block text-[15px] text-foreground truncate">{programText}</p>

      {/* Last 8 weeks */}
      <div className="hidden xl:block">
        <ComplianceStrip weeks={weeks} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Weight */}
      <p className="hidden xl:block text-right">
        {deltaText
          ? <span className="num text-[17px] text-foreground">{deltaText}<span className="text-[0.8em] ml-1">lb</span></span>
          : <span className="num text-[17px] text-foreground">{'—'}</span>}
      </p>

      {/* Next check-in */}
      <p className={cn('hidden xl:block text-[15px] truncate', next?.overdue ? 'text-destructive font-medium' : 'text-foreground')}>
        {next?.label}
      </p>

      {/* Row menu */}
      <div className="flex-shrink-0 self-center" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground xl:opacity-0 xl:group-hover:opacity-100 xl:focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${client.name}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onView}>Open dashboard</DropdownMenuItem>
            {onOpenProfile && <DropdownMenuItem onClick={onOpenProfile}>Open full profile</DropdownMenuItem>}
            <DropdownMenuItem onClick={onEdit}>Edit details</DropdownMenuItem>
            <DropdownMenuItem onClick={onSelect}>{selected ? 'Deselect' : 'Select'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Move to stage</DropdownMenuLabel>
            {LIFECYCLE_ORDER.filter(s => s !== current).map(s => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                <span className={cn('w-2 h-2 rounded-full mr-2 flex-shrink-0 inline-block', LIFECYCLE_CONFIG[s].dot)} />
                {LIFECYCLE_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              Delete client and their data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
