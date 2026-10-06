/**
 * AIFollowUpChip — follow-up reminder in the client context column.
 * Shows when the coach hasn't messaged this client for 3+ days and offers
 * to draft a check-in message.
 */
import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { generateAIReply } from '@/lib/aiMessageAssistant';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function AIFollowUpChip({ client, allMessages, checkIns = [], onInsert }) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!client || dismissed) return null;

  const clientMessages = allMessages.filter(m => m.client_id === client.id);
  const sortedMsgs = [...clientMessages].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastCoachMsg = sortedMsgs.find(m => m.sender === 'coach');
  const daysSinceCoach = lastCoachMsg
    ? differenceInDays(new Date(), new Date(lastCoachMsg.created_date))
    : 999;

  // Only show if coach hasn't messaged in 3+ days
  if (daysSinceCoach < 3) return null;

  const firstName = client.name?.split(' ')[0] || client.name;

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateAIReply(client, allMessages, checkIns, 'casual');
    setLoading(false);
    if (result?.message) onInsert(result.message);
  };

  const label = daysSinceCoach === 999
    ? `You haven't messaged ${firstName} yet.`
    : `You last messaged ${firstName} ${daysSinceCoach} days ago.`;

  const urgent = daysSinceCoach >= 7;

  return (
    <div className="mx-5 mb-5 rounded-lg bg-secondary p-4">
      <div className="flex items-start gap-2">
        <p className={cn('flex-1 text-sm font-semibold', urgent ? 'text-destructive' : 'text-foreground')}>{label}</p>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="touch-compact -mt-0.5 -mr-1 p-0.5 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[13px] text-muted-foreground mt-0.5">A short check-in keeps the thread warm.</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={handleGenerate} disabled={loading}>
        {loading ? <><Loader2 className="animate-spin" /> Drafting…</> : 'Draft a follow-up'}
      </Button>
    </div>
  );
}
