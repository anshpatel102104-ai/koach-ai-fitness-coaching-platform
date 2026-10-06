import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { Initials } from '@/components/kit';
import { cn } from '@/lib/utils';
import { checkInScore } from '@/lib/adherence';
import AdherenceScore from '@/components/adherence/AdherenceScore';
import CheckInMetrics from './CheckInMetrics';
import CheckInResponseBox from './CheckInResponseBox';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

function getFlags(checkIn) {
  const flags = [];
  const score = checkInScore(checkIn);
  if (score !== null && score < 55) flags.push({ label: 'Low adherence', type: 'high' });
  if (checkIn.compliance_training != null && checkIn.compliance_training < 60) flags.push({ label: 'Missed workouts', type: 'medium' });
  if (checkIn.compliance_nutrition != null && checkIn.compliance_nutrition < 60) flags.push({ label: 'Nutrition off', type: 'medium' });
  if (checkIn.mood === 'stressed' || checkIn.mood === 'tired') flags.push({ label: `Mood: ${checkIn.mood}`, type: 'low' });
  if (checkIn.sleep_hours != null && checkIn.sleep_hours < 6) flags.push({ label: 'Poor sleep', type: 'medium' });
  return flags;
}

export default function CheckInCard({ checkIn, client, defaultOpen = false }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const queryClient = useQueryClient();
  const score = checkInScore(checkIn);
  const flags = getFlags(checkIn);
  const hasResponse = !!checkIn.coach_notes || !!checkIn.coach_responded;
  const daysAgo = differenceInDays(new Date(), parseISO(checkIn.date));
  const isOverdue = daysAgo > 14;

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.update(checkIn.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins-review'] }),
  });

  const name = client?.name || checkIn.client_name || 'Client';

  return (
    <div className="panel overflow-hidden">
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 sm:px-5 hover:bg-accent/50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <Initials name={name} src={client?.avatar_url} tone={flags.some(f => f.type === 'high') ? 'alert' : 'default'} />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">
            {format(parseISO(checkIn.date), 'EEEE, MMM d')}
            {checkIn.weight ? <span className="font-normal text-muted-foreground"> · {checkIn.weight} lb</span> : null}
          </p>
          <p className="text-[13px] text-muted-foreground truncate">
            {daysAgo > 0 ? <span className={cn(isOverdue && 'text-destructive')}>{daysAgo} days ago</span> : 'Today'}
            {flags.length > 0 && <span className="text-destructive"> · {flags.length} flag{flags.length > 1 ? 's' : ''}</span>}
            {checkIn.photo_urls?.length > 0 && <> · {checkIn.photo_urls.length} photos</>}
            {hasResponse ? <> · Replied</> : <span className="text-foreground font-medium"> · Needs a reply</span>}
          </p>
        </div>

        <AdherenceScore score={score} size="sm" showLabel={false} />
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 sm:px-5 space-y-5">
          {flags.length > 0 && (
            <p className="text-sm text-destructive">{flags.map(f => f.label).join(', ')}</p>
          )}

          {checkIn.photo_urls?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {checkIn.photo_urls.map((url, i) => (
                <SignedLink key={i} href={url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                  <SignedImg src={url} alt="" className="w-24 h-32 object-cover rounded-lg bg-secondary" />
                </SignedLink>
              ))}
            </div>
          )}

          <CheckInMetrics checkIn={checkIn} />

          {checkIn.measurements && Object.values(checkIn.measurements).some(v => v) && (
            <p className="text-sm text-muted-foreground">
              {Object.entries(checkIn.measurements).filter(([, v]) => v).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v} in`).join(' · ')}
            </p>
          )}

          {checkIn.notes && (
            <div>
              <p className="text-[13px] text-muted-foreground">In {name.split(' ')[0]}'s words</p>
              <p className="text-[15px] text-foreground leading-relaxed mt-1">{checkIn.notes}</p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <CheckInResponseBox
              checkIn={checkIn}
              client={client}
              onSave={(data) => updateMutation.mutateAsync(data)}
              saving={updateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
