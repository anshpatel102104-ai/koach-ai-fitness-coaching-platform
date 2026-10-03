import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { Sparkles, Loader2, RefreshCw, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/api/supabaseClient';
import { SignedImg } from '@/components/shared/SignedImage';

const TOOLTIP_STYLE = {
  contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 },
  labelStyle: { color: 'hsl(var(--foreground))' },
};

const VIEWS = ['4W', '8W', 'All'];

function filterByView(checkIns, view) {
  if (view === 'All') return checkIns;
  const days = view === '4W' ? 28 : 56;
  const cutoff = subDays(new Date(), days);
  return checkIns.filter(ci => isAfter(new Date(ci.date), cutoff));
}

export default function ClientAnalyticsView({ client, checkIns }) {
  const [view, setView] = useState('8W');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [activeChart, setActiveChart] = useState('weight');

  const filtered = [...filterByView(checkIns, view)].reverse();
  const chartData = filtered.map(ci => ({
    date: format(new Date(ci.date), 'MMM d'),
    weight: ci.weight,
    bodyFat: ci.body_fat_pct,
    sleep: ci.sleep_hours,
    training: ci.compliance_training,
    nutrition: ci.compliance_nutrition,
  }));

  // Week vs week comparison
  const last7 = checkIns.filter(ci => isAfter(new Date(ci.date), subDays(new Date(), 7)));
  const prev7 = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return isAfter(d, subDays(new Date(), 14)) && !isAfter(d, subDays(new Date(), 7));
  });
  const avgField = (arr, f) => arr.filter(ci => ci[f] != null).reduce((s, ci, _, a) => s + ci[f] / a.length, 0);

  const compData = [
    { label: 'Avg Weight', thisWeek: avgField(last7, 'weight').toFixed(1), lastWeek: avgField(prev7, 'weight').toFixed(1) },
    { label: 'Training %', thisWeek: avgField(last7, 'compliance_training').toFixed(0), lastWeek: avgField(prev7, 'compliance_training').toFixed(0) },
    { label: 'Sleep hrs', thisWeek: avgField(last7, 'sleep_hours').toFixed(1), lastWeek: avgField(prev7, 'sleep_hours').toFixed(1) },
  ].filter(d => d.thisWeek > 0);

  // Photos
  const allPhotos = checkIns.flatMap(ci =>
    (ci.photo_urls || []).map(url => ({ url, date: ci.date }))
  );

  const fetchAiSummary = async () => {
    setAiLoading(true);
    try {
      const recent = checkIns.slice(0, 6).map(ci => ({
        date: ci.date, weight: ci.weight, body_fat: ci.body_fat_pct,
        sleep: ci.sleep_hours, mood: ci.mood,
        training: ci.compliance_training, nutrition: ci.compliance_nutrition,
        notes: ci.notes,
      }));
      const res = await db.functions.invoke('aiProgressInsights', {
        action: 'clientSummary', client, recent,
      });
      setAiSummary(res.data?.text || '');
    } finally {
      setAiLoading(false);
    }
  };

  const CHARTS = [
    { key: 'weight', label: 'Weight', color: 'hsl(var(--primary))', dataKey: 'weight' },
    { key: 'bodyFat', label: 'Body Fat %', color: 'hsl(var(--accent))', dataKey: 'bodyFat' },
    { key: 'sleep', label: 'Sleep', color: 'hsl(var(--chart-3))', dataKey: 'sleep' },
    { key: 'compliance', label: 'Compliance', color: 'hsl(var(--chart-4))', dataKey: null },
  ];

  return (
    <div className="p-6 space-y-6 bg-secondary/10">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${view === v ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {CHARTS.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveChart(c.key)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${activeChart === c.key ? 'bg-sidebar text-white' : 'bg-card border border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      {chartData.length > 1 ? (
        <div className="bg-card rounded-xl border border-border p-4">
          <ResponsiveContainer width="100%" height={220}>
            {activeChart === 'compliance' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="training" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Training %" />
                <Bar dataKey="nutrition" fill="hsl(var(--accent))" radius={[4,4,0,0]} name="Nutrition %" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey={CHARTS.find(c => c.key === activeChart)?.dataKey}
                  stroke={CHARTS.find(c => c.key === activeChart)?.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: CHARTS.find(c => c.key === activeChart)?.color }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <BarChart2 className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Not enough data for this time range.</p>
        </div>
      )}

      {/* Week vs Week */}
      {compData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Week vs. Previous Week</p>
          <div className="grid grid-cols-3 gap-3">
            {compData.map(d => {
              const diff = (Number(d.thisWeek) - Number(d.lastWeek)).toFixed(1);
              const positive = Number(diff) > 0;
              return (
                <div key={d.label} className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="text-lg font-bold font-heading">{d.thisWeek || '–'}</p>
                  {d.lastWeek > 0 && (
                    <p className={`text-xs mt-0.5 ${positive ? 'text-success' : 'text-destructive'}`}>
                      {positive ? '+' : ''}{diff} vs last wk
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Timeline */}
      {allPhotos.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Progress Photos</p>
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
              disabled={photoIndex === 0}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 aspect-video bg-secondary rounded-lg overflow-hidden">
              <SignedImg src={allPhotos[photoIndex]?.url} alt="progress" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => setPhotoIndex(Math.min(allPhotos.length - 1, photoIndex + 1))}
              disabled={photoIndex === allPhotos.length - 1}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {format(new Date(allPhotos[photoIndex]?.date), 'MMMM d, yyyy')} · {photoIndex + 1} of {allPhotos.length}
          </p>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-muted border border-accent rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">AI Coach Summary</p>
          </div>
          <button onClick={fetchAiSummary} disabled={aiLoading} className="text-primary hover:text-primary disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {aiSummary ? (
          <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
        ) : aiLoading ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing {client.name}'s progress...</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Generate an AI-powered progress summary for this client.</p>
            <Button size="sm" onClick={fetchAiSummary} className="bg-primary text-primary-foreground hover:bg-primary ml-4 flex-shrink-0">
              Generate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}