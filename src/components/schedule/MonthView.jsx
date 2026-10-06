import React, { useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, format
} from 'date-fns';
import { cn } from '@/lib/utils';
import SessionDetailPopover from './SessionDetailPopover';

function clock(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}` : `${hh}${h >= 12 ? 'pm' : 'am'}`;
}

export default function MonthView({ currentDate, sessions, onDayClick, onEditSession, clients = [] }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const today = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <>
      <section className="panel overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="py-2.5 px-2 text-[13px] text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map(day => {
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, currentDate);
              const daySessions = sessions
                .filter(s => s.date === format(day, 'yyyy-MM-dd'))
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              const maxVisible = 3;
              const extra = daySessions.length - maxVisible;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'min-h-[64px] sm:min-h-[108px] p-1 sm:p-1.5 border-r border-border last:border-r-0 cursor-pointer hover:bg-accent/60 transition-colors',
                    !inMonth && 'bg-background/50'
                  )}
                >
                  <div className={cn(
                    'num w-7 h-7 flex items-center justify-center rounded-md text-[15px] mb-1',
                    isToday ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {format(day, 'd')}
                  </div>

                  {/* Mobile: just a count */}
                  {daySessions.length > 0 && (
                    <p className="sm:hidden text-[11px] font-semibold text-foreground px-1">{daySessions.length}</p>
                  )}

                  <div className="hidden sm:block space-y-0.5">
                    {daySessions.slice(0, maxVisible).map(s => {
                      const isCancelled = s.status === 'cancelled';
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={e => { e.stopPropagation(); setSelectedSession(s); }}
                          className={cn(
                            'touch-compact flex w-full items-baseline gap-1.5 rounded px-1.5 py-[3px] text-left text-xs hover:bg-accent',
                            s._isGoogleEvent ? 'text-muted-foreground' : 'bg-secondary text-foreground',
                            isCancelled && 'line-through text-muted-foreground'
                          )}
                        >
                          {s.time && <span className="text-muted-foreground tabular-nums flex-shrink-0">{clock(s.time)}</span>}
                          <span className="truncate font-medium">{s.client_name || s.title}</span>
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <p className="text-xs text-muted-foreground px-1.5">{extra} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {/* Session Detail Popover */}
      {selectedSession && (
        <SessionDetailPopover
          session={selectedSession}
          client={clients.find(c => c.id === selectedSession.client_id)}
          onClose={() => setSelectedSession(null)}
          onUpdate={(data) => {
            setSelectedSession(null);
          }}
          onMessage={(clientId) => {
            setSelectedSession(null);
            window.location.href = `/messages?clientId=${clientId}`;
          }}
          onReschedule={() => {
            setSelectedSession(null);
          }}
          onCancel={() => {
            setSelectedSession(null);
          }}
        />
      )}
    </>
  );
}