import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Pin, Mic, Video, Tag, Check, CheckCheck, Download, FileText, Megaphone, Play, Pause, AlertCircle } from 'lucide-react';
import { TAG_COLORS } from './MessageTemplates';
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
  const trackBg    = isCoach ? 'color-mix(in srgb, white 25%, transparent)' : 'var(--tc-border)';
  const fillBg     = isCoach ? 'color-mix(in srgb, white 85%, transparent)' : 'var(--tc-primary)';
  const iconColor  = isCoach ? 'text-white'             : 'text-primary';
  const timeColor  = isCoach ? 'text-white/70'          : 'text-muted-foreground';
  const btnBg      = isCoach ? 'bg-[var(--kc-w-20)] hover:bg-[var(--kc-w-30)]' : 'bg-primary/10 hover:bg-primary/20';

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 min-w-[200px] py-0.5', isCoach ? 'text-white/70' : 'text-muted-foreground')}>
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
        <div className={cn('flex justify-between text-[10px]', timeColor)}>
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
    <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
      <CheckCheck className="w-3 h-3" /> Read
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
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
        className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity mt-1 object-cover"
      />
      {expanded && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setExpanded(false)}
        >
          <SignedImg src={url} alt="full" className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" />
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
        'flex items-center gap-2 mt-1 px-3 py-2 rounded-xl border transition-colors',
        isCoach
          ? 'border-white/20 bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)]'
          : 'border-border bg-muted hover:bg-accent/10'
      )}
    >
      <FileText className={cn('w-4 h-4 flex-shrink-0', isCoach ? 'text-white/70' : 'text-primary')} />
      <span className={cn('text-xs font-medium truncate max-w-[160px]', isCoach ? 'text-white/90' : 'text-foreground')}>
        {fileName}
      </span>
      <Download className={cn('w-3.5 h-3.5 flex-shrink-0 ml-auto', isCoach ? 'text-white/70' : 'text-primary')} />
    </SignedLink>
  );
}

export function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-semibold text-muted-foreground px-2">{date}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function MessageBubble({ msg, onTogglePin, isFirst = true, isLast = true, clientName, clientAvatar }) {
  const isCoach = msg.sender === 'coach';

  // Detect media type from URL
  const url = msg.media_url;
  const isImage = url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isFile = url && !isImage && msg.media_type === 'text';

  return (
    <div className={cn('flex group gap-2', isCoach ? 'flex-row-reverse' : 'flex-row', !isFirst && 'mt-0.5')}>
      {/* Client avatar — only on first message in group */}
      {!isCoach && (
        <div className="flex-shrink-0 self-end w-7">
          {isLast ? (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] overflow-hidden">
              {clientAvatar
                ? <SignedImg src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
                : (clientName?.[0] || '?').toUpperCase()
              }
            </div>
          ) : null}
        </div>
      )}

      <div className={cn('max-w-[72%] flex flex-col', isCoach ? 'items-end' : 'items-start')}>
        {/* Broadcast label — only visible to coach */}
        {msg.is_broadcast && isFirst && isCoach && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium w-fit mb-1 bg-ai/10 text-ai border-ai">
            <Megaphone className="w-2.5 h-2.5" />
            Broadcast
          </div>
        )}
        {/* Tag */}
        {msg.tag && msg.tag !== 'general' && isFirst && !msg.is_broadcast && (
          <div className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium w-fit mb-1', TAG_COLORS[msg.tag] || '')}>
            <Tag className="w-2.5 h-2.5" />
            {msg.tag.replace('_', '-')}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {/* Pin button */}
          <button
            onClick={() => onTogglePin(msg)}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted',
              isCoach ? 'order-last' : 'order-first'
            )}
          >
            <Pin className={cn('w-3 h-3', msg.is_pinned ? 'text-warning fill-warning' : 'text-muted-foreground')} />
          </button>

          {/* Bubble */}
          <div className={cn(
            'px-4 py-2.5 text-sm leading-relaxed',
            isCoach
              ? 'text-white'
              : 'bg-card border border-border text-foreground shadow-sm',
            // Rounding based on position in group
            isCoach && isFirst && isLast && 'rounded-2xl rounded-br-md',
            isCoach && isFirst && !isLast && 'rounded-2xl rounded-br-sm',
            isCoach && !isFirst && isLast && 'rounded-xl rounded-br-md',
            isCoach && !isFirst && !isLast && 'rounded-xl',
            !isCoach && isFirst && isLast && 'rounded-2xl rounded-bl-md',
            !isCoach && isFirst && !isLast && 'rounded-2xl rounded-bl-sm',
            !isCoach && !isFirst && isLast && 'rounded-xl rounded-bl-md',
            !isCoach && !isFirst && !isLast && 'rounded-xl',
            msg.is_pinned && 'ring-2 ring-warning/50',
            isCoach && 'bg-gradient-to-br from-primary to-ai',
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
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(msg.created_date), 'h:mm a')}
            </span>
            <ReadReceipt msg={msg} />
          </div>
        )}
      </div>
    </div>
  );
}