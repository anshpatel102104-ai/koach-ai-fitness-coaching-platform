import React, { useState, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { getAtRiskClients } from '@/lib/riskEngine';
import { Page, Panel, PanelHeader, CountBadge } from '@/components/kit';
import RunMyDayCenter from './RunMyDayCenter';
import DashboardKPIs from './DashboardKPIs';
import TodaySchedule from './TodaySchedule';
import WeeklySnapshot from './WeeklySnapshot';
import FirstTimeBanner from './FirstTimeBanner';
import AIInsightsFeed from './AIInsightsFeed';
import WeekStrip from './WeekStrip';
import NeedsYouPanel from './NeedsYouPanel';
import RosterPulse from './RosterPulse';
import FirstRunWelcome from './FirstRunWelcome';
import BIDashboardCard from '@/components/business/bi/BIDashboardCard';
import {
  isActiveClient, groupCheckIns, rosterPulseRows, weekLabels,
  describeFlag, describeCheckIn, unreadThreads,
} from './todayModel';

/** "Run my day": every open item, grouped by urgency, with a manual refresh. */
function ActionCenterSection({ clients, checkIns, messages, payments }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [openCount, setOpenCount] = useState(0);

  return (
    <Panel>
      <PanelHeader
        title={<span className="inline-flex items-center gap-2">Run my day <CountBadge count={openCount} tone="neutral" /></span>}
        subtitle="Every open item across your roster, most urgent first."
        right={
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="touch-compact rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Refresh the list"
            aria-label="Refresh the list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />
      <RunMyDayCenter
        clients={clients}
        checkIns={checkIns}
        messages={messages}
        payments={payments}
        refreshKey={refreshKey}
        onCountChange={setOpenCount}
      />
    </Panel>
  );
}

function headlineFor(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 'Nothing is waiting on you. Your roster is on plan.';
  const first = counts.findIndex(n => n > 0);
  const start = ['Start with the red column.', 'Start with the clients slipping.', 'Start with your messages.'][first];
  return `${total} ${total === 1 ? 'thing needs' : 'things need'} you today. ${start}`;
}

export default function TodayView({ clients, checkIns, messages, payments = [], user }) {
  const now = useMemo(() => new Date(), []);
  const ciMap = useMemo(() => groupCheckIns(checkIns), [checkIns]);
  const activeClients = useMemo(() => clients.filter(isActiveClient), [clients]);

  // Column 1 — check-ins waiting on a reply (last 14 days), longest wait first.
  const reviews = useMemo(() => {
    const items = checkIns
      .filter(ci => !ci.coach_responded && !ci.coach_notes && ci.date && differenceInDays(now, parseISO(ci.date)) <= 14)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const rows = items.slice(0, 3).map(ci => {
      const client = clients.find(c => c.id === ci.client_id);
      return {
        key: ci.id,
        name: client?.name || ci.client_name || 'Client',
        detail: describeCheckIn(ci, ciMap[ci.client_id] || []),
        href: `/checkin-detail?id=${ci.id}&clientId=${ci.client_id}`,
      };
    });
    return { items, rows };
  }, [checkIns, clients, ciMap, now]);

  // Column 2 — clients the risk engine flags.
  const slipping = useMemo(() => {
    const items = getAtRiskClients(clients, checkIns);
    const rows = items.slice(0, 3).map(e => ({
      key: e.client.id,
      name: e.client.name,
      detail: describeFlag(e.flags[0], e.clientCheckIns),
      href: `/client-profile?id=${e.client.id}`,
    }));
    return { items, rows };
  }, [clients, checkIns]);

  // Column 3 — unread client messages, grouped by thread.
  const threads = useMemo(() => {
    const items = unreadThreads(messages, clients);
    const rows = items.slice(0, 3).map(t => ({
      key: t.clientId,
      name: t.name,
      detail: t.preview,
      href: `/messages?clientId=${t.clientId}`,
    }));
    return { items, rows };
  }, [messages, clients]);
  const unreadCount = useMemo(() => threads.items.reduce((s, t) => s + t.count, 0), [threads]);

  const labels = useMemo(() => weekLabels(8, now), [now]);
  const pulseRows = useMemo(() => rosterPulseRows(clients, ciMap, 8, now), [clients, ciMap, now]);

  const [showBanner, setShowBanner] = useState(() => {
    try {
      return localStorage.getItem('koach_onboarding_complete') === '1' &&
             localStorage.getItem('koach_banner_dismissed') !== '1';
    } catch { return false; }
  });

  const dismissBanner = () => {
    try { localStorage.setItem('koach_banner_dismissed', '1'); } catch { /* storage blocked */ }
    setShowBanner(false);
  };

  // First run: no clients yet → the welcome checklist replaces Today.
  if (clients.length === 0) {
    return <FirstRunWelcome user={user} clientCount={0} />;
  }

  return (
    <Page className="pb-24 lg:pb-12">
      {/* ── Date + one sentence, week strip on the right ── */}
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[32px] text-foreground sm:text-[40px]">{format(now, 'EEEE, MMMM d')}</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground sm:text-base">
            {headlineFor([reviews.items.length, slipping.items.length, unreadCount])}
          </p>
        </div>
        <WeekStrip activeClients={activeClients} ciMap={ciMap} now={now} />
      </header>

      {/* ── What needs you ── */}
      <NeedsYouPanel reviews={reviews} slipping={slipping} threads={threads} unreadCount={unreadCount} />

      {/* ── Roster pulse + AI briefing ── */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <RosterPulse rows={pulseRows} labels={labels} total={pulseRows.length} />
        <AIInsightsFeed clients={clients} checkIns={checkIns} messages={messages} className="self-start" />
      </div>

      {/* ── Below the fold: the rest of the day ── */}
      {showBanner && (
        <div className="mt-5">
          <FirstTimeBanner onDismiss={dismissBanner} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ActionCenterSection clients={clients} checkIns={checkIns} messages={messages} payments={payments} />
        <div className="flex min-w-0 flex-col gap-5">
          <TodaySchedule clients={clients} />
          <DashboardKPIs clients={clients} checkIns={checkIns} payments={payments} />
          <BIDashboardCard />
        </div>
      </div>

      <div className="mt-5">
        <WeeklySnapshot checkIns={checkIns} clients={clients} />
      </div>
    </Page>
  );
}
