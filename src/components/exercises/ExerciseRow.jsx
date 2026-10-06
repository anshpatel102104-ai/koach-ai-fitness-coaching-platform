import React, { useState } from 'react';
import { MoreHorizontal, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { openFileUrl } from '@/lib/storageUrls';
import ExerciseVideoDialog from './ExerciseVideoDialog';
import { cap, demoKind } from './ExerciseCard';

/** Shared grid template for the exercise table header + rows. */
export const EXERCISE_TABLE_COLS = 'md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_40px] md:items-center md:gap-4';

export default function ExerciseRow({ exercise, onView, onEdit, onDelete }) {
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const demo = demoKind(exercise);
  const sub = exercise.description || (exercise.movement_pattern ? `${cap(exercise.movement_pattern)} pattern` : '');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={e => { if (e.key === 'Enter') onView?.(); }}
      className={`flex cursor-pointer items-center gap-3 border-b border-border px-5 py-3 transition-colors last:border-b-0 hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none sm:px-6 ${EXERCISE_TABLE_COLS}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">
          {exercise.name}
          {exercise.is_coach_branded && exercise.video_url && <span className="ml-2 text-[13px] font-medium text-muted-foreground">Your demo</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          <span className="md:hidden">{[exercise.muscle_group && cap(exercise.muscle_group), exercise.equipment && cap(exercise.equipment), demo ? `${demo.toLowerCase()} demo` : 'no demo'].filter(Boolean).join(', ')}</span>
          <span className="hidden md:inline">{sub || ' '}</span>
        </p>
      </div>
      <p className="hidden truncate text-[15px] text-foreground md:block">{exercise.muscle_group ? cap(exercise.muscle_group) : '—'}</p>
      <p className="hidden truncate text-[15px] text-foreground md:block">{exercise.equipment ? cap(exercise.equipment) : '—'}</p>
      <p className="hidden truncate text-[15px] text-foreground md:block">{exercise.difficulty ? cap(exercise.difficulty) : '—'}</p>
      <div className="hidden md:block">
        {demo === 'Video' ? (
          <span className="inline-flex items-center gap-1.5 text-[15px] text-foreground"><Play className="h-3.5 w-3.5" fill="currentColor" />Video</span>
        ) : demo ? (
          <span className="text-[15px] text-foreground">Photo</span>
        ) : (
          <span className="text-[15px] text-muted-foreground">None</span>
        )}
      </div>
      <div className="flex flex-shrink-0 justify-end" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Options for ${exercise.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            {exercise.video_url && <DropdownMenuItem onClick={() => openFileUrl(exercise.video_url)}>Open video</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => setVideoDialogOpen(true)}>{exercise.video_url ? 'Replace video' : 'Add video'}</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ExerciseVideoDialog exercise={exercise} open={videoDialogOpen} onOpenChange={setVideoDialogOpen} />
      </div>
    </div>
  );
}
