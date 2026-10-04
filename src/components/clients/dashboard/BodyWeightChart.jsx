import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { format, parseISO, subWeeks, subMonths, subYears } from 'date-fns';
import { Plus, Scale, Trash2 } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

const BLUE = 'var(--tc-primary)';

const RANGES = [
  { key: '1W',  label: '1W',  getCutoff: () => subWeeks(new Date(), 1) },
  { key: '1M',  label: '1M',  getCutoff: () => subMonths(new Date(), 1) },
  { key: '3M',  label: '3M',  getCutoff: () => subMonths(new Date(), 3) },
  { key: '6M',  label: '6M',  getCutoff: () => subMonths(new Date(), 6) },
  { key: '1Y',  label: '1Y',  getCutoff: () => subYears(new Date(), 1) },
  { key: 'ALL', label: 'All', getCutoff: () => null },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-3 py-2">
      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: BLUE }}>{payload[0].value} lbs</p>
    </div>
  );
}

export default function BodyWeightChart({ client, onCurrentWeightUpdated }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ weight: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [range, setRange] = useState('3M');

  const { data: entries = [] } = useQuery({
    queryKey: ['weigh-ins', client?.id],
    queryFn: () => db.entities.WeighIn.filter({ client_id: client.id }, 'date', 200),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => new Date(a.date) - new Date(b.date)),
  });

  // Filter entries by selected range
  const activeCutoff = RANGES.find(r => r.key === range)?.getCutoff() ?? null;
  const filteredEntries = activeCutoff
    ? entries.filter(e => new Date(e.date) >= activeCutoff)
    : entries;

  const chartData = filteredEntries.map(e => ({
    date: format(parseISO(e.date), 'MMM d'),
    weight: e.weight,
    id: e.id,
  }));

  // Stats always from ALL entries so latest weight is always accurate
  const latestEntry = entries[entries.length - 1];
  const firstEntry = entries[0];
  const delta = latestEntry && firstEntry && entries.length > 1
    ? (latestEntry.weight - firstEntry.weight).toFixed(1)
    : null;

  const handleAdd = async () => {
    if (!draft.weight || !draft.date) return;
    const w = parseFloat(draft.weight);
    if (isNaN(w) || w <= 0) { toast.error('Enter a valid weight'); return; }
    setSaving(true);
    try {
      await db.entities.WeighIn.create({
        client_id: client.id,
        weight: w,
        date: draft.date,
        note: draft.note || null,
      });
      // Update client's current_weight to this entry if it's the most recent
      const shouldUpdate = !latestEntry || new Date(draft.date) >= new Date(latestEntry.date);
      if (shouldUpdate) {
        await db.entities.Client.update(client.id, { current_weight: w });
        onCurrentWeightUpdated?.();
      }
      qc.invalidateQueries({ queryKey: ['weigh-ins', client.id] });
      setDraft({ weight: '', date: new Date().toISOString().split('T')[0], note: '' });
      setAdding(false);
      toast.success('Weigh-in logged');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (entry) => {
    setDeletingId(entry.id);
    try {
      await db.entities.WeighIn.delete(entry.id);
      // If we deleted the latest, recalculate current_weight from remaining entries
      if (latestEntry?.id === entry.id) {
        const remaining = entries.filter(e => e.id !== entry.id);
        const newLatest = remaining[remaining.length - 1];
        await db.entities.Client.update(client.id, {
          current_weight: newLatest?.weight ?? null,
        });
        onCurrentWeightUpdated?.();
      }
      qc.invalidateQueries({ queryKey: ['weigh-ins', client.id] });
      toast.success('Entry removed');
    } catch (e) {
      toast.error('Failed to delete');
    }
    setDeletingId(null);
  };

  const yDomain = filteredEntries.length >= 2
    ? [Math.floor(Math.min(...filteredEntries.map(e => e.weight)) - 3), Math.ceil(Math.max(...filteredEntries.map(e => e.weight)) + 3)]
    : ['auto', 'auto'];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Body Weight</p>
        </div>
        <div className="flex items-center gap-3">
          {latestEntry && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-foreground">{latestEntry.weight}</span>
              <span className="text-[10px] text-muted-foreground font-medium">lbs</span>
              {delta !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  parseFloat(delta) < 0
                    ? 'bg-success/10 text-success'
                    : parseFloat(delta) > 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {parseFloat(delta) > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setAdding(a => !a)}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ background: adding ? 'var(--tc-accent)' : 'var(--tc-muted)', color: adding ? BLUE : 'var(--tc-muted-foreground)' }}
          >
            <Plus className="w-3 h-3" /> Log
          </button>
        </div>
      </div>

      {/* Range toggle */}
      <div className="flex items-center gap-1 px-4 pb-2">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors"
            style={{
              background: range === r.key ? BLUE : 'var(--tc-muted)',
              color: range === r.key ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Add entry form */}
      {adding && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-accent border border-accent flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Weight (lbs)</label>
              <input
                type="number"
                min="50" max="700" step="0.1"
                placeholder="e.g. 185"
                value={draft.weight}
                onChange={e => setDraft(d => ({ ...d, weight: e.target.value }))}
                className="w-full text-xs border border-primary rounded-lg px-2 py-1.5 bg-card outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Date</label>
              <input
                type="date"
                value={draft.date}
                onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                className="w-full text-xs border border-primary rounded-lg px-2 py-1.5 bg-card outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Note (optional)"
            value={draft.note}
            onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
            className="w-full text-xs border border-primary rounded-lg px-2 py-1.5 bg-card outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !draft.weight}
              className="flex-1 text-xs font-semibold text-white py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: BLUE }}
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border bg-card"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      {filteredEntries.length === 0 && entries.length > 0 ? (
        <div className="flex flex-col items-center justify-center h-28 gap-2 pb-4">
          <Scale className="w-6 h-6 text-border" />
          <p className="text-xs text-muted-foreground">No weigh-ins in this range</p>
          <button onClick={() => setRange('ALL')} className="text-[10px] font-semibold underline underline-offset-2" style={{ color: BLUE }}>
            Show all
          </button>
        </div>
      ) : chartData.length >= 2 ? (
        <div className="px-1 pb-4">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-muted)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'var(--tc-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--tc-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                domain={yDomain}
                tickCount={4}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--tc-border)', strokeWidth: 1, strokeDasharray: '4 2' }} />
              {client.target_weight && (
                <ReferenceLine
                  y={client.target_weight}
                  stroke="var(--tc-success)"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: `Goal ${client.target_weight}`, position: 'insideTopRight', fontSize: 9, fill: 'var(--tc-success)' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: BLUE, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: BLUE, strokeWidth: 2, stroke: 'var(--tc-card)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-28 gap-2 pb-4">
          <Scale className="w-6 h-6 text-border" />
          <p className="text-xs text-muted-foreground">
            {chartData.length === 1 ? 'Log 1 more entry to show the trend' : 'No weigh-ins yet — log the first one'}
          </p>
        </div>
      )}

      {/* Recent entries list (last 5 within range) */}
      {filteredEntries.length > 0 && (
        <div className="border-t border-border px-4 py-2 space-y-1">
          {[...filteredEntries].reverse().slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-center justify-between py-0.5 group">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                <span className="text-xs font-bold text-foreground">{entry.weight} lbs</span>
                {entry.note && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{entry.note}</span>}
              </div>
              <button
                onClick={() => handleDelete(entry)}
                disabled={deletingId === entry.id}
                className="opacity-0 group-hover:opacity-100 text-border hover:text-destructive transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}