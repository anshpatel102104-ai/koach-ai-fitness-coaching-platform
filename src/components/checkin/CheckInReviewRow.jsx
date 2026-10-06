import React from 'react';
import { cn } from '@/lib/utils';
import { shortWhen, weightDelta, signed } from './reviewParts';

const GAIN_GOALS = new Set(['muscle_gain', 'weight_gain', 'lean_bulk']);

/**
 * Queue row: name, when it came in, weight change. Selected row sits on the
 * neutral accent with a brand-blue left rule.
 */
export default function CheckInReviewRow({ checkIn, client, prev, onReview, selected = false }) {
  const clientName = client?.name || checkIn.client_name || 'Client';
  const delta = weightDelta(checkIn, prev);
  const wantsGain = GAIN_GOALS.has(client?.goal);
  const onTrack = delta != null && Math.abs(delta) >= 1 && (wantsGain ? delta > 0 : delta < 0);
  const reviewed = checkIn.coach_responded || checkIn.review_status === 'reviewed';
  const flagged = checkIn.review_status === 'flagged';

  return (
    <button
      type="button"
      onClick={() => onReview(checkIn)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'relative w-full flex items-center gap-3 px-5 py-3.5 text-left border-b border-border transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      {selected && <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand" />}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground truncate">{clientName}</span>
        <span className="block text-[13px] text-muted-foreground truncate">
          {shortWhen(checkIn)}
          {flagged && <span className="text-destructive"> · Flagged</span>}
          {!flagged && reviewed && <span> · Reviewed</span>}
        </span>
      </span>
      {delta != null && (
        <span className={cn('num text-[17px] flex-shrink-0', onTrack ? 'text-success' : 'text-foreground')}>
          {signed(delta)}
        </span>
      )}
    </button>
  );
}
