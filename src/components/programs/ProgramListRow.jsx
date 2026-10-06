import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Initials } from '@/components/kit';

export const CATEGORY_LABELS = {
  strength: 'Strength', hypertrophy: 'Hypertrophy', fat_loss: 'Fat loss',
  athletic: 'Athletic', mobility: 'Mobility', custom: 'Custom',
};

/** Shared grid template for the programs table header + rows. */
export const PROGRAM_TABLE_COLS = 'md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-4';

export function estSessionMins(program) {
  if (!program.workouts?.length) return null;
  const avgExercises = program.workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) / program.workouts.length;
  return Math.round(avgExercises * 5 + (program.workouts[0]?.exercises?.reduce((s, e) => s + (e.sets || 3) * ((e.rest_seconds || 60) / 60 + 1), 0) || 30));
}

export function editedAgo(program) {
  const raw = program.updated_date || program.updated_at || program.created_date || program.created_at;
  if (!raw) return '—';
  const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
  if (!isValid(d)) return '—';
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function programSubline(program) {
  const mins = estSessionMins(program);
  const line = [
    program.is_archived ? 'archived' : program.is_template ? 'template' : null,
    program.difficulty || null,
    program.days_per_week ? `${program.days_per_week} days a week` : null,
    mins ? `about ${mins} min` : null,
  ].filter(Boolean).join(', ');
  return line ? line.charAt(0).toUpperCase() + line.slice(1) : '';
}

export function ClientStack({ clients = [], max = 3 }) {
  if (clients.length === 0) return <span className="text-sm text-muted-foreground">No one yet</span>;
  const shown = clients.slice(0, max);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button onClick={e => e.stopPropagation()} className="flex min-w-0 items-center gap-2 rounded-md text-left hover:opacity-80">
          <span className="flex -space-x-1.5">
            {shown.map(c => (
              <Initials key={c.id} name={c.name} size={28} className="ring-2 ring-card" />
            ))}
          </span>
          <span className="truncate text-sm text-foreground">
            {clients.length === 1 ? clients[0].name.split(' ')[0] : `${clients.length} clients`}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" onClick={e => e.stopPropagation()}>
        <p className="px-2 pb-1 pt-1 text-[13px] text-muted-foreground">On this program</p>
        {clients.map(c => (
          <div key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Initials name={c.name} size={24} />
            <span className="truncate text-sm text-foreground">{c.name}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function ProgramActionsMenu({ onPreview, onEdit, onDuplicate, onArchive, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Program options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={e => e.stopPropagation()}>
        {onPreview && <DropdownMenuItem onClick={onPreview}>Preview</DropdownMenuItem>}
        <DropdownMenuItem onClick={onEdit}>Edit in builder</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ProgramListRow({
  program,
  clientsAssigned = [],
  clientsInProgress = [],
  onEdit,
  onDuplicate,
  onAssign,
  onPreview,
  onArchive,
  onDelete,
}) {
  const goal = CATEGORY_LABELS[program.category] || (program.category ? program.category.replace(/_/g, ' ') : '—');
  const sub = programSubline(program);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPreview}
      onKeyDown={e => { if (e.key === 'Enter') onPreview?.(); }}
      className={`flex cursor-pointer items-center gap-3 border-b border-border px-5 py-3.5 transition-colors last:border-b-0 hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none sm:px-6 ${PROGRAM_TABLE_COLS}`}
    >
      {/* Program */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{program.title || 'Untitled program'}</p>
        <p className="truncate text-sm text-muted-foreground">
          {sub || program.description || 'No details yet'}
          <span className="md:hidden">{goal !== '—' ? `, ${goal.toLowerCase()}` : ''}{program.duration_weeks ? `, ${program.duration_weeks} weeks` : ''}{clientsAssigned.length ? `, ${clientsAssigned.length} on it` : ''}</span>
        </p>
      </div>

      {/* Goal */}
      <p className="hidden truncate text-[15px] text-foreground md:block">{goal}</p>

      {/* Length */}
      <p className="hidden text-[15px] text-foreground md:block">
        {program.duration_weeks ? <><span className="num text-[17px]">{program.duration_weeks}</span> weeks</> : '—'}
      </p>

      {/* Clients */}
      <div className="hidden min-w-0 md:block">
        <ClientStack clients={clientsAssigned} />
        {clientsInProgress.length > 0 && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{clientsInProgress.length} checking in</p>
        )}
      </div>

      {/* Last edited */}
      <p className="hidden truncate text-sm text-muted-foreground md:block">{editedAgo(program)}</p>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center justify-end gap-1 md:w-[108px]" onClick={e => e.stopPropagation()}>
        <Button onClick={onAssign} size="sm" variant="outline">Assign</Button>
        <ProgramActionsMenu onEdit={onEdit} onDuplicate={onDuplicate} onArchive={onArchive} onDelete={onDelete} />
      </div>
    </div>
  );
}
