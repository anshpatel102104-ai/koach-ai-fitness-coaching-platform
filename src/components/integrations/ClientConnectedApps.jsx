import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Smartphone, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CLIENT_APPS = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    subtitle: 'iPhone · Apple Watch',
    description: 'Steps, sleep, heart rate, and workout data synced from your device.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-ff3b30)">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    data: { steps: 7842, sleep: 6.8, calories: 1820, heartRate: 68 },
    insights: [
      { type: 'warning', text: 'Steps below 5,000 for the last 3 days — activity is down.' },
      { type: 'warning', text: 'Sleep averaging 6.8 hrs — below the recommended 7–8 hrs.' },
    ],
    trend: { steps: -12, sleep: -0.4 },
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    subtitle: 'GPS Watch · Fitness Tracker',
    description: 'Training load, heart rate zones, recovery scores, and GPS sessions.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-007dc5)">
        <circle cx="12" cy="12" r="10"/>
        <path fill="white" d="M12 6a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/>
        <circle fill="white" cx="12" cy="12" r="2"/>
      </svg>
    ),
    data: { steps: 9210, sleep: 7.2, heartRate: 62, recovery: 72 },
    insights: [
      { type: 'success', text: 'Recovery score trending upward — body is adapting well.' },
      { type: 'info', text: 'Training load is in the optimal zone for this week.' },
    ],
    trend: { steps: +8, sleep: +0.3 },
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    subtitle: 'Nutrition Tracker',
    description: 'Daily calorie intake, macros, and meal logging data.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-0093d0)">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
    data: { calories: 2140, protein: 142, carbs: 218, fat: 67 },
    insights: [
      { type: 'warning', text: 'Nutrition not logged for 2 days — tracking streak broken.' },
      { type: 'info', text: 'Protein averaging 20g below weekly target.' },
    ],
    trend: { calories: +3 },
  },
];

/* ── Live data tile: label over a number, no icon tiles ── */
function DataTile({ label, value, unit, trend }) {
  const isUp = trend > 0;
  const isDown = trend < 0;
  return (
    <div className="rounded-lg bg-secondary px-3 py-2.5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className="num text-xl leading-none text-foreground">
          {value != null ? <>{value}<span className="ml-1 text-[13px] font-normal text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>{unit}</span></> : <span className="text-sm font-normal text-muted-foreground">No data</span>}
        </p>
        {trend != null && (
          <span className={cn('inline-flex items-center gap-0.5 text-[13px] font-semibold tabular-nums',
            isDown ? 'text-destructive' : isUp ? 'text-success' : 'text-muted-foreground')}>
            {isDown ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {isUp ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Insight row ── */
function InsightRow({ insight }) {
  const icons = {
    warning: <AlertCircle className="h-4 w-4 flex-shrink-0 text-warning mt-0.5" />,
    info: <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />,
    success: <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success mt-0.5" />,
  };
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm leading-snug text-foreground">
      {icons[insight.type] || icons.info}
      {insight.text}
    </div>
  );
}

/* ── Per-app data view ── */
function AppDataView({ app }) {
  const d = app.data || {};
  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div className="grid grid-cols-2 gap-2">
        {d.steps != null && <DataTile label="Steps" value={d.steps.toLocaleString()} unit="steps" trend={app.trend?.steps} />}
        {d.sleep != null && <DataTile label="Sleep" value={d.sleep} unit="hrs" trend={app.trend?.sleep} />}
        {d.calories != null && <DataTile label="Calories" value={d.calories.toLocaleString()} unit="kcal" trend={app.trend?.calories} />}
        {d.heartRate != null && <DataTile label="Resting heart rate" value={d.heartRate} unit="bpm" />}
        {d.recovery != null && <DataTile label="Recovery" value={d.recovery} unit="/100" />}
        {d.protein != null && <DataTile label="Protein" value={d.protein} unit="g" />}
        {d.carbs != null && <DataTile label="Carbs" value={d.carbs} unit="g" />}
      </div>

      {app.insights?.length > 0 && (
        <div>
          <p className="mb-1 text-[13px] font-semibold text-muted-foreground">What stands out</p>
          {app.insights.map((ins, i) => <InsightRow key={i} insight={ins} />)}
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */
export default function ClientConnectedApps({ clientId }) {
  const [connected, setConnected] = useState({});

  const toggle = (id) => {
    const name = CLIENT_APPS.find(a => a.id === id)?.name;
    if (connected[id]) {
      setConnected(c => ({ ...c, [id]: false }));
      toast.success(`${name} disconnected`);
    } else {
      setConnected(c => ({ ...c, [id]: true }));
      toast.success(`${name} connected. Data will sync shortly.`);
    }
  };

  const anyConnected = Object.values(connected).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Summary strip if any connected */}
      {anyConnected && (() => {
        const connectedApps = CLIENT_APPS.filter(a => connected[a.id]);
        const merged = connectedApps.reduce((acc, a) => {
          Object.entries(a.data || {}).forEach(([k, v]) => { if (v != null && acc[k] == null) acc[k] = v; });
          return acc;
        }, {});
        const stats = [
          merged.steps != null && { label: 'Steps', value: merged.steps.toLocaleString() },
          merged.sleep != null && { label: 'Sleep', value: merged.sleep, unit: 'hrs' },
          merged.calories != null && { label: 'Calories', value: merged.calories.toLocaleString(), unit: 'kcal' },
          merged.heartRate != null && { label: 'Heart rate', value: merged.heartRate, unit: 'bpm' },
        ].filter(Boolean);
        return (
          <div className="panel p-5">
            <p className="text-[13px] text-muted-foreground">Today from connected apps</p>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map(st => (
                <div key={st.label}>
                  <p className="num text-[26px] leading-none text-foreground">{st.value}{st.unit && <span className="ml-1 text-[0.55em]">{st.unit}</span>}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{st.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* App rows */}
      <div className="panel divide-y divide-border px-5">
        {CLIENT_APPS.map((app) => {
          const isConnected = !!connected[app.id];
          return (
            <div key={app.id} className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                  {app.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[15px] font-semibold text-foreground">{app.name}</p>
                    {isConnected && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />}
                  </div>
                  <p className="text-[13px] text-muted-foreground">{isConnected ? app.subtitle : app.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={isConnected ? 'outline' : 'default'}
                  onClick={() => toggle(app.id)}
                  className="flex-shrink-0"
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>

              {isConnected && <AppDataView app={app} />}
            </div>
          );
        })}
      </div>

      {!anyConnected && (
        <p className="px-1 text-sm text-muted-foreground">
          <Smartphone className="mr-1.5 inline h-4 w-4 align-[-3px]" />
          Nothing connected yet. Connect an app to see steps, sleep and food logs here.
        </p>
      )}
    </div>
  );
}
