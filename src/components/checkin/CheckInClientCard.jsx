import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, AlertTriangle, TrendingDown, TrendingUp,
  Minus, Clock, ImageIcon, Moon, Zap, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkInScore, compositeAdherenceScore, averageAdherenceScore, scoreColor, scoreBreakdown } from '@/lib/adherence';
import { runAutoAwardForClient } from '@/lib/autoAward';
import { showAchievementToast } from '@/components/achievements/AchievementToast';
import { toast } from 'sonner';
import { AdherenceBreakdown } from '@/components/adherence/AdherenceScore';
import CheckInMetrics from './CheckInMetrics';
import CheckInResponseBox from './CheckInResponseBox';
import CheckInQuickActions from './CheckInQuickActions';
import TopRecommendationBadge from './TopRecommendationBadge';
import RecommendationCard from './RecommendationCard';
import CheckInStatusBadge from './CheckInStatusBadge';
import { generateRecommendations } from '@/lib/decisionEngine';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };

function getStatus(checkIn, allClientCIs) {
  const score = averageAdherenceScore(allClientCIs, 3);
  const flags = [];
  if (checkIn.compliance_training != null && checkIn.compliance_training < 60) flags.push('missed workouts');
  if (checkIn.compliance_nutrition != null && checkIn.compliance_nutrition < 60) flags.push('nutrition off');
  if (checkIn.sleep_hours != null && checkIn.sleep_hours < 6) flags.push('poor sleep');
  if (checkIn.mood === 'stressed' || checkIn.mood === 'tired') flags.push(`mood: ${checkIn.mood}`);

  const isAtRisk = (score !== null && score < 60) || flags.length >= 2;
  const needsAttention = flags.length > 0 || (score !== null && score < 80);

  if (isAtRisk) return { label: 'At Risk', color: 'bg-destructive/10 text-destructive border-destructive', leftColor: 'var(--tc-destructive)', flags };
  if (needsAttention) return { label: 'Needs Attention', color: 'bg-muted text-foreground border-border', leftColor: 'var(--tc-warning)', flags };
  return { label: 'Good', color: 'bg-muted text-foreground border-border', leftColor: 'var(--tc-success)', flags };
}

