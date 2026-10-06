import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Moon, Zap, Brain, Heart, Camera, BarChart2, Ruler } from 'lucide-react';
import AIProgressAnalyzer from '@/components/progress/AIProgressAnalyzer';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const METRICS = [
  { key: 'weight',        label: 'Scale weight',    unit: 'lbs',  color: 'var(--tc-primary)', icon: Scale },
  { key: 'body_fat_pct',  label: 'Body fat %',      unit: '%',    color: 'var(--tc-ai)', icon: BarChart2 },
  { key: 'sleep_hours',   label: 'Sleep',           unit: 'hrs',  color: 'var(--tc-primary)', icon: Moon },
  { key: 'energy_level',  label: 'Energy level',    unit: '/5',   color: 'var(--tc-warning)', icon: Zap },
  { key: 'stress_level',  label: 'Stress level',    unit: '/5',   color: 'var(--tc-destructive)', icon: Brain },
  { key: 'compliance_training',  label: 'Training compliance', unit: '%', color: 'var(--tc-primary)', icon: TrendingUp },
  { key: 'compliance_nutrition', label: 'Nutrition compliance', unit: '%', color: 'var(--tc-success)', icon: Heart },
];

const MEASUREMENT_KEYS = ['chest', 'waist', 'hips', 'arms', 'thighs'];

const MOOD_LABEL = { great: 'Great', good: 'Good', okay: 'Okay', tired: 'Tired', stressed: 'Stressed' };
const MOOD_COLOR = { great: 'var(--tc-success)', good: 'var(--tc-primary)', okay: 'var(--tc-warning)', tired: 'var(--tc-ai)', stressed: 'var(--tc-destructive)' };

function StatPill({ label, value, unit, delta, deltaInvert = false, icon: Icon, color }) {
  const isPositive = delta > 0;
  const isGood = deltaInvert ? !isPositive : isPositive;
  const deltaColor = delta === 0 ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive';
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-bold text-foreground tabular-nums">{value ?? '—'}{value != null && unit}</span>
      {delta !== null && delta !== undefined && (
        <span className={cn('text-xs font-semibold', deltaColor)}>
          {delta > 0 ? '+' : ''}{delta}{unit} change
        </span>
      )}
    </div>
  );
}

