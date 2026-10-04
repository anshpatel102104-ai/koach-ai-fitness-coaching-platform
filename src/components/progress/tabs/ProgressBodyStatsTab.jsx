import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import LogWeightModal from '../LogWeightModal';

function parseHeight(h) {
  if (!h) return null;
  const ft = h.match(/(\d+)'(\d+)/);
  if (ft) return parseInt(ft[1]) * 12 + parseInt(ft[2]);
  return parseFloat(h) || null;
}

export default function ProgressBodyStatsTab({ client, checkIns }) {
  const [showLog, setShowLog] = useState(false);
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checkins'] }); setShowLog(false); toast.success('Entry logged!'); },
  });

  const sorted = useMemo(() =>
    [...checkIns].filter(ci => ci.weight || ci.body_fat_pct)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [checkIns]
  );

  const weightData = sorted.filter(ci => ci.weight).map(ci => ({
    date: format(parseISO(ci.date), 'MMM d'),
    value: ci.weight,
  }));

  const bfData = sorted.filter(ci => ci.body_fat_pct).map(ci => ({
    date: format(parseISO(ci.date), 'MMM d'),
    value: ci.body_fat_pct,
  }));

  const heightInches = parseHeight(client.height);

  const tableRows = useMemo(() => {
    const rows = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const ci = sorted[i];
      const prev = sorted[i - 1];
      const weightChange = ci.weight && prev?.weight ? Math.round((ci.weight - prev.weight) * 10) / 10 : null;
      const bmi = ci.weight && heightInches ? Math.round((ci.weight / (heightInches * heightInches)) * 703 * 10) / 10 : null;
      rows.push({ ci, weightChange, bmi });
    }
    return rows;
  }, [sorted, heightInches]);

  const TOOLTIP = {
    contentStyle: { background: 'var(--tc-card)', border: '1px solid var(--tc-border)', borderRadius: '8px', fontSize: 12 },
    labelStyle: { color: 'var(--tc-foreground)', fontWeight: 600 },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Weight Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Weight History</h3>
          <button onClick={() => setShowLog(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-3 h-3" /> Log Weight
          </button>
        </div>
        {weightData.length >= 2 && (
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weightData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--tc-primary)" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="var(--tc-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-muted)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip {...TOOLTIP} formatter={v => [`${v} lbs`, 'Weight']} />
                <Area type="monotone" dataKey="value" stroke="var(--tc-primary)" strokeWidth={2} fill="url(#wGrad2)"
                  dot={{ r: 3, fill: 'var(--tc-primary)', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background">
              <tr>
                {['Date', 'Weight (lbs)', 'Change', 'BMI', 'Body Fat %', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">No entries logged yet</td></tr>
              ) : tableRows.map(({ ci, weightChange, bmi }, i) => (
                <tr key={i} className="border-t border-muted hover:bg-background transition-colors">
                  <td className="px-4 py-2 text-xs text-foreground">{format(parseISO(ci.date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-foreground">{ci.weight ?? '—'}</td>
                  <td className="px-4 py-2 text-xs font-semibold">
                    {weightChange !== null ? (
                      <span className={weightChange < 0 ? 'text-success' : weightChange > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                        {weightChange > 0 ? '+' : ''}{weightChange}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">{bmi ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-foreground">{ci.body_fat_pct ? `${ci.body_fat_pct}%` : '—'}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-[180px] truncate">{ci.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Body Fat Section */}
      {bfData.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Body Fat % Trend</h3>
          </div>
          {bfData.length >= 2 && (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={bfData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tc-warning)" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="var(--tc-warning)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-muted)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip {...TOOLTIP} formatter={v => [`${v}%`, 'Body Fat']} />
                  <Area type="monotone" dataKey="value" stroke="var(--tc-warning)" strokeWidth={2} fill="url(#bfGrad)"
                    dot={{ r: 3, fill: 'var(--tc-warning)', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {showLog && (
        <LogWeightModal
          client={client}
          onSave={(w, d, n) => logMutation.mutate({ client_id: client.id, client_name: client.name, date: d, weight: w, notes: n })}
          onClose={() => setShowLog(false)}
          loading={logMutation.isPending}
        />
      )}
    </div>
  );
}