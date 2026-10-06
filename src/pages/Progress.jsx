import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInWeeks, parseISO, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ClientProgressDetail from '@/components/progress/ClientProgressDetail';
import { useSignedUrl } from '@/components/shared/SignedImage';
import { Page, PageHeader, Panel, Stat, Initials, EmptyState } from '@/components/kit';

/* ── helpers ── */
function calcProgressScore(client, checkIns) {
  if (!checkIns.length) return null;
  let score = 50;
  const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (client.target_weight && last.weight && first.weight) {
    const needed = Math.abs(client.target_weight - first.weight);
    const achieved = Math.abs(last.weight - first.weight);
    if (needed > 0) score += Math.min(30, (achieved / needed) * 30);
  }
  const recentCIs = sorted.slice(-4);
  const avgAdh = recentCIs.reduce((s, ci) => s + ((ci.compliance_training ?? 70) + (ci.compliance_nutrition ?? 70)) / 2, 0) / recentCIs.length;
  score += (avgAdh / 100) * 40 - 20;
  const weeksActive = differenceInWeeks(new Date(last.date), new Date(first.date)) + 1;
  const consistency = Math.min(1, checkIns.length / weeksActive);
  score += consistency * 20 - 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTrend(checkIns) {
  const w = checkIns.filter(ci => ci.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (w.length < 2) return 'stable';
  const diff = w[w.length - 1].weight - w[w.length - 2].weight;
  if (diff > 0.5) return 'up';
  if (diff < -0.5) return 'down';
  return 'stable';
}



export default function Progress() {
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [detailClient, setDetailClient] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => db.entities.CheckIn.list('-date', 1000),
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['workout-sessions'],
    queryFn: () => db.entities.WorkoutSession.list('-completed_at', 500),
  });

  const activeClients = useMemo(
    () => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'),
    [clients]
  );

  const cisByClient = useMemo(() => {
    const map = {};
    for (const ci of allCheckIns) {
      (map[ci.client_id] = map[ci.client_id] || []).push(ci);
    }
    return map;
  }, [allCheckIns]);

  const sessionsByClient = useMemo(() => {
    const map = {};
    for (const s of allSessions) {
      (map[s.client_id] = map[s.client_id] || []).push(s);
    }
    return map;
  }, [allSessions]);

  // ── Global stat cards ──
  const stats = useMemo(() => {
    let totalLost = 0;
    let personalBests = 0;
    let photoClients = 0;
    let scoredClients = 0;
    let totalScore = 0;

    for (const client of activeClients) {
      const cis = (cisByClient[client.id] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      if (!cis.length) continue;
      const first = cis[0];
      const last = cis[cis.length - 1];
      if (first.weight && last.weight) {
        const diff = first.weight - last.weight;
        if (diff > 0) totalLost += diff;
      }
      const score = calcProgressScore(client, cis);
      if (score !== null) { totalScore += score; scoredClients++; }
      const hasPhotos = cis.some(ci => ci.photo_urls?.length > 0);
      if (hasPhotos) photoClients++;
      // Personal bests this week: check if last workout was a new record
      const sessions = sessionsByClient[client.id] || [];
      if (sessions.length >= 2) {
        const sorted = [...sessions].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        if (new Date(sorted[0].completed_at) > thisWeek) personalBests++;
      }
    }

    return {
      totalLost: Math.round(totalLost * 10) / 10,
      avgScore: scoredClients ? Math.round(totalScore / scoredClients) : 0,
      personalBests,
      photoClients,
    };
  }, [activeClients, cisByClient, sessionsByClient]);

  // ── Filtered client rows ──
  const visibleClients = useMemo(() => {
    const pool = selectedClientId === 'all' ? activeClients : activeClients.filter(c => c.id === selectedClientId);
    return pool.map(client => {
      const cis = (cisByClient[client.id] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      const sessions = sessionsByClient[client.id] || [];
      const first = cis[0];
      const last = cis[cis.length - 1];
      const startWeight = first?.weight;
      const currentWeight = last?.weight;
      const goalWeight = client.target_weight;
      const startDate = client.start_date || first?.date;
      const weeksActive = startDate ? differenceInWeeks(new Date(), parseISO(startDate)) + 1 : null;
      const trend = getTrend(cis);
      const score = calcProgressScore(client, cis);
      // Progress toward goal (0–100%)
      let goalPct = null;
      if (startWeight && currentWeight && goalWeight && startWeight !== goalWeight) {
        goalPct = Math.min(100, Math.max(0, Math.round(
          (Math.abs(currentWeight - startWeight) / Math.abs(goalWeight - startWeight)) * 100
        )));
      }
      return { client, cis, sessions, startWeight, currentWeight, goalWeight, weeksActive, trend, score, goalPct, lastDate: last?.date };
    }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [activeClients, selectedClientId, cisByClient, sessionsByClient]);

  const subtitle = activeClients.length
    ? `${activeClients.length} active client${activeClients.length === 1 ? '' : 's'}, ${stats.totalLost} lb lost between them. Highest progress score first.`
    : 'Progress shows up here once active clients start checking in.';

  return (
    <Page>
      <PageHeader
        title="Progress"
        subtitle={subtitle}
        actions={
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-full sm:w-56 h-10 bg-card" aria-label="Filter by client">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {activeClients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Roster totals */}
      <Panel className="grid grid-cols-2 lg:grid-cols-4 mb-5 divide-border [&>*]:border-border">
        <div className="p-5 border-b lg:border-b-0 border-r"><Stat label="Weight lost, all clients" value={stats.totalLost} unit="lb" /></div>
        <div className="p-5 border-b lg:border-b-0 lg:border-r"><Stat label="Average progress score" value={stats.avgScore} unit="/100" /></div>
        <div className="p-5 border-r"><Stat label="Trained in the last 7 days" value={stats.personalBests} /></div>
        <div className="p-5"><Stat label="Clients with photos" value={stats.photoClients} /></div>
      </Panel>

      {/* Client list */}
      <Panel className="overflow-hidden">
        {visibleClients.length === 0 ? (
          <EmptyState
            title="No active clients yet"
            body="Mark a client active and log a check-in to start tracking progress."
          />
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px_88px] gap-x-6 px-6 py-3 border-b border-border text-[13px] text-muted-foreground">
              <span>Client</span><span>Start, now, goal</span><span>Toward goal</span><span className="text-right">Score</span><span />
            </div>
            {visibleClients.map(row => (
              <ClientProgressRow key={row.client.id} row={row} onViewProgress={() => setDetailClient(row)} />
            ))}
          </>
        )}
      </Panel>

      {/* Detail Modal */}
      {detailClient && (
        <ClientProgressDetail
          client={detailClient.client}
          checkIns={detailClient.cis}
          sessions={detailClient.sessions}
          allClients={clients}
          onClose={() => setDetailClient(null)}
        />
      )}
    </Page>
  );
}

const GOAL_LABEL = { weight_loss: 'Fat loss', muscle_gain: 'Muscle gain', strength: 'Strength', endurance: 'Endurance', flexibility: 'Mobility', general_fitness: 'General fitness' };

function ClientProgressRow({ row, onViewProgress }) {
  const { client, cis, sessions, startWeight, currentWeight, goalWeight, weeksActive, trend, score, goalPct, lastDate } = row;
  const avatar = useSignedUrl(client.avatar_url);
  const trendText = trend === 'down' ? 'trending down' : trend === 'up' ? 'trending up' : 'holding steady';
  const facts = [
    GOAL_LABEL[client.goal] || 'General fitness',
    weeksActive ? `week ${weeksActive}` : null,
    `${cis.length} check-in${cis.length === 1 ? '' : 's'}`,
    `${sessions.length} workout${sessions.length === 1 ? '' : 's'}`,
    lastDate ? `updated ${format(parseISO(lastDate), 'MMM d')}` : null,
  ].filter(Boolean).join(', ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewProgress}
      onKeyDown={e => { if (e.key === 'Enter') onViewProgress(); }}
      className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px_88px] items-center gap-x-6 gap-y-3 px-4 sm:px-6 py-4 border-b border-border last:border-b-0 hover:bg-accent/60 cursor-pointer transition-colors"
    >
      {/* Client */}
      <div className="flex items-center gap-3 min-w-0">
        <Initials name={client.name || ''} src={avatar || undefined} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">{client.name}</p>
          <p className="text-[13px] text-muted-foreground truncate">{facts}</p>
        </div>
      </div>

      {/* Score (mobile: top right) */}
      <p className="lg:hidden text-right">
        {score !== null ? <span className={cn('num text-[22px]', score < 50 ? 'text-destructive' : 'text-foreground')}>{score}</span> : <span className="num text-[22px] text-muted-foreground">{'\u2014'}</span>}
      </p>

      {/* Weights */}
      <div className="col-span-2 lg:col-span-1 flex items-baseline gap-4 sm:gap-5">
        <WeightPill label="Start" value={startWeight} />
        <WeightPill label="Now" value={currentWeight} sub={trendText} />
        <WeightPill label="Goal" value={goalWeight} />
      </div>

      {/* Toward goal */}
      <div className="col-span-2 lg:col-span-1">
        <div className="flex justify-between text-[13px] text-muted-foreground mb-1.5">
          <span className="lg:hidden">Toward goal</span>
          <span className="tabular-nums lg:ml-auto">{goalPct !== null ? `${goalPct}%` : 'No goal weight'}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${goalPct ?? 0}%` }} />
        </div>
      </div>

      {/* Score (desktop) */}
      <p className="hidden lg:block text-right">
        {score !== null ? <span className={cn('num text-[22px]', score < 50 ? 'text-destructive' : 'text-foreground')}>{score}</span> : <span className="num text-[22px] text-muted-foreground">{'\u2014'}</span>}
      </p>

      <div className="hidden lg:flex justify-end" onClick={e => e.stopPropagation()}>
        <Button variant="outline" size="sm" onClick={onViewProgress}>Open</Button>
      </div>
    </div>
  );
}

function WeightPill({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="num text-[18px] text-foreground leading-tight">
        {value ? value : '\u2014'}
        {value ? <span className="text-[0.7em] ml-0.5">lb</span> : null}
      </p>
      {sub && <p className="text-[12px] text-muted-foreground whitespace-nowrap">{sub}</p>}
    </div>
  );
}
