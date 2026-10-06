import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { subWeeks, parseISO, format } from 'date-fns';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Page, PageHeader, Panel, PanelHeader, Stat, Segmented, Initials, TextLink, KeyValue } from '@/components/kit';
import AdherencePanel from '../components/adherence/AdherencePanel';
import BadgeCard from '../components/adherence/BadgeCard';
import BadgeUnlockToast from '../components/adherence/BadgeUnlockToast';
import AdherenceTable from '../components/adherence/AdherenceTable';
import AdherenceTrends from '../components/adherence/AdherenceTrends';
import AtRiskClients from './AtRiskClients';
import { track } from '@/lib/telemetry';
import AdherenceDetailDrawer from '../components/adherence/AdherenceDetailDrawer';
import AdherenceLeaderboard from '../components/adherence/AdherenceLeaderboard';
import { averageAdherenceScore, calculateStreak, checkInScore } from '@/lib/adherence';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { runAutoAwardForClient } from '@/lib/autoAward';
import { showAchievementToast } from '@/components/achievements/AchievementToast';
import { sendZapierEvent } from '@/lib/zapier';

const DATE_RANGES = [
  { label: 'This week', weeks: 1 },
  { label: '30 days', weeks: 4 },
  { label: '90 days', weeks: 13 },
];

const TIER_FILTERS = ['All', 'bronze', 'silver', 'gold', 'platinum', 'elite'];
const CATEGORY_FILTERS = ['All', 'Milestones', 'Check-ins', 'Streaks', 'Compliance', 'Nutrition', 'Recovery', 'Mindset', 'Transformation', 'Performance', 'Special'];

const BADGE_PROGRESS_HINT = {
  streak_7:  { max: 7,  field: 'streak' },
  streak_14: { max: 14, field: 'streak' },
  streak_30: { max: 30, field: 'streak' },
  streak_60: { max: 60, field: 'streak' },
  streak_90: { max: 90, field: 'streak' },
  first_checkin: { max: 1, field: 'checkins' },
  perfect_week:  { max: 4, field: 'perfectCheckins' },
};

function getProgressForBadge(badgeKey, checkIns) {
  const hint = BADGE_PROGRESS_HINT[badgeKey];
  if (!hint) return null;
  const streak = calculateStreak(checkIns);
  if (hint.field === 'streak') return Math.min(streak, hint.max);
  if (hint.field === 'checkins') return Math.min(checkIns.length, hint.max);
  if (hint.field === 'perfectCheckins') {
    const scores = checkIns.slice(0, 4).map(checkInScore).filter(s => s !== null && s >= 80);
    return Math.min(scores.length, hint.max);
  }
  return null;
}