function WeightDelta({ current, previous }) {
  if (!current) return <span className="text-muted-foreground text-xs">–</span>;
  if (!previous) return <span className="text-sm font-bold">{current} lbs</span>;
  const diff = (current - previous).toFixed(1);
  const num = Number(diff);
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-bold tabular-nums">{current}</span>
      <span className={cn(
        'flex items-center gap-0.5 text-[11px] font-bold',
        num < 0 ? 'text-success' : num > 0 ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {num < 0 ? <TrendingDown className="w-3 h-3" /> : num > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {num > 0 ? '+' : ''}{diff}
      </span>
    </div>
  );
}


export default function CheckInClientCard({ checkIn, client, allClientCIs = [], defaultOpen = false }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [showFeedback, setShowFeedback] = useState(false);
  const [markSaving, setMarkSaving] = useState(false);
  const [marked, setMarked] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const score = checkInScore(checkIn);
  const avgScore = compositeAdherenceScore(allClientCIs);
  const breakdown = scoreBreakdown(allClientCIs);
  const status = getStatus(checkIn, allClientCIs);
  const hasResponse = !!checkIn.coach_notes || !!checkIn.coach_responded;
  const daysAgo = differenceInDays(new Date(), parseISO(checkIn.date));
  const prevCI = allClientCIs[1];

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.update(checkIn.id, data),
    onMutate: async (data) => {
      // Optimistic update — invalidate after
      await queryClient.cancelQueries({ queryKey: ['checkins-review'] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins-review'] }),
  });

  const isReviewed = marked || checkIn.coach_responded || !!checkIn.coach_notes;

  const handleMarkReviewed = async () => {
    if (isReviewed) return;
    setMarkSaving(true);
    setMarked(true);
    setJustCompleted(true);
    updateMutation.mutate({ coach_responded: true, review_status: 'reviewed' });
    setMarkSaving(false);
    setTimeout(() => setJustCompleted(false), 1200);

    // Run auto-award check for this client after review
    if (client) {
      try {
        const existingBadges = await db.entities.ClientBadge.filter({ client_id: client.id });
        const newKeys = await runAutoAwardForClient(client, allClientCIs, existingBadges);
        newKeys.forEach(key => showAchievementToast(toast, key, client.name));
      } catch (_) { /* silent */ }
    }
  };

  const sleepColor = checkIn.sleep_hours >= 7 ? 'text-success' : checkIn.sleep_hours >= 6 ? 'text-warning' : 'text-destructive';
  const energyColor = checkIn.energy_level >= 4 ? 'text-success' : checkIn.energy_level >= 2 ? 'text-warning' : 'text-destructive';

  return (
    <div className={cn(
      'bg-card border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm',
      justCompleted && 'ring-2 ring-success/40 border-success/30',
      !justCompleted && status.borderLeft
    )}
    style={!justCompleted ? { borderLeft: `3px solid ${status.leftColor}` } : {}}
    >
      {/* ── Summary row (always visible) ── */}
      <button
        className="w-full p-4 hover:bg-background active:bg-background transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 mt-0.5">
            {client?.name?.[0] || checkIn.client_name?.[0] || '?'}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm">{client?.name || checkIn.client_name}</span>
              <CheckInStatusBadge checkIn={checkIn} compact />
              {status.label !== 'Good' && (
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', status.color)}>
                  {status.label}
                </span>
              )}
            </div>

            {/* Date */}
            <p className="text-xs text-foreground mb-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(checkIn.date), 'MMM d')}
              {daysAgo > 0 && <span className={cn(daysAgo > 14 ? 'text-warning' : '')}> · {daysAgo}d ago</span>}
              {checkIn.mood && <span className="ml-1">{MOOD_EMOJI[checkIn.mood]}</span>}
              {checkIn.photo_urls?.length > 0 && (
                <span className="flex items-center gap-0.5 ml-1"><ImageIcon className="w-3 h-3" />{checkIn.photo_urls.length}</span>
              )}
            </p>

            {/* Key metrics row */}
            <div className="grid grid-cols-4 gap-2 bg-background border border-border rounded-xl p-2.5">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-foreground">Weight</span>
                <WeightDelta current={checkIn.weight} previous={prevCI?.weight} />
                <span className="text-[10px] text-muted-foreground">lbs</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Moon className="w-3.5 h-3.5 text-foreground" />
                <span className={cn('text-sm font-bold tabular-nums', sleepColor)}>{checkIn.sleep_hours ?? '–'}</span>
                <span className="text-[10px] text-foreground">hrs sleep</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Zap className="w-3.5 h-3.5 text-foreground" />
                <span className={cn('text-sm font-bold tabular-nums', energyColor)}>{checkIn.energy_level ?? '–'}<span className="text-[10px] font-normal">/10</span></span>
                <span className="text-[10px] text-foreground">energy</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-foreground">Adherence</span>
                <span className={cn('text-sm font-bold tabular-nums', scoreColor(avgScore))}>{avgScore ?? '–'}<span className="text-[10px] font-normal">%</span></span>
                <span className="text-[10px] text-foreground">avg</span>
              </div>
            </div>

            {/* Flags */}
            {status.flags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {status.flags.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/8 border border-destructive/20 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-2.5 h-2.5" />{f}
                  </span>
                ))}
              </div>
            )}

            {/* ⚡ Top recommendation — compact pill */}
            <div className="mt-2.5" onClick={e => e.stopPropagation()}>
              <TopRecommendationBadge
                checkIn={checkIn}
                client={client}
                allClientCIs={allClientCIs}
                compact
              />
            </div>
          </div>

          {/* Expand icon */}
          <div className="flex-shrink-0 mt-1">
            {expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* View full detail */}
          <button
            onClick={() => navigate(`/checkin-detail?id=${checkIn.id}&clientId=${checkIn.client_id}`)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Full Check-in Details
          </button>

          {/* Photos */}
          {checkIn.photo_urls?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Progress Photos</p>
              <div className="flex gap-2 flex-wrap">
                {checkIn.photo_urls.map((url, i) => (
                  <SignedLink key={i} href={url} target="_blank" rel="noreferrer">
                    <SignedImg src={url} alt="progress" className="w-24 h-24 object-cover rounded-xl border border-border hover:scale-105 transition-transform" />
                  </SignedLink>
                ))}
              </div>
            </div>
          )}

          {/* Adherence breakdown */}
          {breakdown && (
            <div className="bg-background border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2.5">Adherence Breakdown</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-foreground">Overall</span>
                <span className={cn('text-sm font-bold tabular-nums', scoreColor(avgScore))}>{avgScore ?? '–'}%</span>
              </div>
              <AdherenceBreakdown breakdown={breakdown} />
            </div>
          )}

          {/* Full metrics */}
          <CheckInMetrics checkIn={checkIn} />

          {/* Client notes */}
          {checkIn.notes && (
            <div className="bg-background border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Client Notes</p>
              <p className="text-sm leading-relaxed">{checkIn.notes}</p>
            </div>
          )}

          {/* Existing coach response */}
          {checkIn.coach_notes && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Your Response</p>
              <p className="text-sm leading-relaxed">{checkIn.coach_notes}</p>
            </div>
          )}

          {/* ── ⚡ Top Recommendation (prominent) ── */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span>⚡</span> Coach Recommendation
            </p>
            <TopRecommendationBadge checkIn={checkIn} client={client} allClientCIs={allClientCIs} />
          </div>

          {/* Additional recommendations (collapsed list) */}
          {(() => {
            const recs = generateRecommendations(checkIn, client, allClientCIs).slice(1, 3);
            if (!recs.length) return null;
            return (
              <div className="space-y-1.5">
                {recs.map(rec => (
                  <RecommendationCard key={rec.id} recommendation={rec} checkIn={checkIn} client={client} />
                ))}
              </div>
            );
          })()}

          {/* Quick Actions */}
          <CheckInQuickActions
            checkIn={checkIn}
            client={client}
            allClientCIs={allClientCIs}
            onSendFeedback={() => setShowFeedback(v => !v)}
            onMarkReviewed={handleMarkReviewed}
            isReviewed={isReviewed}
            saving={markSaving}
          />

          {/* Response box */}
          {showFeedback && (
            <div className="bg-background rounded-xl p-4 border border-border fade-up">
              <CheckInResponseBox
                checkIn={checkIn}
                client={client}
                allClientCIs={allClientCIs}
                onSave={(data) => updateMutation.mutate(data)}
                saving={updateMutation.isPending}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}