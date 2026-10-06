import React, { useState, useMemo } from 'react';
import { differenceInDays, parseISO, subWeeks } from 'date-fns';
import { ArrowUp, ArrowDown, MessageSquare, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { useNavigate } from 'react-router-dom';
import { Panel, Segmented, Initials, ComplianceStrip, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { weeklyCompliance } from '@/components/dashboard/todayModel';

const FILTER_CHIPS = ['All', 'On Track', 'Needs Attention', 'At Risk', 'Inactive'];
const CHIP_LABELS = { All: 'All', 'On Track': 'On plan', 'Needs Attention': 'Partial', 'At Risk': 'At risk', Inactive: 'Quiet 14+ days' };

const pctTone = (v) => v == null ? 'text-muted-foreground' : v >= 80 ? 'text-foreground' : v >= 50 ? 'text-warning' : 'text-destructive';

function statusLine({ overall, daysSinceLast, trend }) {
  if (daysSinceLast === null) return 'No check-ins yet';
  if (daysSinceLast > 14) return `Quiet for ${daysSinceLast} days`;
  const when = daysSinceLast === 0 ? 'today' : daysSinceLast === 1 ? 'yesterday' : `${daysSinceLast} days ago`;
  if (overall !== null && overall < 50) return `Struggling, last check-in ${when}`;
  if (trend === 'down') return `Slipping, last check-in ${when}`;
  if (trend === 'up') return `Improving, last check-in ${when}`;
  return `Last check-in ${when}`;
}

function calcClientStats(client, checkIns, rangeWeeks) {
  const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const cutoff = subWeeks(new Date(), rangeWeeks);
  const inRange = sorted.filter(ci => parseISO(ci.date) >= cutoff);
  const prevCutoff = subWeeks(new Date(), rangeWeeks * 2);
  const prevRange = sorted.filter(ci => parseISO(ci.date) >= prevCutoff && parseISO(ci.date) < cutoff);

  const avg = (arr, key) => {
    const vals = arr.map(ci => ci[key]).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const workout = avg(inRange, 'compliance_training');
  const nutrition = avg(inRange, 'compliance_nutrition');
  const overall = inRange.length ? averageAdherenceScore(inRange) : null;
  const prevOverall = prevRange.length ? averageAdherenceScore(prevRange) : null;
  const trend = overall !== null && prevOverall !== null
    ? overall - prevOverall > 5 ? 'up' : overall - prevOverall < -5 ? 'down' : 'stable'
    : 'stable';

  const streak = calculateStreak(sorted);
  const lastCheckIn = sorted[0]?.date;
  const daysSinceLast = lastCheckIn ? differenceInDays(new Date(), parseISO(lastCheckIn)) : null;

  // Check-in adherence: how many weeks had a check-in
  const ciAdherence = rangeWeeks > 0 ? Math.min(100, Math.round((inRange.length / rangeWeeks) * 100)) : 0;

  return { workout, nutrition, overall, trend, streak, daysSinceLast, ciAdherence, inRange, prevOverall };
}

export default function AdherenceTable({ clients, checkIns, rangeWeeks, onSelectClient }) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('All');
  const [sortKey, setSortKey] = useState('overall');
  const [sortDir, setSortDir] = useState('desc');
  const navigate = useNavigate();

  const cisByClient = useMemo(() => {
    const map = {};
    for (const ci of checkIns) (map[ci.client_id] = map[ci.client_id] || []).push(ci);
    return map;
  }, [checkIns]);

  const rows = useMemo(() => clients.map(client => {
    const cis = cisByClient[client.id] || [];
    const sortedCis = [...cis].sort((a, b) => new Date(b.date) - new Date(a.date));
    return { client, ...calcClientStats(client, cis, rangeWeeks), cells: weeklyCompliance(client, sortedCis, 8) };
  }), [clients, cisByClient, rangeWeeks]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.client.name?.toLowerCase().includes(q));
    }
    if (chip === 'On Track') list = list.filter(r => r.overall !== null && r.overall >= 80);
    if (chip === 'Needs Attention') list = list.filter(r => r.overall !== null && r.overall >= 50 && r.overall < 80);
    if (chip === 'At Risk') list = list.filter(r => r.overall !== null && r.overall < 50);
    if (chip === 'Inactive') list = list.filter(r => r.daysSinceLast === null || r.daysSinceLast > 14);

    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? -1;
      const bv = b[sortKey] ?? -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, search, chip, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
    : null;

  const chipCount = (c) => {
    if (c === 'All') return rows.length;
    if (c === 'On Track') return rows.filter(r => r.overall !== null && r.overall >= 80).length;
    if (c === 'Needs Attention') return rows.filter(r => r.overall !== null && r.overall >= 50 && r.overall < 80).length;
    if (c === 'At Risk') return rows.filter(r => r.overall !== null && r.overall < 50).length;
    return rows.filter(r => r.daysSinceLast === null || r.daysSinceLast > 14).length;
  };

  const SortHead = ({ label, k, className }) => (
    <th className={cn('px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground', className)}>
      {k ? (
        <button onClick={() => toggleSort(k)} className={cn('inline-flex items-center gap-1 text-[13px] font-medium hover:text-foreground', sortKey === k && 'text-foreground')}>
          {label}<SortIcon k={k} />
        </button>
      ) : label}
    </th>
  );

  const exportCSV = () => {
    const headers = ['Client', 'Overall', 'Workout', 'Nutrition', 'Check-in', 'Streak', 'Trend', 'Last Active'];
    const rows2 = filtered.map(r => [
      r.client.name, r.overall ?? '', r.workout ?? '', r.nutrition ?? '', r.ciAdherence ?? '',
      r.streak, r.trend, r.daysSinceLast !== null ? `${r.daysSinceLast}d ago` : 'Never',
    ]);
    const csv = [headers, ...rows2].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'adherence.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar: segmented filters left, search + export right */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={chip}
          onChange={setChip}
          options={FILTER_CHIPS.map(c => ({ value: c, label: CHIP_LABELS[c], count: chipCount(c) }))}
        />
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search clients" value={search} onChange={e => setSearch(e.target.value)} className="h-10 bg-card pl-9" />
          </div>
          <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left text-[13px] font-medium text-muted-foreground sm:pl-6">Client</th>
                <th className="px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground">Last 8 weeks</th>
                <SortHead label="Overall" k="overall" className="text-right" />
                <SortHead label="Training" k="workout" className="text-right" />
                <SortHead label="Nutrition" k="nutrition" className="text-right" />
                <SortHead label="Check-ins" k="ciAdherence" className="text-right" />
                <SortHead label="Streak" k="streak" className="text-right" />
                <th className="py-2.5 pl-3 pr-5 text-right text-[13px] font-medium text-muted-foreground sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No clients match this filter." /></td></tr>
              ) : filtered.map(({ client, overall, workout, nutrition, ciAdherence, streak, trend, daysSinceLast, cells }) => (
                <tr key={client.id}
                  onClick={() => onSelectClient(client)}
                  className="cursor-pointer border-t border-border transition-colors first:border-t-0 hover:bg-accent/60">
                  <td className="py-3 pl-5 pr-3 sm:pl-6">
                    <div className="flex items-center gap-3">
                      <Initials name={client.name} size={36} tone={(overall !== null && overall < 50) || (daysSinceLast !== null && daysSinceLast > 14) ? 'alert' : 'default'} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-foreground">{client.name}</p>
                        <p className={cn('truncate text-[13px]', daysSinceLast === null || daysSinceLast > 14 ? 'text-destructive' : 'text-muted-foreground')}>
                          {statusLine({ overall, daysSinceLast, trend })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><ComplianceStrip weeks={cells} size="sm" label={`${client.name}, last 8 weeks`} /></td>
                  <td className="px-3 py-3 text-right">
                    <span className="num inline-flex items-center gap-1 text-[19px] text-foreground">
                      {trend === 'up' && <ArrowUp className="h-3.5 w-3.5 text-success" aria-label="Up" />}
                      {trend === 'down' && <ArrowDown className="h-3.5 w-3.5 text-destructive" aria-label="Down" />}
                      {overall !== null ? `${overall}%` : '—'}
                    </span>
                  </td>
                  <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', pctTone(workout))}>{workout != null ? `${workout}%` : '—'}</td>
                  <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', pctTone(nutrition))}>{nutrition != null ? `${nutrition}%` : '—'}</td>
                  <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', pctTone(ciAdherence))}>{ciAdherence}%</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{streak} wk</td>
                  <td className="py-3 pl-3 pr-5 sm:pr-6" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="w-8 px-0" title={`Message ${client.name}`} aria-label={`Message ${client.name}`}
                        onClick={() => navigate(`/messages?clientId=${client.id}`)}>
                        <MessageSquare />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/client-profile?clientId=${client.id}`)}>Profile</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
