import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { SignedImg, SignedVideo } from '@/components/shared/SignedImage';

const MUSCLE_COLORS = {
  chest:     'bg-destructive/10 text-destructive',
  back:      'bg-success/10 text-success',
  shoulders: 'bg-ai/10 text-ai',
  biceps:    'bg-accent text-primary',
  triceps:   'bg-accent text-primary',
  legs:      'bg-orange-50 text-orange-700',
  glutes:    'bg-pink-50 text-pink-700',
  core:      'bg-warning/10 text-warning',
  full_body: 'bg-accent text-primary',
  cardio:    'bg-teal-50 text-teal-700',
};

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
        <SignedVideo className="w-full rounded-2xl bg-black" style={{ maxHeight: 240 }}
          src={url} controls playsInline preload="metadata" poster={displayImg} />
      );
    }
    if (playing) {
      return (
        <iframe className="w-full rounded-2xl" style={{ height: 220 }}
          src={getEmbedUrl()} allow="autoplay; fullscreen" allowFullScreen title={name} />
      );
    }
    return (
      <div className="relative w-full rounded-2xl overflow-hidden cursor-pointer" style={{ height: 220 }}
        onClick={() => setPlaying(true)}>
        {displayImg
          ? <SignedImg src={displayImg} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-muted" />}
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-card shadow-xl flex items-center justify-center">
            <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          Watch Demo
        </div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="w-full rounded-2xl overflow-hidden bg-muted" style={{ maxHeight: 240 }}>
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
  const muscleClass = MUSCLE_COLORS[exercise.muscle_group] || 'bg-muted text-muted-foreground';
  const hasMedia = exercise.video_url || exercise.image_url;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Close */}
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(90vh - 24px)' }}>

              {/* Media */}
              {hasMedia && (
                <div className="mb-4">
                  <VideoEmbed url={exercise.video_url} imageUrl={exercise.image_url} name={exercise.name} />
                </div>
              )}

              {/* Name + tags */}
              <h2 className="text-xl font-black text-foreground mb-2">{exercise.name}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {exercise.muscle_group && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${muscleClass}`}>
                    {exercise.muscle_group.replace('_', ' ')}
                  </span>
                )}
                {exercise.equipment && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {exercise.equipment.replace('_', ' ')}
                  </span>
                )}
                {exercise.difficulty && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                    exercise.difficulty === 'beginner' ? 'bg-success/10 text-success' :
                    exercise.difficulty === 'advanced' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                  }`}>{exercise.difficulty}</span>
                )}
              </div>

              {exercise.description && (
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{exercise.description}</p>
              )}

              {/* Secondary muscles */}
              {exercise.secondary_muscles?.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Also Works</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondary_muscles.map(m => (
                      <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-step instructions */}
              {steps.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">How to Perform</p>
                  <div className="space-y-2.5">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-muted">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                          style={{ background: 'rgb(var(--primary))', minWidth: 24 }}>
                          {i + 1}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Mistakes (collapsible) */}
              {exercise.common_mistakes?.length > 0 && (
                <div className="mb-4">
                  <button onClick={() => setShowMistakes(v => !v)}
                    className="w-full flex items-center justify-between py-3 text-sm font-semibold text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Common Mistakes to Avoid
                    </span>
                    {showMistakes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showMistakes && (
                    <div className="space-y-2">
                      {exercise.common_mistakes.map((m, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10">
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
                <div className="p-4 rounded-2xl bg-accent mb-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Coach Notes</p>
                  <p className="text-sm text-foreground">{exercise.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}