function MetricChart({ data, dataKey, label, unit, color, domain }) {
  if (!data || data.length < 2) return null;
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-[18px] text-foreground mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} domain={domain || ['auto', 'auto']} />
          <Tooltip
            contentStyle={{ border: '1px solid var(--tc-border)', borderRadius: 12, fontSize: 12 }}
            formatter={(v) => [`${v}${unit}`, label]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ProfileProgressTab({ client, checkIns, initialSection = 'ai' }) {
  const [activeSection, setActiveSection] = useState(initialSection);

  const sorted = [...checkIns].filter(ci => ci.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Build chart datasets
  const makeDataset = (key) =>
    sorted.filter(ci => ci[key] != null).map(ci => ({
      date: format(new Date(ci.date), 'MMM d'),
      [key]: ci[key],
    }));

  const makeMeasurementDataset = (key) =>
    sorted.filter(ci => ci.measurements?.[key] != null).map(ci => ({
      date: format(new Date(ci.date), 'MMM d'),
      [key]: ci.measurements[key],
    }));

  const weightData = makeDataset('weight');
  const bodyFatData = makeDataset('body_fat_pct');
  const sleepData = makeDataset('sleep_hours');
  const energyData = makeDataset('energy_level');
  const stressData = makeDataset('stress_level');
  const trainingData = makeDataset('compliance_training');
  const nutritionData = makeDataset('compliance_nutrition');

  const measurementData = {};
  MEASUREMENT_KEYS.forEach(k => { measurementData[k] = makeMeasurementDataset(k); });

  // Mood bar data
  const moodData = sorted.filter(ci => ci.mood).map(ci => ({
    date: format(new Date(ci.date), 'MMM d'),
    mood: ci.mood,
    moodScore: { great: 5, good: 4, okay: 3, tired: 2, stressed: 1 }[ci.mood] || 0,
  }));

  // Stats
  const delta = (arr, key) => arr.length >= 2 ? +(arr[arr.length - 1][key] - arr[0][key]).toFixed(1) : null;
  const latest = (arr, key) => arr.length ? arr[arr.length - 1][key] : null;
  const first = (arr, key) => arr.length ? arr[0][key] : null;

  const avgSleep = sleepData.length ? +(sleepData.reduce((s, d) => s + d.sleep_hours, 0) / sleepData.length).toFixed(1) : null;
  const avgEnergy = energyData.length ? +(energyData.reduce((s, d) => s + d.energy_level, 0) / energyData.length).toFixed(1) : null;
  const avgStress = stressData.length ? +(stressData.reduce((s, d) => s + d.stress_level, 0) / stressData.length).toFixed(1) : null;
  const avgTraining = trainingData.length ? Math.round(trainingData.reduce((s, d) => s + d.compliance_training, 0) / trainingData.length) : null;
  const avgNutrition = nutritionData.length ? Math.round(nutritionData.reduce((s, d) => s + d.compliance_nutrition, 0) / nutritionData.length) : null;

  const SECTIONS = [
    { key: 'ai',          label: 'AI read' },
    { key: 'body',        label: 'Body' },
    { key: 'wellness',    label: 'Wellness' },
    { key: 'compliance',  label: 'Compliance' },
    { key: 'measurements', label: 'Measurements' },
    { key: 'photos',      label: 'Photos' },
  ];

  const [aiSection] = useState('ai');

  if (checkIns.length === 0) return (
    <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-14 text-center px-6">
      <p className="text-sm font-semibold text-foreground">No progress data yet</p>
      <p className="text-xs text-muted-foreground mt-1">Charts appear once check-in data is collected</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <div className="flex min-w-max px-2">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                'px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap border-b-2',
                activeSection === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI ANALYSIS ── */}
      {activeSection === 'ai' && (
        <AIProgressAnalyzer
          client={client}
          checkIns={checkIns}
          workoutSessions={[]}
          program={null}
          isClientFacing={false}
          compact={false}
        />
      )}

      {/* ── BODY ── */}
      {activeSection === 'body' && (
        <div className="space-y-4">
          {/* Summary pills */}
          <div className="grid grid-cols-2 gap-3">
            <StatPill label="Starting weight" value={first(weightData, 'weight')} unit=" lbs" icon={Scale} color="var(--tc-primary)" />
            <StatPill label="Current weight" value={latest(weightData, 'weight')} unit=" lbs" icon={Scale} color="var(--tc-primary)" />
            {delta(weightData, 'weight') !== null && (
              <StatPill
                label="Total change"
                value={delta(weightData, 'weight') > 0 ? `+${delta(weightData, 'weight')}` : delta(weightData, 'weight')}
                unit=" lbs"
                delta={null}
                icon={delta(weightData, 'weight') < 0 ? TrendingDown : TrendingUp}
                color={delta(weightData, 'weight') < 0 ? 'var(--tc-success)' : 'var(--tc-destructive)'}
              />
            )}
            <StatPill label="Body fat %" value={latest(bodyFatData, 'body_fat_pct')} unit="%" icon={BarChart2} color="var(--tc-ai)" />
          </div>

          {/* Weight trend */}
          <MetricChart data={weightData} dataKey="weight" label="Scale weight trend" unit=" lbs" color="var(--tc-primary)" />

          {/* Body fat trend */}
          <MetricChart data={bodyFatData} dataKey="body_fat_pct" label="Body fat % trend" unit="%" color="var(--tc-ai)" domain={[0, 50]} />

          {/* Mini goal bar if target weight set */}
          {client.current_weight && client.target_weight && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-[18px] text-foreground mb-3">Goal progress</h3>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Start: {client.current_weight} lbs</span>
                <span>Goal: {client.target_weight} lbs</span>
              </div>
              <div className="w-full bg-border rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      Math.abs((client.current_weight - (latest(weightData, 'weight') || client.current_weight)) /
                        (client.current_weight - client.target_weight)) * 100
                    ))}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {latest(weightData, 'weight') && client.target_weight
                  ? `${Math.abs(latest(weightData, 'weight') - client.target_weight).toFixed(1)} lbs to goal`
                  : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── WELLNESS ── */}
      {activeSection === 'wellness' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatPill label="Avg sleep" value={avgSleep} unit="h" icon={Moon} color="var(--tc-primary)" />
            <StatPill label="Avg energy" value={avgEnergy} unit="/5" icon={Zap} color="var(--tc-warning)" />
            <StatPill label="Avg stress" value={avgStress} unit="/5" icon={Brain} color="var(--tc-destructive)" />
          </div>

          <MetricChart data={sleepData} dataKey="sleep_hours" label="Sleep hours" unit="h" color="var(--tc-primary)" domain={[0, 12]} />
          <MetricChart data={energyData} dataKey="energy_level" label="Energy Level (1–5)" unit="/5" color="var(--tc-warning)" domain={[1, 5]} />
          <MetricChart data={stressData} dataKey="stress_level" label="Stress Level (1–5)" unit="/5" color="var(--tc-destructive)" domain={[1, 5]} />

          {/* Mood Timeline */}
          {moodData.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-[18px] text-foreground mb-3">Mood timeline</h3>
              <div className="flex flex-wrap gap-2">
                {moodData.slice(-20).map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-[13px] font-semibold text-foreground">{MOOD_LABEL[d.mood] || d.mood}</span>
                    <span className="text-[11px] text-muted-foreground">{d.date}</span>
                  </div>
                ))}
              </div>
              {/* Mood score bar chart */}
              {moodData.length >= 3 && (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={moodData.slice(-14)} margin={{ top: 0, right: 8, left: -28, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip contentStyle={{ border: '1px solid var(--tc-border)', borderRadius: 12, fontSize: 11 }} formatter={(v, n, p) => [MOOD_LABEL[p.payload.mood] || p.payload.mood, 'Mood']} />
                      <Bar dataKey="moodScore" radius={[4, 4, 0, 0]} fill="var(--tc-primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── COMPLIANCE ── */}
      {activeSection === 'compliance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatPill label="Avg training" value={avgTraining} unit="%" icon={TrendingUp} color="var(--tc-primary)" />
            <StatPill label="Avg nutrition" value={avgNutrition} unit="%" icon={Heart} color="var(--tc-success)" />
          </div>

          {/* Combined chart */}
          {(trainingData.length >= 2 || nutritionData.length >= 2) && (() => {
            const merged = {};
            trainingData.forEach(d => { merged[d.date] = { ...merged[d.date], date: d.date, training: d.compliance_training }; });
            nutritionData.forEach(d => { merged[d.date] = { ...merged[d.date], date: d.date, nutrition: d.compliance_nutrition }; });
            const combined = Object.values(merged).sort((a, b) => new Date(a.date) - new Date(b.date));
            return (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-[18px] text-foreground mb-4">Training & nutrition compliance</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={combined} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} />
                    <ReferenceLine y={80} stroke="var(--tc-success)" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Tooltip contentStyle={{ border: '1px solid var(--tc-border)', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}%`]} />
                    <Line type="monotone" dataKey="training" name="Training" stroke="var(--tc-primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--tc-primary)', strokeWidth: 0 }} connectNulls />
                    <Line type="monotone" dataKey="nutrition" name="Nutrition" stroke="var(--tc-success)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--tc-success)', strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-5 mt-2 justify-center">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-1 bg-primary rounded inline-block" />Training</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-1 bg-success rounded inline-block" />Nutrition</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 border-t border-dashed border-success inline-block" />80% target</span>
                </div>
              </div>
            );
          })()}

          {/* Compliance history table */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-[18px] text-foreground mb-3">Week-by-Week Breakdown</h3>
            <div className="space-y-2">
              {sorted.filter(ci => ci.compliance_training != null || ci.compliance_nutrition != null).slice(-10).reverse().map(ci => (
                <div key={ci.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs font-medium text-foreground">{format(new Date(ci.date), 'MMM d, yyyy')}</span>
                  <div className="flex gap-3">
                    {ci.compliance_training != null && (
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-border rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${ci.compliance_training}%` }} />
                        </div>
                        <span className="text-xs text-primary font-bold w-8 text-right">{ci.compliance_training}%</span>
                      </div>
                    )}
                    {ci.compliance_nutrition != null && (
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-border rounded-full h-1.5">
                          <div className="bg-success h-1.5 rounded-full" style={{ width: `${ci.compliance_nutrition}%` }} />
                        </div>
                        <span className="text-xs text-success font-bold w-8 text-right">{ci.compliance_nutrition}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MEASUREMENTS ── */}
      {activeSection === 'measurements' && (
        <div className="space-y-4">
          {/* Latest measurement snapshot */}
          {sorted.filter(ci => ci.measurements && Object.keys(ci.measurements).length > 0).length > 0 && (() => {
            const latest = [...sorted].reverse().find(ci => ci.measurements && Object.values(ci.measurements).some(v => v != null));
            const first = sorted.find(ci => ci.measurements && Object.values(ci.measurements).some(v => v != null));
            if (!latest) return null;
            return (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-[18px] text-foreground mb-3">Latest vs starting (inches)</h3>
                {MEASUREMENT_KEYS.map(k => {
                  const latestVal = latest.measurements?.[k];
                  const firstVal = first?.measurements?.[k];
                  const diff = latestVal && firstVal ? +(latestVal - firstVal).toFixed(1) : null;
                  if (latestVal == null) return null;
                  return (
                    <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs font-semibold text-foreground capitalize">{k}</span>
                      <div className="flex items-center gap-3">
                        {firstVal && <span className="text-xs text-muted-foreground">{firstVal}"</span>}
                        <span className="text-xs font-bold text-foreground">{latestVal}"</span>
                        {diff !== null && (
                          <span className={cn('text-xs font-bold w-12 text-right', diff < 0 ? 'text-success' : diff > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                            {diff > 0 ? '+' : ''}{diff}"
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Individual measurement charts */}
          {MEASUREMENT_KEYS.map(k => (
            measurementData[k].length >= 2 ? (
              <div key={k} className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-[18px] text-foreground mb-4 capitalize">{k} (inches)</h3>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={measurementData[k]} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ border: '1px solid var(--tc-border)', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}"`, k]} />
                    <Line type="monotone" dataKey={k} stroke="var(--tc-ai)" strokeWidth={2} dot={{ r: 3, fill: 'var(--tc-ai)', strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null
          ))}

          {MEASUREMENT_KEYS.every(k => measurementData[k].length < 2) && (
            <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-10 text-center">
              <Ruler className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No measurement data yet</p>
              <p className="text-xs text-[var(--tc-muted-foreground)] mt-0.5">Add measurements in check-ins to see trends</p>
            </div>
          )}
        </div>
      )}

      {/* ── PHOTOS ── */}
      {activeSection === 'photos' && (
        <div className="space-y-4">
          {checkIns.filter(ci => ci.photo_urls?.length).length === 0 ? (
            <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-14 text-center">
              <Camera className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No progress photos yet</p>
              <p className="text-xs text-[var(--tc-muted-foreground)] mt-0.5">Photos submitted with check-ins will appear here</p>
            </div>
          ) : (
            checkIns.filter(ci => ci.photo_urls?.length).map(ci => (
              <div key={ci.id} className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">{format(new Date(ci.date), 'MMMM d, yyyy')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ci.photo_urls.map((url, i) => (
                    <SignedLink key={i} href={url} target="_blank" rel="noreferrer">
                      <SignedImg src={url} alt="progress" className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity" />
                    </SignedLink>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}