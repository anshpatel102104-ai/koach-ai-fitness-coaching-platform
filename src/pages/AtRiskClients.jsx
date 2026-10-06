import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Settings, Search, X, RefreshCw } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Page, PageHeader, Panel, Stat, EmptyState, ComplianceLegend, KeyValue } from '@/components/kit';
import { getAtRiskClients } from '@/lib/riskEngine';
import { toast } from 'sonner';
import RiskBreakdown, { riskLevel } from '@/components/at-risk/RiskBreakdown';
import RiskClientCard from '@/components/at-risk/RiskClientCard';
import BulkActionBar from '@/components/at-risk/BulkActionBar';

/* ── Main page ── */
export default function AtRiskClients({ embedded = false }) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.entities.Client.list('name') });
  const { data: checkIns = [], isLoading, refetch } = useQuery({ queryKey: ['checkins-risk'], queryFn: () => db.entities.CheckIn.list('-date', 400) });
  const { data: messages = [] } = useQuery({ queryKey: ['messages'], queryFn: () => db.entities.Message.list('-created_date', 500) });

  const atRisk = useMemo(() => getAtRiskClients(clients, checkIns), [clients, checkIns]);

  const sorted = useMemo(() => [...atRisk].sort((a, b) => b.riskScore - a.riskScore), [atRisk]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(e => e.client.name?.toLowerCase().includes(q)); }
    if (riskFilter !== 'all') list = list.filter(e => riskLevel(e) === riskFilter);
    return list;
  }, [sorted, search, riskFilter]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const newlyFlagged = atRisk.filter(e => {
      const ci = e.clientCheckIns[0];
      return ci && differenceInDays(now, parseISO(ci.date)) <= 7;
    }).length;
    const resolved = clients.filter(c => c.lifecycle_status === 'active' && c.status === 'active').length;
    return {
      total: atRisk.length,
      newlyFlagged,
      successRate: atRisk.length > 0 ? Math.round((resolved / (resolved + atRisk.length)) * 100) : 100,
      avgDaysAtRisk: atRisk.length > 0 ? Math.round(atRisk.reduce((s, e) => {
        const ci = e.clientCheckIns[e.clientCheckIns.length - 1];
        return s + (ci ? differenceInDays(now, parseISO(ci.date)) : 0);
      }, 0) / atRisk.length) : 0,
    };
  }, [atRisk, clients]);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleNudge = (clientId, clientName) => navigate(`/messages?clientId=${clientId}&clientName=${clientName}`);
  const handleResolve = () => { toast.success('Marked as resolved'); };

  const urgent = atRisk.filter(e => riskLevel(e) === 'critical').length;
  const subtitle = atRisk.length === 0
    ? 'No one is slipping right now.'
    : `${atRisk.length} client${atRisk.length === 1 ? ' is' : 's are'} slipping${urgent ? `, ${urgent} need${urgent === 1 ? 's' : ''} you today` : ''}. Start at the top.`;

  const headerActions = (
    <>
      <Button variant="outline" onClick={() => navigate('/checkin-review')}>Check-in queue</Button>
      <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh" aria-label="Refresh"><RefreshCw /></Button>
      <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="How risk is scored" aria-label="How risk is scored"><Settings /></Button>
    </>
  );

  const body = (
    <>
      {/* ── Stats ── */}
      <Panel className="mb-5 grid grid-cols-2 lg:grid-cols-4">
        <Stat className="border-b border-r border-border px-5 py-4 sm:px-6 lg:border-b-0" label="At risk" value={stats.total} tone={stats.total ? 'danger' : undefined} sub="Active clients with a flag" />
        <Stat className="border-b border-border px-5 py-4 sm:px-6 lg:border-b-0 lg:border-r" label="Checked in this week" value={stats.newlyFlagged} sub="Flagged, but still talking" />
        <Stat className="border-r border-border px-5 py-4 sm:px-6" label="On track" value={`${stats.successRate}%`} sub="Share of your roster" />
        <Stat className="px-5 py-4 sm:px-6" label="Days on record" value={`${stats.avgDaysAtRisk}`} unit="avg" sub="Across flagged clients" />
      </Panel>

      {/* ── Filters + search ── */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <RiskBreakdown atRisk={atRisk} onFilter={setRiskFilter} activeFilter={riskFilter} />
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search at-risk clients" value={search} onChange={e => setSearch(e.target.value)} className="h-10 bg-card pl-9" />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ── Client list ── */}
      <Panel>
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <p className="text-[13px] text-muted-foreground">Client and main reason · last 8 weeks · 4-week adherence</p>
          <ComplianceLegend className="hidden md:flex" />
        </div>
        {isLoading ? (
          <div className="space-y-3 p-6" aria-busy="true">
            {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-secondary" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search || riskFilter !== 'all' ? 'No one matches this filter.' : 'Every active client is on track.'}
            body={search || riskFilter !== 'all' ? undefined : 'Nobody has a risk flag based on their recent check-ins.'}
            action={search || riskFilter !== 'all'
              ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); setRiskFilter('all'); }}>Clear filters</Button>
              : undefined}
          />
        ) : (
          <div>
            {filtered.map(entry => (
              <RiskClientCard
                key={entry.client.id}
                entry={entry}
                messages={messages}
                onSendNudge={handleNudge}
                onResolve={handleResolve}
                selected={selectedIds.includes(entry.client.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </Panel>

      {selectedIds.length > 0 && (
        <BulkActionBar selectedIds={selectedIds} clients={clients} atRisk={atRisk} onClear={() => setSelectedIds([])} />
      )}

      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>How risk is scored</SheetTitle>
            <SheetDescription>Flags come from each client&apos;s recent check-ins. These thresholds are fixed for now.</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <KeyValue label="Missed check-in" value="14 days" />
            <KeyValue label="Low adherence" value="Under 70%" />
            <KeyValue label="Urgent" value="3+ flags" />
            <KeyValue label="This week" value="2 flags" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );

  if (embedded) return <div className="pb-24 lg:pb-8">{body}</div>;

  return (
    <Page className="pb-24 lg:pb-12">
      <PageHeader title="At risk" subtitle={subtitle} actions={headerActions} />
      {body}
    </Page>
  );
}
