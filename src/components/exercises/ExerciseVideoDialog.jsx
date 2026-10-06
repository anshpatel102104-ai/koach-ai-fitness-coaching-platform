import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** Add or replace an exercise's demo video by link (YouTube, Vimeo or a direct file). */
export default function ExerciseVideoDialog({ exercise, open, onOpenChange }) {
  const [videoUrl, setVideoUrl] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => { if (!open) setVideoUrl(''); }, [open]);

  const updateVideoMutation = useMutation({
    mutationFn: ({ url }) => {
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      let thumbnailUrl = '';
      if (isYoutube) {
        const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
        if (match) thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
      return db.entities.ExerciseLibrary.update(exercise.id, {
        video_url: url,
        thumbnail_url: thumbnailUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Demo video saved');
      onOpenChange(false);
      setVideoUrl('');
    },
  });

  const handleAddVideo = () => {
    if (!videoUrl.trim()) {
      toast.error('Paste a video link first');
      return;
    }
    updateVideoMutation.mutate({ url: videoUrl.trim() });
  };

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={e => e.stopPropagation()}>
        <div>
          <DialogTitle className="text-[22px]">{exercise.video_url ? 'Replace the demo' : 'Add a demo'}</DialogTitle>
          <DialogDescription className="mt-1">{exercise.name}. YouTube, Vimeo or a direct video link.</DialogDescription>
        </div>
        <Input
          placeholder="https://www.youtube.com/watch?v=…"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); setVideoUrl(''); }}>Cancel</Button>
          <Button className="flex-1" onClick={handleAddVideo} disabled={updateVideoMutation.isPending}>
            {updateVideoMutation.isPending ? 'Saving…' : 'Save video'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
