import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { SignedImg, SignedVideo } from '@/components/shared/SignedImage';

function VideoEmbed({ url, imageUrl, name }) {
  const [playing, setPlaying] = useState(false);

  const isYoutube = url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'));
  const isVimeo = url && url.includes('vimeo.com');
  const isDirect = url && (url.endsWith('.mp4') || url.endsWith('.webm'));

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

  let thumb = null;
  if (isYoutube) {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (match) thumb = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  const displayImg = thumb || imageUrl;

  if (url) {
    if (isDirect) {
      return (
        <SignedVideo className="w-full rounded-xl bg-black" style={{ maxHeight: 240 }}
          src={url} controls playsInline preload="metadata" poster={displayImg} />
      );
    }
    if (playing) {
      return (
        <iframe className="w-full rounded-xl" style={{ height: 220 }}
          src={getEmbedUrl()} allow="autoplay; fullscreen" allowFullScreen title={name} />
      );
    }
    return (
      <div className="relative w-full rounded-xl overflow-hidden cursor-pointer bg-sidebar" style={{ height: 220 }}
        onClick={() => setPlaying(true)}>
        {displayImg
          ? <SignedImg src={displayImg} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-sidebar" />}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white">
            <Play className="w-6 h-6 ml-1" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-3 left-3 text-white/90 text-[13px]">
          Demo video
        </div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-secondary" style={{ maxHeight: 240 }}>
        <SignedImg src={imageUrl} alt={name} className="w-full object-cover"
          onError={e => { e.target.parentElement.style.display = 'none'; }} />
      </div>
    );
  }

  return null;
}

export default function ExerciseInfoSheet({ exercise, open, onClose }) {
  const [showMistakes, setShowMistakes] = useState(false);

  if (!exercise) return null;

  const steps = (exercise.instructions?.length > 0 ? exercise.instructions : exercise.form_cues) || [];
  const hasMedia = exercise.video_url || exercise.image_url;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80]"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-[80] mx-auto w-full max-w-[480px] bg-card rounded-t-xl overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            <div className="h-4" />

            {/* Close */}
            <button onClick={onClose}
              aria-label="Close"
              className="touch-compact absolute top-4 right-4 z-10 w-9 h-9 rounded-lg bg-card shadow-[0_0_0_1px_rgb(var(--border))] flex items-center justify-center">
              <X className="w-4 h-4 text-foreground" />
            </button>

            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(90vh - 24px)' }}>

              {/* Media */}
              {hasMedia && (
                <div className="mb-4">
                  <VideoEmbed url={exercise.video_url} imageUrl={exercise.image_url} name={exercise.name} />
                </div>
              )}

              {/* Name + tags */}
              <h2 className="text-[28px] text-foreground mb-2 pr-12">{exercise.name}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {exercise.muscle_group && (
                  <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-foreground capitalize">
                    {exercise.muscle_group.replace('_', ' ')}
                  </span>
                )}
                {exercise.equipment && (
                  <span className="text-[13px] font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                    {exercise.equipment.replace('_', ' ')}
                  </span>
                )}
                {exercise.difficulty && (
                  <span className="text-[13px] font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{exercise.difficulty}</span>
                )}
              </div>

              {exercise.description && (
                <p className="text-[15px] text-muted-foreground mb-5 leading-relaxed">{exercise.description}</p>
              )}

              {/* Secondary muscles */}
              {exercise.secondary_muscles?.length > 0 && (
                <div className="mb-5">
                  <p className="text-[13px] text-muted-foreground mb-2">Also works</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondary_muscles.map(m => (
                      <span key={m} className="text-[13px] px-2 py-0.5 rounded-full bg-secondary text-foreground">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-step instructions */}
              {steps.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-lg text-foreground mb-2">How to do it</h3>
                  <ol className="divide-y divide-border">
                    {steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 py-2.5">
                        <span className="num text-lg text-foreground w-5 flex-shrink-0">{i + 1}</span>
                        <p className="text-[15px] text-foreground leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Common Mistakes (collapsible) */}
              {exercise.common_mistakes?.length > 0 && (
                <div className="mb-4">
                  <button onClick={() => setShowMistakes(v => !v)}
                    className="w-full flex items-center justify-between py-3 text-[15px] font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Common mistakes
                    </span>
                    {showMistakes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showMistakes && (
                    <div className="space-y-2">
                      {exercise.common_mistakes.map((m, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-soft">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground leading-relaxed">{m}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Coach notes */}
              {exercise.notes && (
                <div className="px-4 py-3 rounded-lg bg-secondary mb-2 text-[15px] text-foreground">
                  <span className="font-bold">Coach note:</span> {exercise.notes}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}