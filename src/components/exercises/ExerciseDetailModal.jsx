import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Play } from 'lucide-react';
import { KeyValue, Stat } from '@/components/kit';
import { SignedImg, SignedVideo } from '@/components/shared/SignedImage';

const cap = (v = '') => {
  const t = String(v).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function VideoPlayer({ url, imageUrl, thumbnailUrl, name }) {
  const [playing, setPlaying] = useState(false);

  const isYoutube = url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'));
  const isVimeo = url && url.includes('vimeo.com');
  const isDirect = url && (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov'));

  const getEmbedUrl = () => {
    if (isYoutube) {
      const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1` : url;
    }
    if (isVimeo) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
    }
    return url;
  };

  let thumb = thumbnailUrl;
  if (!thumb && isYoutube) {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (match) thumb = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }

  // If has a video URL
  if (url) {
    if (isDirect) {
      return (
        <SignedVideo className="w-full aspect-video rounded-xl bg-black object-contain"
          src={url} controls playsInline preload="metadata" poster={thumb || imageUrl} />
      );
    }
    if (playing) {
      return (
        <iframe className="w-full aspect-video rounded-xl"
          src={getEmbedUrl()} allow="autoplay; fullscreen" allowFullScreen title={name} />
      );
    }
    const displayThumb = thumb || imageUrl;
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer group" onClick={() => setPlaying(true)}>
        {displayThumb
          ? <SignedImg src={displayThumb} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-muted" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
          <span className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2.5 text-sm font-semibold text-foreground">
            <Play className="h-4 w-4" fill="currentColor" /> Play demo
          </span>
        </div>
      </div>
    );
  }

  // No video — show image if available
  if (imageUrl) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-muted">
        <SignedImg src={imageUrl} alt={name} className="w-full object-cover max-h-64" onError={e => { e.target.style.display = 'none'; }} />
      </div>
    );
  }

  // Nothing at all
  return (
    <div className="flex aspect-[16/5] w-full items-center justify-center rounded-xl bg-secondary">
      <p className="text-sm text-muted-foreground">No demo yet. Add a video link with Edit.</p>
    </div>
  );
}

export default function ExerciseDetailModal({ exercise, open, onClose, onEdit }) {
  if (!exercise) return null;

  // Use instructions if present, fall back to form_cues
  const steps = (exercise.instructions?.length > 0 ? exercise.instructions : exercise.form_cues) || [];
  const facts = [
    exercise.muscle_group && ['Muscle', cap(exercise.muscle_group)],
    exercise.secondary_muscles?.length > 0 && ['Also works', exercise.secondary_muscles.map(cap).join(', ')],
    exercise.equipment && ['Equipment', cap(exercise.equipment)],
    exercise.movement_pattern && ['Pattern', cap(exercise.movement_pattern)],
    exercise.difficulty && ['Level', cap(exercise.difficulty)],
    exercise.category && ['Category', cap(exercise.category)],
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl sm:p-0 sm:block">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <VideoPlayer
            url={exercise.video_url}
            imageUrl={exercise.image_url}
            thumbnailUrl={exercise.thumbnail_url}
            name={exercise.name}
          />
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {exercise.is_coach_branded && exercise.video_url && <p className="mb-1 text-sm font-medium text-muted-foreground">Your demo</p>}
              <DialogTitle className="text-[28px] text-foreground">{exercise.name}</DialogTitle>
              {exercise.description && (
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{exercise.description}</p>
              )}
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="mr-8 flex-shrink-0">Edit</Button>
            )}
          </div>

          {(facts.length > 0 || exercise.tempo || exercise.default_rest_seconds) && (
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div>
                {facts.map(([label, value]) => <KeyValue key={label} label={label} value={value} />)}
              </div>
              {(exercise.tempo || exercise.default_rest_seconds) && (
                <div className="mt-4 flex gap-8 sm:mt-1">
                  {exercise.tempo && <Stat label="Tempo" value={exercise.tempo} sub="Down, pause, up, pause" size="sm" />}
                  {exercise.default_rest_seconds ? <Stat label="Rest" value={exercise.default_rest_seconds} unit="s" sub="Between sets" size="sm" /> : null}
                </div>
              )}
            </div>
          )}

          {steps.length > 0 && (
            <div>
              <h3 className="mb-2 text-[18px] text-foreground">How to do it</h3>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
                    <span className="num w-5 flex-shrink-0 text-[17px] text-muted-foreground">{i + 1}</span>
                    <span>{String(step).replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {exercise.common_mistakes?.length > 0 && (
            <div>
              <h3 className="mb-2 text-[18px] text-foreground">Common mistakes</h3>
              <ul className="space-y-1.5">
                {exercise.common_mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] text-foreground">
                    <AlertTriangle className="mt-1 h-4 w-4 flex-shrink-0 text-warning" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {exercise.notes && (
            <div className="rounded-xl bg-secondary p-4">
              <p className="mb-1 text-[13px] text-muted-foreground">Your notes, not shown to clients</p>
              <p className="text-[15px] text-foreground">{exercise.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
