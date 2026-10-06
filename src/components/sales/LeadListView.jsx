import React, { useState, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowUpDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel, Initials, EmptyState } from '@/components/kit';
import { stageLabel } from './KanbanBoard';
import { sourceLabel, money, shortDate, isFollowUpOverdue, lastContactLabel, scoreTone } from './leadMeta';

const STAGE_BADGE = { closed_won: 'success', lost: 'outline' };

function StageChip({ stage }) {
  return <Badge variant={STAGE_BADGE[stage] || 'secondary'} className="whitespace-nowrap">{stageLabel(stage)}</Badge>;
}

export default function LeadListView({ leads, onView, onUpdate: _onUpdate, onDelete, search }) {
  const [sortKey, setSortKey] = useState('created_date');
  const [sortDir, setSortDir] = useState(-1);
  const [selected, setSelected] = useState([]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(-1); }
  };

  const sorted = useMemo(() => {
    return [...leads]
      .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        let va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
        if (typeof va === 'string') return sortDir * va.localeCompare(vb);
        return sortDir * (va - vb);
      });
  }, [leads, sortKey, sortDir, search]);

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === sorted.length ? [] : sorted.map(l => l.id));
  const allSelected = selected.length === sorted.length && sorted.length > 0;

  const bulkDelete = () => {
    selected.forEach(id => onDelete(id));
    toast.success(`${selected.length} ${selected.length === 1 ? 'lead' : 'leads'} deleted`);
    setSelected([]);
  };

  const exportCSV = () => {
    const rows = [['Name', 'Email', 'Phone', 'Source', 'Stage', 'Value', 'Score', 'Last Contact']];
    sorted.forEach(l => rows.push([l.name, l.email, l.phone, l.source, l.stage, l.deal_value, l.lead_score, l.last_contact_date]));
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
    toast.success('Leads exported');
  };

  const SortHeader = ({ col, label, className }) => (
    <th
      onClick={() => handleSort(col)}
      className={cn('text-left text-[13px] font-medium text-muted-foreground py-3 px-3 cursor-pointer hover:text-foreground whitespace-nowrap select-none', className)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('w-3 h-3', sortKey === col ? 'opacity-80' : 'opacity-30')} />
      </span>
    </th>
  );

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border min-h-[56px]">
        {selected.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-foreground">{selected.length} selected</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportCSV}><Download /> Export</Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={bulkDelete}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{sorted.length} {sorted.length === 1 ? 'lead' : 'leads'}{search ? ` matching "${search}"` : ''}</p>
            <Button size="sm" variant="outline" onClick={exportCSV}><Download /> Export CSV</Button>
          </>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No leads here" body={search ? 'Nothing matches that search. Try a name or email.' : 'Add a lead to start tracking your pipeline.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="pl-5 pr-2 py-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </th>
                <SortHeader col="name" label="Lead" />
                <SortHeader col="source" label="Source" className="hidden md:table-cell" />
                <th className="text-left text-[13px] font-medium text-muted-foreground py-3 px-3">Stage</th>
                <SortHeader col="lead_score" label="Score" className="hidden lg:table-cell" />
                <SortHeader col="deal_value" label="Value" className="text-right" />
                <SortHeader col="last_contact_date" label="Last contact" className="hidden lg:table-cell" />
                <SortHeader col="follow_up_date" label="Follow-up" className="hidden sm:table-cell" />
                <th className="text-left text-[13px] font-medium text-muted-foreground py-3 px-3 hidden xl:table-cell">In pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map(lead => {
                const followOverdue = isFollowUpOverdue(lead);
                const daysPipeline = lead.created_date ? differenceInDays(new Date(), new Date(lead.created_date)) : 0;
                const score = lead.lead_score || 50;
                const tone = scoreTone(score);
                const isSelected = selected.includes(lead.id);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onView(lead)}
                    className={cn('cursor-pointer transition-colors hover:bg-accent/60', isSelected && 'bg-accent/60')}
                  >
                    <td className="pl-5 pr-2 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(lead.id)} aria-label={`Select ${lead.name}`} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <Initials name={lead.name} size={36} tone={followOverdue ? 'alert' : 'default'} />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-foreground truncate">{lead.name}</p>
                          <p className="text-[13px] text-muted-foreground truncate">{lead.email || lastContactLabel(lead)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-foreground hidden md:table-cell whitespace-nowrap">{sourceLabel(lead.source) || '—'}</td>
                    <td className="px-3 py-3"><StageChip stage={lead.stage} /></td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className={cn('num text-base', tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-destructive')}>{score}</span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {lead.deal_value > 0
                        ? <span className="num text-base text-foreground">{money(lead.deal_value)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">{shortDate(lead.last_contact_date) || '—'}</td>
                    <td className="px-3 py-3 hidden sm:table-cell whitespace-nowrap">
                      <span className={cn(followOverdue ? 'text-destructive font-semibold' : 'text-foreground')}>
                        {followOverdue ? 'Overdue' : (shortDate(lead.follow_up_date) || '—')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground hidden xl:table-cell whitespace-nowrap">{daysPipeline} days</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
