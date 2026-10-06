import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { format, differenceInDays, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Panel, InkPanel, TextLink, KeyValue, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';
import { signed } from '@/components/clients/clientSignals';

const toDate = (v) => {
  if (!v) return null;
  const d = typeof v === 'string' && v.length <= 10 ? parseISO(v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ── Bodyweight ─────────────────────────────────────────────────────────── */

function useWeightSeries(client, checkIns) {
  const { data: weighIns = [] } = useQuery({
    queryKey: ['profile-weighins', client?.id],
    queryFn: () => db.entities.WeighIn.filter({ client_id: client.id }, '-date', 120),
    enabled: !!client?.id,
  });

  return useMemo(() => {
    const byDay = new Map();
    [...weighIns, ...checkIns].forEach(r => {
      const d = toDate(r.date);
      if (!d || r.weight == null) return;
      byDay.set(format(d, 'yyyy-MM-dd'), { t: d.getTime(), weight: Number(r.weight) });
    });
    const all = [...byDay.values()].sort((a, b) => a.t - b.t);
    // Last 8 weeks is what the coach reasons about week to week.
    const cutoff = Date.now() - 56 * 86400000;
    const recent = all.filter(p => p.t >= cutoff);
    return recent.length >= 2 ? recent : all;
  }, [weighIns, checkIns]);
}

function BodyweightPanel({ client, checkIns }) {
  const series = useWeightSeries(client, checkIns);
  const target = client.target_weight ? Number(client.target_weight) : null;

  const chart = useMemo(() => {
    if (series.length < 2) return null;
    const first = series[0];
    const losing = target !== null ? target < first.weight : client.goal === 'weight_loss';
    // Target pace: 1 lb a week toward the goal weight (0.5 lb when gaining).
    const perWeek = losing ? -1 : 0.5;
    const spanWeeks = Math.max(1, (series[series.length - 1].t - first.t) / (7 * 86400000));
    const smooth = series.length / spanWeeks > 1.5;
    const data = series.map((p, i) => {
      const weeks = (p.t - first.t) / (7 * 86400000);
      const windowPts = smooth ? series.filter(q => q.t <= p.t && q.t > p.t - 7 * 86400000) : [p];
      const avg = +(windowPts.reduce((a, q) => a + q.weight, 0) / windowPts.length).toFixed(1);
      let pace = first.weight + perWeek * weeks;
      if (target !== null) pace = losing ? Math.max(pace, target) : Math.min(pace, target);
      return {
        t: p.t,
        weight: avg,
        pace: (target !== null || client.goal === 'weight_loss' || client.goal === 'muscle_gain') ? +pace.toFixed(1) : null,
        latest: i === series.length - 1 ? p.weight : null,
      };
    });
    const last = series[series.length - 1];
    const delta = +(last.weight - first.weight).toFixed(1);
    const weeks = Math.max(1, Math.round((last.t - first.t) / (7 * 86400000)));
    const good = losing ? delta < 0 : delta > 0;
    return { data, latest: last.weight, delta, weeks, good, perWeek, smooth, hasPace: data[0].pace !== null };
  }, [series, target, client.goal]);

  const paceNote = chart
    ? [
        chart.smooth ? 'Line is a 7-day average.' : null,
        chart.hasPace ? `Dashed line is a ${Math.abs(chart.perWeek)} lb a week pace${target !== null ? ` to ${target} lb` : ''}.` : null,
      ].filter(Boolean).join(' ')
    : '';

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-[22px] text-foreground">Bodyweight</h2>
        {chart && (
          <div className="flex items-baseline gap-3">
            <span className="num text-[34px] sm:text-[40px] leading-none text-foreground">{chart.latest}<span className="text-[0.55em] ml-1">lb</span></span>
            <span className={cn('text-[15px] font-semibold', chart.delta === 0 ? 'text-muted-foreground' : chart.good ? 'text-success' : 'text-foreground')}>
              {signed(chart.delta)} in {chart.weeks} week{chart.weeks === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {chart ? (
        <>
          <div className="h-[150px] sm:h-[170px] mt-4 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart.data} margin={{ top: 8, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--border))" />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  cursor={{ stroke: 'rgb(var(--border))' }}
                  contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))', borderRadius: 8, fontSize: 13, color: 'rgb(var(--foreground))' }}
                  labelFormatter={(t) => format(new Date(t), 'MMM d')}
                  formatter={(v, name) => [`${v} lb`, name === 'pace' ? 'Target pace' : chart.smooth ? '7-day average' : 'Weight']}
                />
                {chart.hasPace && (
                  <Line type="linear" dataKey="pace" stroke="rgb(var(--muted-foreground))" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="rgb(var(--foreground))"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  dot={(props) => {
                    const { cx, cy, index } = props;
                    if (index !== chart.data.length - 1) return <g key={`d${index}`} />;
                    return <circle key={`d${index}`} cx={cx} cy={cy} r={6} fill="rgb(var(--brand))" stroke="rgb(var(--card))" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 4, fill: 'rgb(var(--foreground))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-[13px] text-muted-foreground">
            <span className="whitespace-nowrap">{format(new Date(chart.data[0].t), 'MMM d')}</span>
            <span className="hidden sm:inline text-center">{paceNote}</span>
            <span className="whitespace-nowrap">{format(new Date(chart.data[chart.data.length - 1].t), 'MMM d')}</span>
          </div>
          <p className="sm:hidden mt-1 text-[13px] text-muted-foreground">{paceNote}</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {series.length === 1 ? `One weigh-in so far: ${series[0].weight} lb. The chart starts after the second.` : 'No weigh-ins yet. They show up here from check-ins and daily weigh-ins.'}
        </p>
      )}
    </Panel>
  );
}

/* ── This week ──────────────────────────────────────────────────────────── */

function ThisWeekPanel({ sessions = [], program, onOpenTab }) {
  const navigate = useNavigate();
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // Same weekly layout the program tab uses: the program's days fill the
  // first N weekdays, the rest are rest days.
  const workouts = program?.workouts || [];
  const daysPerWeek = program?.days_per_week || workouts.length || 0;
  const plannedFor = (i) => (workouts.length && i < daysPerWeek ? workouts[i % workouts.length]?.day_name || `Day ${i + 1}` : null);

  const tiles = days.map((day, i) => {
    const daySessions = sessions.filter(s => {
      const d = toDate(s.scheduled_date) || toDate(s.completed_at);
      return d && isSameDay(d, day);
    });
    const done = daySessions.find(s => s.status === 'completed');
    const skipped = daySessions.find(s => s.status === 'skipped' || s.status === 'missed');
    const logged = done || skipped || daySessions[0];
    const isToday = isSameDay(day, today);
    const isPast = day < today && !isToday;
    const name = logged?.workout_name || logged?.workout_day_name || plannedFor(i) || (workouts.length ? 'Rest' : '');
    let state = 'upcoming';
    if (done) state = 'done';
    else if (skipped) state = 'missed';
    else if (isToday) state = 'today';
    else if (isPast) state = 'past';
    return { day, name, state, skippedNote: skipped?.notes };
  });

  return (
    <Panel className="p-5 sm:p-6 flex flex-col">
      <h2 className="text-[22px] text-foreground">This week</h2>
      <div className="mt-4 -mx-5 px-5 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible scrollbar-hide">
      <div className="grid grid-cols-[repeat(7,minmax(60px,1fr))] sm:grid-cols-7 gap-1.5 lg:gap-2">
        {tiles.map(t => (
          <div key={t.day.toISOString()} className="min-w-0">
            <p className="text-[13px] text-muted-foreground mb-1.5">{format(t.day, 'EEE')}</p>
            <div
              title={t.skippedNote || undefined}
              className={cn(
                'min-h-[64px] rounded-lg p-1.5 sm:p-2 text-[12px] sm:text-[13px] font-semibold leading-tight break-words',
                t.state === 'done' && 'bg-success-soft text-success',
                t.state === 'today' && 'bg-primary text-primary-foreground',
                t.state === 'missed' && 'hatch-missed text-destructive',
                t.state === 'past' && 'bg-secondary text-muted-foreground font-medium',
                t.state === 'upcoming' && 'border border-dashed border-input text-muted-foreground font-medium'
              )}
            >
              {t.state === 'missed'
                ? <span className="inline-block rounded bg-card/90 px-1 py-0.5">{t.name}</span>
                : t.name}
            </div>
          </div>
        ))}
      </div>
      </div>
      {!program && <p className="mt-4 text-sm text-muted-foreground">No program assigned, so only logged sessions show here.</p>}
      <div className="mt-auto pt-6 flex flex-wrap gap-x-5 gap-y-2">
        <TextLink onClick={() => onOpenTab?.('programs')}>Open program</TextLink>
        <TextLink onClick={() => onOpenTab?.('nutrition')}>Open meal plan</TextLink>
        {program?.id && <TextLink onClick={() => navigate(`/program-builder?id=${program.id}`)}>Edit in builder</TextLink>}
      </div>
    </Panel>
  );
}

/* ── What the AI sees ───────────────────────────────────────────────────── */

function readingFromData(client, checkIns) {
  const lines = [];
  const withW = checkIns.filter(ci => ci.weight != null).slice(0, 4);
  if (withW.length >= 2) {
    const newest = withW[0], oldest = withW[withW.length - 1];
    const weeks = Math.max(1, differenceInDays(new Date(newest.date), new Date(oldest.date)) / 7);
    const rate = (newest.weight - oldest.weight) / weeks;
    const abs = Math.abs(rate);
    const pace = abs < 0.2 ? 'Weight is flat' : `${rate < 0 ? 'Down' : 'Up'} about ${abs.toFixed(1)} lb a week`;
    lines.push(`${pace} over the last ${withW.length} check-ins.`);
  }
  const recent = checkIns.slice(0, 3);
  const tr = recent.map(ci => ci.compliance_training).filter(v => v != null);
  const nu = recent.map(ci => ci.compliance_nutrition).filter(v => v != null);
  if (tr.length) {
    const avg = Math.round(tr.reduce((a, b) => a + b, 0) / tr.length);
    lines.push(avg >= 85 ? `Training is near perfect at ${avg}%.` : avg >= 60 ? `Training is at ${avg}%, some sessions slipping.` : `Training has dropped to ${avg}%.`);
  }
  if (nu.length) {
    const avg = Math.round(nu.reduce((a, b) => a + b, 0) / nu.length);
    lines.push(avg >= 85 ? `Nutrition on plan at ${avg}%.` : `Nutrition at ${avg}%.`);
  }
  const sl = recent.map(ci => ci.sleep_hours).filter(v => v != null);
  if (sl.length) {
    const avg = +(sl.reduce((a, b) => a + b, 0) / sl.length).toFixed(1);
    if (avg < 7) lines.push(`Sleep is averaging ${avg} hours, worth a mention.`);
  }
  if (checkIns[0]?.mood === 'stressed' || checkIns[0]?.mood === 'tired') lines.push(`Said they feel ${checkIns[0].mood} in the last check-in.`);
  return lines.join(' ');
}

function AiSeesPanel({ client, checkIns, onOpenTab }) {
  const navigate = useNavigate();
  const last = checkIns[0];
  const stored = last?.ai_checkin_summary;
  const body = stored?.summary
    ? [stored.summary, stored.coaching_focus ? `Focus: ${stored.coaching_focus}` : null].filter(Boolean).join(' ')
    : readingFromData(client, checkIns);
  const replyDay = last ? format(addDays(new Date(last.date), 7), 'EEEE') : null;
  const evidence = stored?.summary
    ? `From the ${last ? format(new Date(last.date), 'MMM d') : 'latest'} check-in.`
    : checkIns.length ? `Based on the last ${Math.min(checkIns.length, 4)} check-ins.` : null;

  return (
    <InkPanel
      title="What the AI sees"
      className="min-h-[260px]"
      footer={
        last ? (
          <Button variant="outline" className="bg-card text-foreground border-transparent hover:bg-card/90" onClick={() => navigate(`/checkin-detail?id=${last.id}&clientId=${client.id}`)}>
            Draft {replyDay} reply
          </Button>
        ) : (
          <Button variant="outline" className="bg-card text-foreground border-transparent hover:bg-card/90" onClick={() => onOpenTab?.('messages')}>
            Send a first message
          </Button>
        )
      }
    >
      <p>{body || 'Nothing to read yet. After the first check-in this panel sums up weight pace, training, food and sleep.'}</p>
      {evidence && <p className="mt-3 text-[13px] text-ai-foreground/60">{evidence}</p>}
    </InkPanel>
  );
}

/* ── Latest check-in + needs attention ──────────────────────────────────── */

function LatestCheckIn({ checkIns, pendingCount, onOpenTab }) {
  const lastCI = checkIns[0];
  if (!lastCI) return null;
  const pairs = [
    ['Weight', lastCI.weight != null ? `${lastCI.weight} lb` : null],
    ['Sleep', lastCI.sleep_hours != null ? `${lastCI.sleep_hours} h` : null],
    ['Energy', lastCI.energy_level != null ? `${lastCI.energy_level} of 10` : null],
    ['Training', lastCI.compliance_training != null ? `${lastCI.compliance_training}%` : null],
    ['Nutrition', lastCI.compliance_nutrition != null ? `${lastCI.compliance_nutrition}%` : null],
  ].filter(([, v]) => v !== null);

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[22px] text-foreground">Latest check-in</h2>
        <span className="text-[13px] text-muted-foreground">{format(new Date(lastCI.date), 'EEEE, MMM d')}</span>
      </div>
      {pairs.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
          {pairs.map(([label, value]) => (
            <div key={label}>
              <p className="text-[13px] text-muted-foreground">{label}</p>
              <p className="num text-[22px] text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}
      {lastCI.notes && (
        <blockquote className="mt-4 border-l-2 border-border pl-3 text-[15px] text-foreground/80 leading-relaxed line-clamp-4">
          {lastCI.notes}
        </blockquote>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <TextLink onClick={() => onOpenTab?.('checkins')}>
          {pendingCount > 0 ? `Review ${pendingCount} waiting check-in${pendingCount > 1 ? 's' : ''}` : 'All check-ins'}
        </TextLink>
        <TextLink onClick={() => onOpenTab?.('progress')}>Progress charts</TextLink>
      </div>
    </Panel>
  );
}

function Attention({ checkIns, onOpenTab }) {
  const lastCI = checkIns[0];
  const daysSinceCI = lastCI ? differenceInDays(new Date(), new Date(lastCI.date)) : null;
  const items = [];
  if (daysSinceCI !== null && daysSinceCI > 7) items.push({ text: `No check-in for ${daysSinceCI} days.`, action: 'Message', tab: 'messages' });
  if (lastCI?.compliance_training != null && lastCI.compliance_training < 60) items.push({ text: `Training compliance was ${lastCI.compliance_training}% last check-in.` });
  if (lastCI?.compliance_nutrition != null && lastCI.compliance_nutrition < 60) items.push({ text: `Nutrition compliance was ${lastCI.compliance_nutrition}% last check-in.` });
  if (lastCI?.sleep_hours != null && lastCI.sleep_hours < 6) items.push({ text: `Slept under 6 hours before the last check-in.` });
  if (!items.length) return null;
  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[22px] text-foreground">Needs attention</h2>
      <ul className="mt-3 divide-y divide-border">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-2.5">
            <span className="flex items-center gap-2.5 text-[15px] text-foreground">
              <span className="h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
              {it.text}
            </span>
            {it.action && <TextLink onClick={() => onOpenTab?.(it.tab)}>{it.action}</TextLink>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ProfileOverviewTab({ client, checkIns = [], score, program, sessions = [], pendingCount = 0, onOpenTab }) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <BodyweightPanel client={client} checkIns={checkIns} />

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <ThisWeekPanel sessions={sessions} program={program} onOpenTab={onOpenTab} />
        <AiSeesPanel client={client} checkIns={checkIns} onOpenTab={onOpenTab} />
      </div>

      <Attention checkIns={checkIns} onOpenTab={onOpenTab} />
      <LatestCheckIn checkIns={checkIns} pendingCount={pendingCount} onOpenTab={onOpenTab} />

      <Panel className="p-5 sm:p-6">
        <h2 className="text-[22px] text-foreground mb-2">Details</h2>
        <KeyValue label="Compliance, last 4 weeks" value={score !== null && score !== undefined ? `${score}%` : '—'} />
        <KeyValue label="Goal weight" value={client.target_weight ? `${client.target_weight} lb` : '—'} />
        {client.start_date && <KeyValue label="Start date" value={format(new Date(client.start_date), 'MMM d, yyyy')} />}
        {client.monthly_rate && <KeyValue label="Monthly rate" value={`$${client.monthly_rate} a month`} />}
        {client.height && <KeyValue label="Height" value={client.height} />}
        {program?.title && <KeyValue label="Program" value={program.title} />}
      </Panel>

      {checkIns.length === 0 && (
        <Panel>
          <EmptyState
            title="No check-ins yet"
            body="Once they submit their first weekly check-in, weight, compliance and notes show up here."
            action={<TextLink onClick={() => onOpenTab?.('messages')}>Send a reminder</TextLink>}
          />
        </Panel>
      )}
    </div>
  );
}
