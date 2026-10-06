import React, { useMemo } from 'react';
import { addDays, format, getDay, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Seven day tiles for the current week. Each count is how many active clients
 * usually check in on that weekday (the weekday of their latest check-in), so
 * the coach can see which days the review queue will fill up. Today is ink.
 */
export default function WeekStrip({ activeClients = [], ciMap = {}, now = new Date() }) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    activeClients.forEach(c => {
      const last = (ciMap[c.id] || [])[0];
      if (!last?.date) return;
      byWeekday[getDay(parseISO(last.date))] += 1;
    });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return { date, count: byWeekday[getDay(date)], today: isSameDay(date, now) };
    });
  }, [activeClients, ciMap, now]);

  return (
    <ol className="flex w-full gap-1.5 sm:w-auto sm:gap-2" aria-label="Check-ins due this week">
      {days.map(d => (
        <li
          key={d.date.toISOString()}
          title={`${d.count} check-in${d.count === 1 ? '' : 's'} usually due ${format(d.date, 'EEEE')}`}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg py-2 sm:w-[54px] sm:flex-none',
            d.today ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border)/0.6)]'
          )}
        >
          <span className={cn('text-[13px] font-medium', d.today ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
            {format(d.date, 'EEE')}
          </span>
          <span className="num text-[22px] leading-tight">{d.count}</span>
        </li>
      ))}
    </ol>
  );
}
