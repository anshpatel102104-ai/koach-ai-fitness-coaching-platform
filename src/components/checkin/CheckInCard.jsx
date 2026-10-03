import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, ImageIcon, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkInScore } from '@/lib/adherence';
import AdherenceScore from '@/components/adherence/AdherenceScore';
import CheckInMetrics from './CheckInMetrics';
import CheckInResponseBox from './CheckInResponseBox';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };

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
    mutationFn: (data) => base44.entities.CheckIn.update(checkIn.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins-review'] }),
  });

  return (
    <div className={cn(
      'bg-card border rounded-2xl overflow-hidden transition-all',
      flags.some(f => f.type === 'high') ? 'border-destructive/30' :
      isOverdue ? 'border-chart-4/30' :
      'border-border'
    )}>
      {/* Summary Row */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {client?.name?.[0] || checkIn.client_name?.[0] || '?'}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{client?.name || checkIn.client_name}</p>
            {flags.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                <AlertTriangle className="w-2.5 h-2.5" /> {flags.length} flag{flags.length > 1 ? 's' : ''}
              </span>
            )}
            {!hasResponse && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                Needs response
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(checkIn.date), 'MMM d, yyyy')}
              {daysAgo > 0 && <span className={cn(isOverdue ? 'text-chart-4' : '')}> · {daysAgo}d ago</span>}
            </span>
            {checkIn.weight && <span>⚖️ {checkIn.weight} lbs</span>}
            {checkIn.mood && <span>{MOOD_EMOJI[checkIn.mood]}</span>}
            {checkIn.photo_urls?.length > 0 && (
              <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {checkIn.photo_urls.length} photos</span>
            )}
            {hasResponse && <span className="flex items-center gap-1 text-accent"><MessageSquare className="w-3 h-3" /> Responded</span>}
          </div>
        </div>

        <AdherenceScore score={score} size="sm" showLabel={false} />
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Flags */}
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {flags.map((f, i) => (
                <span key={i} className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded-full border',
                  f.type === 'high' ? 'text-destructive bg-destructive/10 border-destructive/20' :
                  f.type === 'medium' ? 'text-chart-4 bg-chart-4/10 border-chart-4/20' :
                  'text-muted-foreground bg-secondary border-border'
                )}>
                  {f.label}
                </span>
              ))}
            </div>
          )}

          {/* Progress photos */}
          {checkIn.photo_urls?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Progress Photos</p>
              <div className="flex gap-2 flex-wrap">
                {checkIn.photo_urls.map((url, i) => (
                  <SignedLink key={i} href={url} target="_blank" rel="noreferrer">
                    <SignedImg src={url} alt="progress" className="w-28 h-28 object-cover rounded-xl border border-border hover:scale-105 transition-transform" />
                  </SignedLink>
                ))}
              </div>
            </div>
          )}

          {/* Metrics grid */}
          <CheckInMetrics checkIn={checkIn} />

          {/* Measurements */}
          {checkIn.measurements && Object.values(checkIn.measurements).some(v => v) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Measurements (in)</p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(checkIn.measurements).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-muted-foreground capitalize">{k}: </span>
                    <span className="font-semibold">{v}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client notes */}
          {checkIn.notes && (
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Client Notes</p>
              <p className="text-sm">{checkIn.notes}</p>
            </div>
          )}

          {/* Coach response (read mode) */}
          {checkIn.coach_notes && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Coach Response</p>
              <p className="text-sm">{checkIn.coach_notes}</p>
            </div>
          )}

          {/* Response box */}
          <div className="bg-secondary/20 rounded-xl p-4 border border-border">
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