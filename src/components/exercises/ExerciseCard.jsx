import React, { useState } from 'react';
import { Play, Star, Edit, Trash2, MoreHorizontal, ExternalLink, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase as base44 } from '@/api/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';
import { openFileUrl } from '@/lib/storageUrls';

const MUSCLE_COLORS = {
  chest: 'text-chart-1 bg-chart-1/10',
  back: 'text-chart-2 bg-chart-2/10',
  shoulders: 'text-chart-3 bg-chart-3/10',
  biceps: 'text-primary bg-primary/10',
  triceps: 'text-primary bg-primary/10',
  legs: 'text-chart-5 bg-chart-5/10',
  glutes: 'text-chart-5 bg-chart-5/10',
  core: 'text-chart-4 bg-chart-4/10',
  full_body: 'text-accent bg-accent/10',
  cardio: 'text-accent bg-accent/10',
};

function MediaThumbnail({ url, imageUrl, thumbnailUrl, name }) {
  const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));

  let thumb = thumbnailUrl;
  if (!thumb && isYoutube) {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (match) thumb = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  // Fall back to exercise photo
  const displayImg = thumb || imageUrl;

  if (displayImg) {
    return (
      <div className="relative w-full h-full">
        <SignedImg src={displayImg} alt={name} className="w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none'; }} />
        {url && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-[var(--kc-w-90)] flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 text-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
        <Play className="w-4 h-4 text-primary ml-0.5" />
      </div>
      <span className="text-xs text-muted-foreground">{url ? 'Video' : 'No demo'}</span>
    </div>
  );
}

export default function ExerciseCard({ exercise, onView, onEdit, onDelete, compact = false }) {
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const queryClient = useQueryClient();
  const muscleColor = MUSCLE_COLORS[exercise.muscle_group] || 'text-muted-foreground bg-secondary';

  const updateVideoMutation = useMutation({
    mutationFn: ({ url }) => {
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      let thumbnailUrl = '';
      if (isYoutube) {
        const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
        if (match) thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
      return base44.entities.ExerciseLibrary.update(exercise.id, {
        video_url: url,
        thumbnail_url: thumbnailUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Video added!');
      setVideoDialogOpen(false);
      setVideoUrl('');
    },
  });

  const handleAddVideo = () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }
    updateVideoMutation.mutate({ url: videoUrl.trim() });
  };

  const handleOpenVideo = (e) => {
    e.stopPropagation();
    if (exercise.video_url) {
      openFileUrl(exercise.video_url);
    }
  };

  return (
    <div
      className={cn(
        "group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 hover:shadow-md transition-all cursor-pointer shadow-sm",
        compact && "flex gap-3 p-3 items-center"
      )}
      onClick={onView}
    >
      {!compact && (
        <div className="relative h-44 bg-muted overflow-hidden">
          <MediaThumbnail url={exercise.video_url} imageUrl={exercise.image_url} thumbnailUrl={exercise.thumbnail_url} name={exercise.name} />
          {exercise.is_coach_branded && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-chart-4/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
              <Star className="w-2.5 h-2.5" fill="currentColor" /> Coach
            </div>
          )}
          {exercise.difficulty && (
            <div className={cn(
              "absolute bottom-2 left-2 text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize",
              exercise.difficulty === 'beginner' ? 'bg-success/90 text-success' :
              exercise.difficulty === 'intermediate' ? 'bg-warning/90 text-warning' :
              'bg-destructive/90 text-destructive'
            )}>
              {exercise.difficulty}
            </div>
          )}
          <div className="absolute top-2 right-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {exercise.video_url && (
              <Button
                size="icon"
                className="h-7 w-7 bg-[var(--kc-w-90)] hover:bg-card text-foreground shadow"
                onClick={handleOpenVideo}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setVideoDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" /> {exercise.video_url ? 'Update' : 'Add'} Video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className={cn("p-4", compact && "p-0 flex-1")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-heading font-semibold leading-tight truncate text-foreground", compact ? "text-sm" : "text-base")}>{exercise.name}</h3>
            {exercise.description && !compact && (
            <p className="text-xs text-foreground mt-1 line-clamp-2">{exercise.description}</p>
            )}
          </div>
          {compact && exercise.video_url && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
            </div>
          )}
        </div>

        <div className={cn("flex flex-wrap gap-1.5", compact ? "mt-1" : "mt-3")}>
          {exercise.muscle_group && (
            <Badge className={cn("text-[10px] px-2 py-0 border-0", muscleColor)}>
              {exercise.muscle_group.replace('_', ' ')}
            </Badge>
          )}
          {exercise.equipment && (
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {exercise.equipment.replace('_', ' ')}
            </Badge>
          )}
          {exercise.movement_pattern && !compact && (
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {exercise.movement_pattern}
            </Badge>
          )}
        </div>
        </div>

        {/* Video URL Dialog */}
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{exercise.video_url ? 'Update' : 'Add'} Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Video URL</p>
              <Input
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">YouTube, Vimeo, or direct video link</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setVideoDialogOpen(false); setVideoUrl(''); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-input hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVideo}
                disabled={updateVideoMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-60"
              >
                {updateVideoMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </DialogContent>
        </Dialog>
        </div>
        );
        }