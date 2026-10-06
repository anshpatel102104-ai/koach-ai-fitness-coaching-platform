import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Pin, Mic, Video, Tag, Check, CheckCheck, Download, FileText, Megaphone, Play, Pause, AlertCircle } from 'lucide-react';
import { TAG_LABELS } from './MessageTemplates';
import { SignedImg, SignedAudio, SignedVideo, SignedLink } from '@/components/shared/SignedImage';

// ── Custom voice player ──────────────────────────────────────────────────────
function VoicePlayer({ url, durationSeconds, isCoach }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fmt = (s) => {
    const t = Math.floor(s || 0);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime   = () => setCurrentTime(audio.currentTime);
    const onMeta   = () => { setDuration(audio.duration); setLoaded(true); };
    const onEnded  = () => { setPlaying(false); setCurrentTime(0); };
    const onError  = () => { setError(true); setPlaying(false); };
    audio.addEventListener('timeupdate',      onTime);
    audio.addEventListener('loadedmetadata',  onMeta);
    audio.addEventListener('ended',           onEnded);
    audio.addEventListener('error',           onError);
    return () => {
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('error',          onError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else         { audio.play().then(() => setPlaying(true)).catch(() => setError(true)); }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Colour tokens depending on whose bubble it's in
  const trackBg    = isCoach ? 'rgb(var(--primary-foreground) / 0.25)' : 'rgb(var(--border))';
  const fillBg     = isCoach ? 'rgb(var(--primary-foreground) / 0.85)' : 'rgb(var(--foreground))';
  const iconColor  = isCoach ? 'text-primary-foreground' : 'text-foreground';
  const timeColor  = isCoach ? 'text-primary-foreground/70' : 'text-muted-foreground';
  const btnBg      = isCoach ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25' : 'bg-secondary hover:bg-accent';

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 min-w-[200px] py-0.5', isCoach ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">Audio unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[220px] py-0.5">
      {/* Hidden native audio element */}
      <SignedAudio ref={audioRef} src={url} preload="metadata" />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors', btnBg)}
      >
        {playing
          ? <Pause className={cn('w-3.5 h-3.5', iconColor)} />
          : <Play  className={cn('w-3.5 h-3.5 translate-x-px', iconColor)} />
        }
      </button>

      {/* Progress bar + times */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Scrubber track */}
        <div
          className="relative h-1.5 rounded-full cursor-pointer"
          style={{ background: trackBg }}
          onClick={handleSeek}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: fillBg }}
          />
        </div>
        {/* Time row */}
        <div className={cn('flex justify-between text-[12px] tabular-nums', timeColor)}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Mic icon */}
      <Mic className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-50', iconColor)} />
    </div>
  );
}

function ReadReceipt({ msg }) {
  if (msg.sender !== 'coach') return null;
  if (msg.is_read) return (
    <span className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
      <CheckCheck className="w-3 h-3" /> Read
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
      <Check className="w-3 h-3" /> Sent
    </span>
  );
}

function ImageAttachment({ url }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <SignedImg
        src={url}
        alt="attachment"
        onClick={() => setExpanded(true)}
        className="max-w-[220px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity mt-1 object-cover"
      />
      {expanded && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setExpanded(false)}
        >
          <SignedImg src={url} alt="full" className="max-w-[90vw] max-h-[90vh] rounded-xl" />
        </div>
      )}
    </>
  );
}

function FileAttachment({ url, isCoach }) {
  const fileName = url.split('/').pop()?.split('?')[0] || 'attachment';
  return (
    <SignedLink
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border transition-colors',
        isCoach
          ? 'border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20'
          : 'border-border bg-secondary hover:bg-accent'
      )}
    >
      <FileText className={cn('w-4 h-4 flex-shrink-0', isCoach ? 'text-primary-foreground/70' : 'text-muted-foreground')} />
      <span className={cn('text-sm font-medium truncate max-w-[160px]', isCoach ? 'text-primary-foreground' : 'text-foreground')}>
        {fileName}
      </span>
      <Download className={cn('w-3.5 h-3.5 flex-shrink-0 ml-auto', isCoach ? 'text-primary-foreground/70' : 'text-muted-foreground')} />
    </SignedLink>
  );
}

export function DateSeparator({ date }) {
  return (
    <div className="flex justify-center my-5">
      <span className="text-[13px] font-medium text-muted-foreground">{date}</span>
    </div>
  );
}

export default function MessageBubble({ msg, onTogglePin, isFirst = true, isLast = true }) {
  const isCoach = msg.sender === 'coach';

  // Detect media type from URL
  const url = msg.media_url;
  const isImage = url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isFile = url && !isImage && msg.media_type === 'text';

  return (
    <div className={cn('flex group', isCoach ? 'justify-end' : 'justify-start', isFirst ? 'mt-3' : 'mt-1')}>
      <div className={cn('max-w-[85%] sm:max-w-[68%] lg:max-w-[60%] flex flex-col', isCoach ? 'items-end' : 'items-start')}>
        {/* Broadcast label — only visible to coach */}
        {msg.is_broadcast && isFirst && isCoach && (
          <div className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground mb-1">
            <Megaphone className="w-3 h-3" />
            Broadcast
          </div>
        )}
        {/* Tag */}
        {msg.tag && msg.tag !== 'general' && isFirst && !msg.is_broadcast && (
          <div className={cn('flex items-center gap-1 text-[12px] font-medium mb-1', msg.tag === 'urgent' ? 'text-destructive' : 'text-muted-foreground')}>
            <Tag className="w-3 h-3" />
            {TAG_LABELS[msg.tag] || msg.tag.replace('_', ' ')}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {/* Pin button */}
          <button
            onClick={() => onTogglePin(msg)}
            className={cn(
              'touch-compact opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent',
              isCoach ? 'order-last' : 'order-first'
            )}
          >
            <Pin className={cn('w-3.5 h-3.5', msg.is_pinned ? 'text-foreground fill-foreground' : 'text-muted-foreground')} />
          </button>

          {/* Bubble */}
          <div className={cn(
            'px-4 py-3 text-[15px] leading-relaxed rounded-xl',
            isCoach ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground',
            msg.is_pinned && 'ring-2 ring-foreground/30',
          )}>
            {/* Voice */}
            {msg.media_type === 'voice' && (
              <VoicePlayer
                url={url}
                durationSeconds={msg.duration_seconds}
                isCoach={isCoach}
              />
            )}
            {/* Video */}
            {msg.media_type === 'video' && (
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-3.5 h-3.5 opacity-70" />
                <span className="text-xs opacity-70">Video Reply</span>
                {url && <SignedVideo controls src={url} className="max-w-[200px] rounded mt-1" />}
              </div>
            )}
            {/* Image attachment */}
            {isImage && <ImageAttachment url={url} />}
            {/* File attachment */}
            {isFile && url && <FileAttachment url={url} isCoach={isCoach} />}

            {msg.content && <p>{msg.content}</p>}
          </div>
        </div>

        {/* Timestamp + read receipt — only on last in group */}
        {isLast && (
          <div className={cn('flex items-center gap-1.5 mt-1 px-1', isCoach ? 'flex-row-reverse' : 'flex-row')}>
            <span className="text-[12px] text-muted-foreground">
              {format(new Date(msg.created_date), 'h:mm aaa')}
            </span>
            <ReadReceipt msg={msg} />
          </div>
        )}
      </div>
    </div>
  );
}