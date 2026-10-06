import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const MEASUREMENTS = [
  { key: 'waist', label: 'Waist', lowerIsBetter: true },
  { key: 'hips', label: 'Hips', lowerIsBetter: true },
  { key: 'chest', label: 'Chest', lowerIsBetter: false },
  { key: 'arms', label: 'Arms', lowerIsBetter: false },
  { key: 'thighs', label: 'Thighs', lowerIsBetter: true },
];

function Sparkline({ data, lowerIsBetter }) {
  if (data.length < 2) return <div className="h-8 text-[11px] text-muted-foreground flex items-center">—</div>;
  const trend = data[data.length - 1].v - data[0].v;
  const improving = lowerIsBetter ? trend < 0 : trend > 0;
  const color = improving ? 'var(--tc-success)' : trend === 0 ? 'var(--tc-muted-foreground)' : 'var(--tc-destructive)';
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProgressMeasurementsTab({ client, checkIns }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), waist: '', hips: '', chest: '', arms: '', thighs: '' });
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checkins'] }); setShowModal(false); toast.success('Measurements saved'); },
  });

  const sorted = useMemo(() =>
    [...checkIns].filter(ci => ci.measurements && Object.keys(ci.measurements).length > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [checkIns]
  );

  const getStats = (key) => {
    const vals = sorted.filter(ci => ci.measurements?.[key] != null).map(ci => ({ date: ci.date, v: ci.measurements[key] }));
    if (!vals.length) return { start: null, current: null, change: null, data: [] };
    const start = vals[0].v;
    const current = vals[vals.length - 1].v;
    return { start, current, change: Math.round((current - start) * 10) / 10, data: vals };
  };

  const handleSave = () => {
    const measurements = {};
    MEASUREMENTS.forEach(m => { if (form[m.key]) measurements[m.key] = parseFloat(form[m.key]); });
    if (!Object.keys(measurements).length) { toast.error('Enter at least one measurement'); return; }
    logMutation.mutate({ client_id: client.id, client_name: client.name, date: form.date, measurements });
  };

  const historyRows = useMemo(() =>
    [...sorted].reverse().map(ci => ({ ci, measurements: ci.measurements })),
    [sorted]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Measurements Grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[18px] text-foreground">Body measurements</h3>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-3 h-3" /> Log measurements
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {MEASUREMENTS.map((m) => {
            const { start, current, change, data } = getStats(m.key);
            const improving = m.lowerIsBetter ? change < 0 : change > 0;
            const changeColor = change === null ? 'var(--tc-muted-foreground)' : change === 0 ? 'var(--tc-muted-foreground)' : improving ? 'var(--tc-success)' : 'var(--tc-destructive)';
            return (
              <div key={m.key} className="px-5 py-4 border-b border-r border-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{current ? `${current}"` : '—'}</p>
                  </div>
                  <Sparkline data={data} lowerIsBetter={m.lowerIsBetter} />
                </div>
                <div className="flex gap-3 mt-2 text-[11px]">
                  <span className="text-muted-foreground">Start: <span className="font-medium text-foreground">{start ? `${start}"` : '—'}</span></span>
                  {change !== null && (
                    <span style={{ color: changeColor }} className="font-semibold">
                      {change > 0 ? '+' : ''}{change}"
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Table */}
      {historyRows.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-[18px] text-foreground">Measurement history</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Date</th>
                  {MEASUREMENTS.map(m => (
                    <th key={m.key} className="px-4 py-2 text-left font-semibold text-muted-foreground">{m.label} (in)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map(({ ci, measurements }, i) => (
                  <tr key={i} className="border-t border-muted hover:bg-background">
                    <td className="px-4 py-2 text-foreground">{format(parseISO(ci.date), 'MMM d, yyyy')}</td>
                    {MEASUREMENTS.map(m => (
                      <td key={m.key} className="px-4 py-2 text-foreground">{measurements?.[m.key] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Measurements Modal */}
      {showModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Log measurements</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MEASUREMENTS.map(m => (
                <div key={m.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{m.label} (inches)</label>
                  <input type="number" step="0.1" placeholder="—" value={form[m.key]}
                    onChange={e => setForm(p => ({ ...p, [m.key]: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs rounded-lg border border-border text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={logMutation.isPending}
                className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {logMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}