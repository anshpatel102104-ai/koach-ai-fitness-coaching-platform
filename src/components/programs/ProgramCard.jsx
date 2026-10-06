import React from 'react';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, ClientStack, ProgramActionsMenu, editedAgo, programSubline } from './ProgramListRow';

/** Card view of a program — the same facts as the table row, on a flat panel. */
export default function ProgramCard({
  program,
  clientsAssigned = [],
  onEdit,
  onDuplicate,
  onAssign,
  onPreview,
  onArchive,
  onDelete,
}) {
  const goal = CATEGORY_LABELS[program.category] || 'Custom';
  const workouts = program.workouts || [];
  const days = [...new Set(workouts.map(w => w.day_name).filter(Boolean))].slice(0, Number(program.days_per_week) || 4);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPreview}
      onKeyDown={e => { if (e.key === 'Enter') onPreview?.(); }}
      className="panel flex cursor-pointer flex-col transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">
            {goal}{program.duration_weeks ? `, ${program.duration_weeks} weeks` : ''}
          </p>
          <div className="-mr-2 -mt-1.5" onClick={e => e.stopPropagation()}>
            <ProgramActionsMenu onPreview={onPreview} onEdit={onEdit} onDuplicate={onDuplicate} onArchive={onArchive} onDelete={onDelete} />
          </div>
        </div>
        <div>
          <h3 className="line-clamp-2 text-[20px] text-foreground">{program.title || 'Untitled program'}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{programSubline(program) || 'No details yet'}</p>
        </div>
        {days.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {days.map(d => (
              <span key={d} className="rounded-md bg-secondary px-2 py-1 text-[13px] font-medium text-foreground">{d}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
        <ClientStack clients={clientsAssigned} />
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <span className="hidden text-[13px] text-muted-foreground xl:inline">{editedAgo(program)}</span>
          <Button onClick={onAssign} size="sm" variant="outline">Assign</Button>
        </div>
      </div>
    </div>
  );
}
