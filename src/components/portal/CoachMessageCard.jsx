import React from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Initials } from '@/components/kit';

/**
 * Coach note on the client Today screen: ink initials, coach name, the
 * latest message. Tapping opens the conversation.
 */
export default function CoachMessageCard({ message, coachName, onReply }) {
  if (!message) return null;
  const name = coachName || 'Your coach';
  const when = message.created_date
    ? formatDistanceToNowStrict(new Date(message.created_date), { addSuffix: true })
    : null;

  return (
    <button type="button" onClick={onReply} className="panel flex w-full items-start gap-3 p-4 text-left hover:bg-accent/60 transition-colors">
      <Initials name={name === 'Your coach' ? 'Coach' : name} tone="ink" size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold text-foreground truncate">{name}</span>
          {when && <span className="text-[13px] text-muted-foreground flex-shrink-0">{when}</span>}
        </span>
        <span className="mt-0.5 block text-[15px] leading-snug text-foreground line-clamp-3">{message.content}</span>
      </span>
    </button>
  );
}