export default function Adherence() {
  const [view, setView] = useState('overview'); // 'overview' | 'atrisk' (At-Risk folded in here)
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({ client_id: '', badge_key: 'pr_hit', earned_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [tierFilter, setTierFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [autoAwarding, setAutoAwarding] = useState(false);
  const [unlockToast, setUnlockToast] = useState(null);
  const [dateRange, setDateRange] = useState(DATE_RANGES[1]); // Last 30 Days
  const [selectedClient, setSelectedClient] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = db.entities.CheckIn.subscribe((event) => {
      if (event.type === 'create') queryClient.invalidateQueries({ queryKey: ['checkins'] });
    });
    return unsub;
  }, [queryClient]);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.entities.Client.list('name') });
  const { data: checkIns = [] } = useQuery({ queryKey: ['checkins'], queryFn: () => db.entities.CheckIn.list('-date', 500) });
  const { data: badges = [] } = useQuery({ queryKey: ['badges'], queryFn: () => db.entities.ClientBadge.list('-earned_date', 500) });

  const awardMutation = useMutation({
    mutationFn: (data) => db.entities.ClientBadge.create(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['recent-badges'] });
      setAwardOpen(false);
      const client = clients.find(c => c.id === vars.client_id);
      setUnlockToast({ badgeKey: vars.badge_key, clientName: client?.name });
      showAchievementToast(toast, vars.badge_key, client?.name);
      sendZapierEvent('badge.awarded', { client_id: vars.client_id, client_name: client?.name, badge_key: vars.badge_key, badge_label: BADGE_CONFIG[vars.badge_key]?.label, earned_date: vars.earned_date });
    },
  });

  const activeClients = clients.filter(c => c.status === 'active' || c.lifecycle_status === 'active');
  const getCheckIns = (id) => checkIns.filter(ci => ci.client_id === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const getBadges = (id) => badges.filter(b => b.client_id === id);

  // ── Stat Cards ──
  const stats = useMemo(() => {
    const cutoff = subWeeks(new Date(), dateRange.weeks);
    let totalOverall = 0, totalWorkout = 0, totalNutrition = 0, scored = 0, atRisk = 0;
    for (const client of activeClients) {
      const cis = getCheckIns(client.id).filter(ci => parseISO(ci.date) >= cutoff);
      const overall = cis.length ? averageAdherenceScore(cis) : null;
      const wkVals = cis.map(ci => ci.compliance_training).filter(v => v != null);
      const ntVals = cis.map(ci => ci.compliance_nutrition).filter(v => v != null);
      if (overall !== null) { totalOverall += overall; scored++; }
      if (wkVals.length) totalWorkout += Math.round(wkVals.reduce((a, b) => a + b, 0) / wkVals.length);
      if (ntVals.length) totalNutrition += Math.round(ntVals.reduce((a, b) => a + b, 0) / ntVals.length);
      if (overall !== null && overall < 50) atRisk++;
    }
    return {
      overall: scored ? Math.round(totalOverall / scored) : 0,
      workout: scored ? Math.round(totalWorkout / scored) : 0,
      nutrition: scored ? Math.round(totalNutrition / scored) : 0,
      atRisk,
    };
  }, [activeClients, checkIns, dateRange]);

  const atRiskClients = activeClients.filter(c => {
    const score = averageAdherenceScore(getCheckIns(c.id));
    return score !== null && score < 50;
  });

  const badgeCountMap = useMemo(() => {
    const map = {};
    badges.forEach(b => { map[b.badge_key] = (map[b.badge_key] || 0) + 1; });
    return map;
  }, [badges]);

  const filteredBadgeKeys = useMemo(() =>
    Object.keys(BADGE_CONFIG).filter(k => {
      const cfg = BADGE_CONFIG[k];
      return (tierFilter === 'All' || cfg.tier === tierFilter) && (categoryFilter === 'All' || cfg.category === categoryFilter);
    }), [tierFilter, categoryFilter]);

  const categoryBadgeCounts = useMemo(() => {
    const counts = {};
    CATEGORY_FILTERS.forEach(cat => {
      counts[cat] = cat === 'All' ? Object.keys(BADGE_CONFIG).length : Object.values(BADGE_CONFIG).filter(b => b.category === cat).length;
    });
    return counts;
  }, []);

  const handleAward = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === awardForm.client_id);
    awardMutation.mutate({ ...awardForm, client_name: client?.name || '' });
  };

  const openAwardFor = (badgeKey, clientId = '') => {
    setAwardForm({ client_id: clientId, badge_key: badgeKey, earned_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    setAwardOpen(true);
  };

  const handleAutoAward = async () => {
    setAutoAwarding(true);
    let totalBadges = 0; let affectedClients = 0;
    try {
      for (const client of activeClients) {
        const cis = getCheckIns(client.id);
        const cBadges = getBadges(client.id);
        const newKeys = await runAutoAwardForClient(client, cis, cBadges);
        if (newKeys.length > 0) { affectedClients++; totalBadges += newKeys.length; newKeys.forEach(key => showAchievementToast(toast, key, client.name)); }
      }
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['recent-badges'] });
      toast[totalBadges === 0 ? 'info' : 'success'](totalBadges === 0 ? 'No new badges. Everyone is up to date.' : `Awarded ${totalBadges} badge${totalBadges !== 1 ? 's' : ''} to ${affectedClients} client${affectedClients !== 1 ? 's' : ''}`);
    } catch (err) { toast.error('Couldn\'t auto-award: ' + err.message); }
    finally { setAutoAwarding(false); }
  };

  const selectedClientCheckIns = selectedClient ? getCheckIns(selectedClient.id) : [];
  const goalLabel = (g) => g ? g.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'General fitness';

  return (
    <Page className="pb-24 lg:pb-12">
      <PageHeader
        title="Adherence"
        subtitle="How closely each client is following the plan, week by week."
        actions={
          <>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="How the score works" aria-label="How the score works"><Settings /></Button>
            <Button variant="outline" onClick={handleAutoAward} disabled={autoAwarding}>
              {autoAwarding ? 'Checking…' : 'Auto-award badges'}
            </Button>
            <Button onClick={() => openAwardFor('pr_hit')}>Award a badge</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* At-risk is folded in here as a view (route /at-risk still works) */}
        <Segmented
          value={view}
          onChange={(k) => { setView(k); track('nav.subtab', { parent: 'adherence', tab: k }); }}
          options={[{ value: 'overview', label: 'Overview' }, { value: 'atrisk', label: 'At risk' }]}
        />
        {view === 'overview' && (
          <Segmented
            size="sm"
            value={dateRange.label}
            onChange={(label) => setDateRange(DATE_RANGES.find(r => r.label === label))}
            options={DATE_RANGES.map(r => ({ value: r.label, label: r.label }))}
          />
        )}
      </div>

      {view === 'atrisk' ? <AtRiskClients embedded /> : (
      <>
      {/* ── Stats ── */}
      <Panel className="mb-5 grid grid-cols-2 lg:grid-cols-4">
        <Stat className="border-b border-r border-border px-5 py-4 sm:px-6 lg:border-b-0" label="Overall" value={`${stats.overall}%`} sub={`Average, ${dateRange.label.toLowerCase()}`} />
        <Stat className="border-b border-border px-5 py-4 sm:px-6 lg:border-b-0 lg:border-r" label="Training" value={`${stats.workout}%`} sub="Workouts completed" />
        <Stat className="border-r border-border px-5 py-4 sm:px-6" label="Nutrition" value={`${stats.nutrition}%`} sub="Days on target" />
        <Stat className="px-5 py-4 sm:px-6" label="Below 50%" value={stats.atRisk} tone={stats.atRisk ? 'danger' : undefined} sub={stats.atRisk ? 'Need a conversation' : 'Nobody this period'} />
      </Panel>

      {/* ── At-risk line ── */}
      {atRiskClients.length > 0 && (
        <div className="mb-5 flex flex-col gap-2 rounded-xl bg-destructive/[0.06] px-5 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-foreground">
            <span className="font-semibold text-destructive">{atRiskClients.length} client{atRiskClients.length > 1 ? 's are' : ' is'} below 50%:</span>{' '}
            {atRiskClients.map(c => c.name).join(', ')}
          </p>
          <TextLink onClick={() => { setView('atrisk'); track('nav.subtab', { parent: 'adherence', tab: 'atrisk' }); }} className="flex-shrink-0">See who&apos;s at risk</TextLink>
        </div>
      )}

      {/* ── Table ── */}
      <div className="mb-5">
        <AdherenceTable
          clients={activeClients}
          checkIns={checkIns}
          rangeWeeks={dateRange.weeks}
          onSelectClient={setSelectedClient}
        />
      </div>

      {/* ── Trends + ranking ── */}
      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AdherenceTrends clients={activeClients} checkIns={checkIns} rangeWeeks={dateRange.weeks} />
        <AdherenceLeaderboard clients={activeClients} checkIns={checkIns} badges={badges} onSelect={setSelectedClient} />
      </div>

      {/* ── Badges gallery ── */}
      <Panel className="mb-5">
        <PanelHeader
          title="Badges"
          subtitle={`${Object.keys(BADGE_CONFIG).length} badges. Solid ones at least one client has earned. Click any badge to award it.`}
        />
        <div className="space-y-2.5 px-5 sm:px-6">
          <Segmented
            size="sm"
            value={tierFilter}
            onChange={setTierFilter}
            options={TIER_FILTERS.map(t => ({
              value: t,
              label: t === 'All' ? 'All tiers' : TIER_STYLES[t]?.label || t,
              count: t === 'All' ? undefined : Object.values(BADGE_CONFIG).filter(b => b.tier === t).length,
            }))}
          />
          <div>
            <Segmented
              size="sm"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_FILTERS.map(cat => ({ value: cat, label: cat === 'All' ? 'All kinds' : cat, count: categoryBadgeCounts[cat] }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3 sm:px-6 md:grid-cols-4 lg:grid-cols-6">
          {(showAllBadges ? filteredBadgeKeys : filteredBadgeKeys.slice(0, 18)).map(key => {
            const hint = BADGE_PROGRESS_HINT[key];
            const anyClientCheckIns = activeClients.length > 0 ? getCheckIns(activeClients[0].id) : [];
            const prog = hint ? getProgressForBadge(key, anyClientCheckIns) : null;
            return (
              <BadgeCard key={key} badgeKey={key} earned={badgeCountMap[key] > 0} clientCount={badgeCountMap[key] || 0}
                progress={!badgeCountMap[key] ? prog : undefined} progressMax={!badgeCountMap[key] ? hint?.max : undefined}
                onClick={() => openAwardFor(key)} />
            );
          })}
          {filteredBadgeKeys.length === 0 && (
            <p className="col-span-full py-4 text-sm text-muted-foreground">No badges in this tier and kind.</p>
          )}
        </div>
        {filteredBadgeKeys.length > 18 && (
          <div className="border-t border-border px-5 py-3 sm:px-6">
            <TextLink onClick={() => setShowAllBadges(v => !v)}>
              {showAllBadges ? 'Show fewer' : `Show all ${filteredBadgeKeys.length} badges`}
            </TextLink>
          </div>
        )}
      </Panel>

      {/* ── Per-client panels ── */}
      <h2 className="mb-3 text-[22px] text-foreground">By client</h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {activeClients.map(client => {
          const clientBadges = getBadges(client.id);
          const cis = getCheckIns(client.id);
          return (
            <Panel key={client.id} className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Initials name={client.name} size={40} />
                <button onClick={() => setSelectedClient(client)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[16px] font-semibold text-foreground hover:underline underline-offset-4">{client.name}</p>
                  <p className="text-[13px] text-muted-foreground">{goalLabel(client.goal)} · {clientBadges.length} of {Object.keys(BADGE_CONFIG).length} badges</p>
                </button>
                <Button size="sm" variant="outline" onClick={() => openAwardFor('pr_hit', client.id)}>Award</Button>
              </div>
              <AdherencePanel client={client} checkIns={cis} badges={clientBadges} />
            </Panel>
          );
        })}
      </div>
      </>
      )}

      {/* ── Award dialog ── */}
      <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Award a badge</DialogTitle>
            <DialogDescription>The client sees it in their app straight away.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAward} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={awardForm.client_id} onValueChange={v => setAwardForm({ ...awardForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Select value={awardForm.badge_key} onValueChange={v => setAwardForm({ ...awardForm, badge_key: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BADGE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} · {TIER_STYLES[v.tier]?.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {awardForm.badge_key && BADGE_CONFIG[awardForm.badge_key] && (() => {
              const cfg = BADGE_CONFIG[awardForm.badge_key];
              const t = TIER_STYLES[cfg.tier];
              return (
                <div className="rounded-lg bg-secondary px-4 py-3">
                  <p className="text-[15px] font-semibold text-foreground">{cfg.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{cfg.desc} · {t?.label}</p>
                </div>
              );
            })()}
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={awardForm.earned_date} onChange={e => setAwardForm({ ...awardForm, earned_date: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAwardOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!awardForm.client_id || awardMutation.isPending}>Award badge</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── How the score works ── */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>How the score works</SheetTitle>
            <SheetDescription>Each client&apos;s score blends their last four check-ins. Custom weights aren&apos;t available yet.</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <p className="mb-1 text-sm font-semibold text-foreground">Weights</p>
            <KeyValue label="Workouts completed" value="35%" />
            <KeyValue label="Nutrition on target" value="30%" />
            <KeyValue label="Sleep" value="20%" />
            <KeyValue label="Check-ins sent" value="15%" />
            <p className="mb-1 mt-6 text-sm font-semibold text-foreground">Thresholds</p>
            <KeyValue label="At risk below" value={<span className="text-destructive">50%</span>} />
            <KeyValue label="On plan from" value={<span className="text-success">80%</span>} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Client detail drawer ── */}
      <AdherenceDetailDrawer
        client={selectedClient}
        checkIns={selectedClientCheckIns}
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />

      {unlockToast && <BadgeUnlockToast badgeKey={unlockToast.badgeKey} clientName={unlockToast.clientName} onClose={() => setUnlockToast(null)} />}
    </Page>
  );
}
