import React, { useEffect, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const SLOT_HEIGHT = 64;

export const SESSION_TYPE_LABELS = {
  check_in: 'Check-in call',
  strategy: 'Strategy session',
  assessment: 'Assessment',
  video_call: 'Video call',
  in_person: 'In person',
  consultation: 'Consultation',
  program_review: 'Program review',
  onboarding: 'Onboarding',
  progress_review: 'Progress review',
  custom: 'Session',
  gcal: 'Google Calendar',
};

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatClock(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')} ${suffix}` : `${hh} ${suffix}`;
}

function hourLabel(h) {
  if (h === 12) return '12 pm';
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

function CurrentTimeLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = HOUR_START * 60;
  const totalMinutes = (HOUR_END - HOUR_START) * 60;
  if (minutes < startMinutes || minutes > HOUR_END * 60) return null;
  const top = ((minutes - startMinutes) / totalMinutes) * (SLOT_HEIGHT * HOURS.length);

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top }} aria-label="Now">
      <span className="h-2 w-2 rounded-full bg-brand flex-shrink-0 -ml-1" />
      <span className="flex-1 h-[1.5px] bg-brand" />
    </div>
  );
}

function SessionTile({ session, onEdit, compact }) {
  const minutes = parseTimeToMinutes(session.time);
  const startMinutes = HOUR_START * 60;
  const totalMinutes = (HOUR_END - HOUR_START) * 60;
  const top = minutes !== null
    ? ((minutes - startMinutes) / totalMinutes) * (SLOT_HEIGHT * HOURS.length)
    : 0;
  const height = Math.max(((session.duration_minutes || 60) / 60) * SLOT_HEIGHT - 4, 26);
  const short = height < 44;
  const external = session._isGoogleEvent;
  const cancelled = session.status === 'cancelled';
  const done = session.status === 'completed' || session.status === 'no_show';
  const name = session.client_name || session.title;
  const type = SESSION_TYPE_LABELS[session.type] || 'Session';
  const meta = [formatClock(session.time), session._isCalendlyEvent ? 'Calendly' : type].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => onEdit(session)}
      title={`${session.title || name}${session.time ? ` · ${formatClock(session.time)}` : ''}`}
      className={cn(
        'touch-compact absolute left-1 right-1 z-10 overflow-hidden rounded-md text-left transition-shadow',
        external
          ? 'bg-card shadow-[inset_0_0_0_1px_rgb(var(--border))] cursor-default'
          : 'bg-secondary hover:shadow-[inset_0_0_0_1px_rgb(var(--foreground)/0.25)]',
        (cancelled || done) && 'opacity-60'
      )}
      style={{ top: minutes !== null ? top + 2 : 4, height, padding: short ? '3px 8px' : '6px 8px' }}
    >
      {short ? (
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className={cn('text-[13px] font-semibold text-foreground truncate', cancelled && 'line-through')}>{name}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatClock(session.time)}</span>
        </span>
      ) : (
        <>
          <span className={cn('block text-[13px] font-semibold leading-tight truncate', external ? 'text-muted-foreground' : 'text-foreground', cancelled && 'line-through')}>
            {name}
          </span>
          <span className="block text-xs text-muted-foreground truncate mt-0.5">{meta}</span>
          {!compact && session.client_name && session.title && session.title !== session.client_name && height > 80 && (
            <span className="block text-xs text-muted-foreground truncate mt-0.5">{session.title}</span>
          )}
        </>
      )}
    </button>
  );
}

export default function TimeGrid({ days, sessions, onEdit, onNewSession, onDayClick }) {
  const scrollRef = useRef(null);
  const today = new Date();
  const multi = days.length > 1;

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = HOUR_START * 60;
      const pct = Math.max(0, (minutes - startMinutes - 60) / ((HOUR_END - HOUR_START) * 60));
      scrollRef.current.scrollTop = pct * scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <section className="panel overflow-hidden">
      <div className={cn(multi && 'overflow-x-auto')}>
        <div className={cn(multi && 'min-w-[760px]')}>
          {/* Day tiles */}
          <div className="flex border-b border-border">
            <div className="w-14 flex-shrink-0" />
            {days.map(day => {
              const isToday = isSameDay(day, today);
              const count = sessions.filter(s => s.date === format(day, 'yyyy-MM-dd') && s.status !== 'cancelled').length;
              const Tile = onDayClick ? 'button' : 'div';
              return (
                <div key={day.toISOString()} className="flex-1 min-w-0 p-1.5">
                  <Tile
                    type={onDayClick ? 'button' : undefined}
                    onClick={onDayClick ? () => onDayClick(day) : undefined}
                    className={cn(
                      'touch-compact w-full rounded-lg px-2 py-2 text-center transition-colors',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                      onDayClick && !isToday && 'hover:bg-accent'
                    )}
                  >
                    <span className={cn('block text-[13px] font-medium', isToday ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {format(day, multi ? 'EEE' : 'EEEE')}
                    </span>
                    <span className="num block text-[24px] leading-none mt-1">{format(day, 'd')}</span>
                    <span className={cn('block text-xs mt-1', isToday ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {count === 0 ? 'Free' : `${count} session${count === 1 ? '' : 's'}`}
                    </span>
                  </Tile>
                </div>
              );
            })}
          </div>

          {/* Scrollable body */}
          <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '68vh' }}>
            <div className="flex relative" style={{ height: SLOT_HEIGHT * HOURS.length }}>
              {/* Time column */}
              <div className="w-14 flex-shrink-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="flex items-start justify-end pr-2.5" style={{ height: SLOT_HEIGHT }}>
                    <span className="text-xs text-muted-foreground whitespace-nowrap -mt-2 tabular-nums">
                      {h === HOUR_START ? '' : hourLabel(h)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map(day => {
                const isToday = isSameDay(day, today);
                const daySessions = sessions.filter(s => s.date === format(day, 'yyyy-MM-dd'));
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 min-w-0 relative border-l border-border cursor-copy"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) onNewSession(day);
                    }}
                    title="Click an empty slot to book"
                  >
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-border/70 pointer-events-none"
                        style={{ top: (h - HOUR_START) * SLOT_HEIGHT }}
                      />
                    ))}

                    {daySessions.map(session => (
                      <SessionTile key={session.id} session={session} onEdit={onEdit} compact={days.length > 3} />
                    ))}

                    {isToday && <CurrentTimeLine />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
