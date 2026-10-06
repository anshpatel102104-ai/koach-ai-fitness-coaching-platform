import React, { useState } from 'react';
import { Play, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';
import { openFileUrl } from '@/lib/storageUrls';
import ExerciseVideoDialog from './ExerciseVideoDialog';

export const cap = (s = '') => {
  const t = String(s).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** "Video", "Photo" or null for an exercise's demo. */
export function demoKind(exercise) {
  if (exercise.video_url) return 'Video';
  if (exercise.thumbnail_url || exercise.image_url) return 'Photo';
  return null;
}

function MediaThumbnail({ url, imageUrl, thumbnailUrl, name }) {
  const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));

  let thumb = thumbnailUrl;
  if (!thumb && isYoutube) {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (match) thumb = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  const displayImg = thumb || imageUrl;

  if (displayImg) {
    return (
      <div className="relative h-full w-full">
        <SignedImg src={displayImg} alt={name} className="h-full w-full object-cover"
          onError={e => { e.target.style.display = 'none'; }} />
        {url && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[12px] font-semibold text-primary-foreground">
            <Play className="h-3 w-3" fill="currentColor" /> Video
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-secondary">
      <span className="text-[13px] text-muted-foreground">{url ? 'Video, no preview' : 'No demo yet'}</span>
    </div>
  );
}

/** Card view of an exercise. Same actions as the table row. */
export default function ExerciseCard({ exercise, onView, onEdit, onDelete, compact = false }) {
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  const handleOpenVideo = () => {
    if (exercise.video_url) openFileUrl(exercise.video_url);
  };

  const sub = [exercise.muscle_group && cap(exercise.muscle_group), exercise.equipment && cap(exercise.equipment), exercise.difficulty && cap(exercise.difficulty)].filter(Boolean).join(', ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={e => { if (e.key === 'Enter') onView?.(); }}
      className={cn('panel group cursor-pointer overflow-hidden transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', compact && 'flex items-center gap-3 p-3')}
    >
      {!compact && (
        <div className="relative h-40 overflow-hidden bg-secondary">
          <MediaThumbnail url={exercise.video_url} imageUrl={exercise.image_url} thumbnailUrl={exercise.thumbnail_url} name={exercise.name} />
        </div>
      )}

      <div className={cn('flex items-start gap-2 p-4', compact && 'flex-1 p-0')}>
        <div className="min-w-0 flex-1">
          <h3 className={cn('truncate text-foreground', compact ? 'text-[15px]' : 'text-[18px]')}>{exercise.name}</h3>
          {sub && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{sub}</p>}
          {exercise.description && !compact && (
            <p className="mt-1.5 line-clamp-2 text-[13px] text-foreground/80">{exercise.description}</p>
          )}
          {exercise.is_coach_branded && exercise.video_url && !compact && (
            <p className="mt-1.5 text-[13px] font-medium text-foreground">Your demo</p>
          )}
        </div>
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="touch-compact -mr-1.5 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Options for ${exercise.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              {exercise.video_url && <DropdownMenuItem onClick={handleOpenVideo}>Open video</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => setVideoDialogOpen(true)}>{exercise.video_url ? 'Replace video' : 'Add video'}</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div onClick={e => e.stopPropagation()}>
        <ExerciseVideoDialog exercise={exercise} open={videoDialogOpen} onOpenChange={setVideoDialogOpen} />
      </div>
    </div>
  );
}
