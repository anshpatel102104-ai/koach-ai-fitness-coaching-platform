import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format, subWeeks, parseISO } from 'date-fns';
import { Plus, ChevronDown } from 'lucide-react';

const RANGES = [
  { label: '4W', weeks: 4 },
  { label: '8W', weeks: 8 },
  { label: '3M', weeks: 13 },
  { label: '6M', weeks: 26 },
  { label: 'All', weeks: null },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(13,17,28,0.95)', border: '1px solid rgb(var(--border))' }}>
      <p className="text-foreground font-bold">{payload[0].value} lbs</p>
      <p className="text-muted-foreground">{payload[0].payload.label}</p>
    </div>
  );
}

export default function WeightJourneyCard({ checkIns, client, onLogWeight }) {
  const [range, setRange] = useState('All');
  const [showHistory, setShowHistory] = useState(false);

  const goalWeight = client?.target_weight;
  const weeks = RANGES.find(r => r.label === range)?.weeks;

  const weightData = useMemo(() => {
    const withWeight = checkIns.filter(ci => ci.weight);
    const filtered = weeks
      ? withWeight.filter(ci => new Date(ci.date) >= subWeeks(new Date(), weeks))
      : withWeight;
    return filtered.map(ci => ({
      label: format(parseISO(ci.date), 'MMM d'),
      weight: ci.weight,
    }));
  }, [checkIns, weeks]);

  const firstWeight = weightData[0]?.weight;
  const lastWeight = weightData[weightData.length - 1]?.weight;
  const change = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null;
  const remaining = goalWeight && lastWeight ? Math.abs(lastWeight - goalWeight).toFixed(1) : null;

  const allWithWeight = checkIns.filter(ci => ci.weight);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-foreground font-bold text-sm">Weight Journey</p>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setRange(r.label)}
              className="px-2 py-0.5 rounded-lg text-[12px] font-bold transition-all"
              style={{
                background: range === r.label ? 'rgb(var(--primary))' : 'transparent',
                color: range === r.label ? 'rgb(var(--primary-foreground))' : 'rgb(var(--muted-foreground))',
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {weightData.length < 2 ? (
        <div className="py-10 text-center">
          <p className="text-muted-foreground text-xs">Log your starting weight to start the line.</p>
          <button onClick={onLogWeight} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground"
            style={{ background: 'rgb(var(--primary))', border: '1px solid rgb(var(--primary) / 0.3)' }}>
            + Log Weight
          </button>
        </div>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false}
                  domain={[d => Math.floor(d - 3), d => Math.ceil(d + 3)]} />
                <Tooltip content={<CustomTooltip />} />
                {goalWeight && (
                  <ReferenceLine y={goalWeight} stroke="rgb(var(--success) / 0.4)" strokeDasharray="4 4" label={{ value: 'Goal', fill: 'rgb(var(--success))', fontSize: 9 }} />
                )}
                <Line type="monotone" dataKey="weight" stroke="rgb(var(--primary))" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: 'rgb(var(--primary))', stroke: 'rgb(var(--card))', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="text-center">
              <p className="text-muted-foreground text-[12px]">Start</p>
              <p className="text-foreground text-xs font-bold">{firstWeight} lbs</p>
            </div>
            <div className="flex-1 relative">
              <div className="h-1 rounded-full" style={{ background: 'rgb(var(--secondary))' }}>
                {goalWeight && firstWeight && (
                  <div className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, Math.abs((lastWeight - firstWeight) / (goalWeight - firstWeight)) * 100))}%` }} />
                )}
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 flex justify-center" style={{ left: '50%' }}>
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-[12px]">Goal</p>
              <p className="text-success text-xs font-bold">{goalWeight ? `${goalWeight} lbs` : '—'}</p>
            </div>
          </div>

          {remaining && (
            <p className="text-center text-muted-foreground text-[12px] mt-2">
              {remaining} lbs to go · {change > 0 ? '+' : ''}{change} lbs total {change < 0 ? 'lost' : 'gained'}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={onLogWeight}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-primary-foreground"
              style={{ background: 'rgb(var(--primary))', border: '1px solid rgb(var(--primary) / 0.3)' }}>
              <Plus className="w-3 h-3" /> Log Weight
            </button>
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgb(var(--secondary))', color: 'rgb(var(--muted-foreground))' }}>
              History <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showHistory && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
              {[...allWithWeight].reverse().map((ci, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: 'rgb(var(--secondary))' }}>
                  <span className="text-muted-foreground text-xs">{format(parseISO(ci.date), 'MMM d, yyyy')}</span>
                  <span className="text-foreground font-bold text-sm">{ci.weight} lbs</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}