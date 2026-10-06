import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO, differenceInDays, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { averageAdherenceScore, calculateStreak, checkInScore, scoreBreakdown } from '@/lib/adherence';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Initials, Segmented, Stat as KitStat, ComplianceStrip, ComplianceLegend } from '@/components/kit';
import { weeklyCompliance } from '@/components/dashboard/todayModel';

const TABS = ['Overview', 'Workout', 'Nutrition', 'Check-ins'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const barTone = (v) => v == null ? 'bg-border' : v >= 80 ? 'bg-success' : v >= 50 ? 'bg-partial' : 'bg-destructive';

function Bar({ label, value, suffix = '%', sub }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-24 flex-shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', barTone(value))} style={{ width: `${Math.min(100, value ?? 0)}%` }} />
      </div>
      <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-foreground">{value ?? '—'}{value != null ? suffix : ''}</span>
      {sub && <span className="w-9 text-right text-[12px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function AdherenceDetailDrawer({ client, checkIns, open, onClose }) {
  const [tab, setTab] = useState('Overview');
  const [sendingNudge, setSendingNudge] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Flagged as at risk'); },
  });

  const sorted = useMemo(() =>
    [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [checkIns]
  );

  const breakdown = useMemo(() => scoreBreakdown(sorted), [sorted]);
  const workout = breakdown?.training.score ?? null;
  const nutrition = breakdown?.nutrition.score ?? null;
  const streak = calculateStreak(sorted);
  const overall = averageAdherenceScore(sorted);

  const handleNudge = async () => {
    const first = client.name?.split(' ')[0] || client.name;
    setSendingNudge(true);
    let message;
    if (workout !== null && workout < 60)
      message = `Hey ${first}, I noticed a few missed workouts this week. What's getting in the way?`;
    else if (nutrition !== null && nutrition < 60)
      message = `Hey ${first}, food logging has been light lately. Even one meal a day helps me coach you.`;
    else
      message = `Hey ${first}, your weekly check-in is due. It takes about two minutes.`;

    try {
      await db.entities.Message.create({ client_id: client.id, client_name: client.name, sender: 'coach', content: message });
      toast.success(`Nudge sent to ${first}`);
    } catch { toast.error('Couldn\'t send the nudge'); }
    setSendingNudge(false);
  };

  if (!open || !client) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-5 pr-12">
          <Initials name={client.name} size={44} tone={overall !== null && overall < 50 ? 'alert' : 'default'} />
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-[22px]">{client.name}</SheetTitle>
            <SheetDescription className="text-sm">
              {sorted.length} check-in{sorted.length === 1 ? '' : 's'} · {streak}-week streak
            </SheetDescription>
          </div>
        </div>

        <div className="border-b border-border px-5 py-3">
          <Segmented size="sm" value={tab} onChange={setTab} options={TABS.map(t => ({ value: t, label: t }))} />
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {tab === 'Overview' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <KitStat label="Adherence" value={overall !== null ? `${overall}%` : '—'} tone={overall === null ? undefined : overall >= 80 ? 'success' : overall < 50 ? 'danger' : undefined} />
                <KitStat label="Streak" value={streak} unit="wk" />
                <KitStat label="Check-ins" value={sorted.length} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Last 8 weeks</p>
                  <ComplianceLegend className="text-[12px]" />
                </div>
                <ComplianceStrip weeks={weeklyCompliance(client, sorted, 8)} label={`${client.name}, last 8 weeks`} />
              </div>

              {breakdown && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-foreground">What the score is made of</p>
                  <p className="mb-2 text-[13px] text-muted-foreground">Last 4 check-ins, weighted.</p>
                  {[breakdown.training, breakdown.nutrition, breakdown.sleep, breakdown.checkin].map(item => (
                    <Bar key={item.label} label={item.label} value={item.score} sub={`×${item.weight}%`} />
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Coach tools</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleNudge} disabled={sendingNudge}>{sendingNudge ? 'Sending…' : 'Send a nudge'}</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/program-builder?clientId=${client.id}`)}>Adjust program</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/schedule?clientId=${client.id}`)}>Book a call</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateMutation.mutate({ id: client.id, data: { lifecycle_status: 'at_risk' } })}>
                    Flag at risk
                  </Button>
                </div>
              </div>
            </>
          )}

          {tab === 'Workout' && <WorkoutTab checkIns={sorted} />}
          {tab === 'Nutrition' && <NutritionTab checkIns={sorted} />}
          {tab === 'Check-ins' && <CheckInTab checkIns={sorted} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WorkoutTab({ checkIns }) {
  const recent = checkIns.slice(0, 12);
  const avgPerWeek = useMemo(() => {
    const vals = recent.map(ci => ci.compliance_training).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [recent]);

  const dayFreq = useMemo(() => {
    const freq = Array(7).fill(0);
    recent.forEach(ci => { if (ci.date) freq[getDay(parseISO(ci.date))]++; });
    return freq;
  }, [recent]);

  const favoriteDay = recent.length ? DAYS[dayFreq.indexOf(Math.max(...dayFreq))] : '—';
  const skippedDay = recent.length ? DAYS[dayFreq.indexOf(Math.min(...dayFreq))] : '—';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <KitStat label="Average" value={avgPerWeek !== null ? `${avgPerWeek}%` : '—'} />
        <KitStat label="Usual check-in" value={favoriteDay} />
        <KitStat label="Rarest day" value={skippedDay} />
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold text-foreground">Training by week</p>
        {recent.slice(0, 8).map((ci, i) => (
          <Bar key={ci.id || i} label={format(parseISO(ci.date), 'MMM d')} value={ci.compliance_training ?? null} />
        ))}
      </div>
    </div>
  );
}

function NutritionTab({ checkIns }) {
  const recent = checkIns.slice(0, 8);
  const avgNutrition = useMemo(() => {
    const vals = recent.map(ci => ci.compliance_nutrition).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [recent]);

  const fullyTracked = recent.filter(ci => ci.compliance_nutrition != null && ci.compliance_nutrition >= 90).length;
  const notTracked = recent.filter(ci => ci.compliance_nutrition == null || ci.compliance_nutrition < 20).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <KitStat label="Average" value={avgNutrition !== null ? `${avgNutrition}%` : '—'} />
        <KitStat label="90%+ weeks" value={fullyTracked} />
        <KitStat label="Barely tracked" value={notTracked} />
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold text-foreground">Nutrition by week</p>
        {recent.map((ci, i) => (
          <Bar key={ci.id || i} label={format(parseISO(ci.date), 'MMM d')} value={ci.compliance_nutrition ?? null} />
        ))}
      </div>
    </div>
  );
}

function CheckInTab({ checkIns }) {
  const streak = calculateStreak(checkIns);
  const recent = checkIns.slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <KitStat label="Check-ins" value={checkIns.length} />
        <KitStat label="Current streak" value={streak} unit="wk" />
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold text-foreground">Recent submissions</p>
        <ul>
          {recent.map((ci, i) => {
            const score = checkInScore(ci);
            const daysSince = differenceInDays(new Date(), parseISO(ci.date));
            const isLate = daysSince > 10 && i === 0;
            return (
              <li key={ci.id || i} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
                <span className="flex-1 text-sm text-foreground">{format(parseISO(ci.date), 'EEE, MMM d, yyyy')}</span>
                {isLate && <span className="text-[13px] font-semibold text-warning">{daysSince} days ago</span>}
                <span className={cn('num w-12 text-right text-[17px]', score === null ? 'text-muted-foreground' : score >= 80 ? 'text-foreground' : score >= 50 ? 'text-warning' : 'text-destructive')}>
                  {score !== null ? `${score}%` : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
