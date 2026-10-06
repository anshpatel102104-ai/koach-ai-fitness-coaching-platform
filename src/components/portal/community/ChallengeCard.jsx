import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { differenceInDays, parseISO } from 'date-fns';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChallengeCard({ challenge, myClient, queryClient }) {
  const daysLeft = challenge.end_date
    ? Math.max(0, differenceInDays(parseISO(challenge.end_date), new Date()))
    : null;

  const isJoined = (challenge.participants || []).includes(myClient?.id);
  const participantCount = (challenge.participants || []).length;

  const joinMutation = useMutation({
    mutationFn: () => {
      const participants = isJoined
        ? (challenge.participants || []).filter(id => id !== myClient?.id)
        : [...(challenge.participants || []), myClient?.id];
      return portalDb.entities.Challenge.update(challenge.id, { participants });
    },
    onSuccess: () => queryClient?.invalidateQueries({ queryKey: ['challenges-active'] }),
  });

  return (
    <section className="panel relative overflow-hidden py-4 pl-5 pr-4">
      <span className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">Group challenge</p>
          <h2 className="mt-0.5 text-xl text-foreground">{challenge.title}</h2>
        </div>
        {daysLeft !== null && (
          <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>
        )}
      </div>

      {challenge.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{challenge.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{participantCount} joined</p>
        <Button size="sm" variant={isJoined ? 'outline' : 'default'} onClick={() => joinMutation.mutate()}>
          {isJoined ? <><Check strokeWidth={3} /> Joined</> : 'Join challenge'}
        </Button>
      </div>
    </section>
  );
}
