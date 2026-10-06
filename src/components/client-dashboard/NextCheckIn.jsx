import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NextCheckIn({ daysUntil, nextDate, lastCheckIn, clientId }) {
  const navigate = useNavigate();
  const overdue = daysUntil !== null && daysUntil < 0;
  const dueToday = daysUntil === 0;
  const noCheckIn = daysUntil === null;
  const urgent = overdue || dueToday;

  const go = () => navigate(clientId ? `/submit-checkin?clientId=${clientId}` : '/submit-checkin');

  const title = noCheckIn
    ? 'No check-in scheduled'
    : overdue
      ? `Check-in ${Math.abs(daysUntil)} days late`
      : dueToday
        ? 'Check-in due today'
        : `Check-in in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

  return (
    <section className="panel relative overflow-hidden py-4 pl-5 pr-4">
      <span className={cn('absolute inset-y-0 left-0 w-1', overdue ? 'bg-destructive' : urgent ? 'bg-brand' : 'bg-input')} aria-hidden />
      <h2 className="text-xl text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {nextDate && !noCheckIn ? `${format(nextDate, 'EEEE, MMM d')}. ` : ''}
        {lastCheckIn ? `Last one ${format(new Date(lastCheckIn.date), 'MMM d')}${lastCheckIn.weight ? `, ${lastCheckIn.weight} lb` : ''}.` : ''}
      </p>
      <Button variant={urgent ? 'brand' : 'outline'} size="lg" className="mt-3 w-full" onClick={go}>
        {urgent ? 'Start check-in' : 'Send it early'}
      </Button>
    </section>
  );
}
