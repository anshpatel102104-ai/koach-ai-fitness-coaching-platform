import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { compositeAdherenceScore } from '@/lib/adherence';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { cn } from '@/lib/utils';
import { Plus, Bell, Dumbbell, Salad, Sparkles, Lock } from 'lucide-react';
import GoalsSummarySection from './GoalsSummarySection';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { hasFeature } from '@/lib/subscription';
import AIOnboardingModal from '@/components/clients/ai-onboarding/AIOnboardingModal';

const goalLabels = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness'
};

// Ring — blue accent for active week, muted gray for others
function Ring({ pct = 0, label, sublabel, size = 72, active = false }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(pct / 100, 1)) * circ;
  const activeColor = 'var(--tc-primary)';
  const inactiveColor = 'var(--tc-muted-foreground)';

  return (
    <div className={cn('flex flex-col items-center gap-1.5', active && 'scale-105')}>
      <div className="relative rounded-full">
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tc-border)" strokeWidth={active ? 7 : 5} />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={pct > 0 ? (active ? activeColor : inactiveColor) : 'var(--tc-border)'}
            strokeWidth={active ? 7 : 5}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold tabular-nums leading-none', active ? 'text-sm' : 'text-xs')}
            style={{ color: active ? activeColor : 'var(--tc-muted-foreground)' }}>
            {pct}%
          </span>
          {sublabel && (
            <span className="text-[8px] leading-none mt-0.5" style={{ color: 'var(--tc-muted-foreground)' }}>{sublabel}</span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold leading-tight"
          style={{ color: active ? 'var(--tc-foreground)' : 'var(--tc-muted-foreground)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// Week compliance helpers
function weekCompliance(checkIns, weekStart, weekEnd) {
  const inRange = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return d >= weekStart && d <= weekEnd;
  });
  if (!inRange.length) return 0;
  return Math.round(inRange.reduce((s, ci) => s + (ci.compliance_training ?? 0), 0) / inRange.length);
}
function weekNutritionCompliance(checkIns, weekStart, weekEnd) {
  const inRange = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return d >= weekStart && d <= weekEnd;
  });
  if (!inRange.length) return 0;
  return Math.round(inRange.reduce((s, ci) => s + (ci.compliance_nutrition ?? 0), 0) / inRange.length);
}

// Smart tag colors: red = warning, yellow = caution, green = positive, blue = info
function generateSmartTags(client, checkIns, messages) {
  const tags = [];
  const now = Date.now();
  const recent = checkIns.slice(0, 4);
  const avgNutrition = recent.length ? recent.reduce((s, c) => s + (c.compliance_nutrition ?? 50), 0) / recent.length : null;
  const avgTraining = recent.length ? recent.reduce((s, c) => s + (c.compliance_training ?? 50), 0) / recent.length : null;

  if (avgNutrition !== null && avgNutrition < 60) tags.push({ label: 'Low nutrition', type: 'red' });
  if (avgTraining !== null && avgTraining < 60) tags.push({ label: 'Low workouts', type: 'orange' });

  const lastCoachMsg = messages.find(m => m.sender === 'coach');
  if (!lastCoachMsg || (now - new Date(lastCoachMsg.created_date)) > 7 * 86400000) {
    tags.push({ label: 'No recent message', type: 'yellow' });
  }
  if (checkIns.length >= 2) {
    const latest = checkIns[0];
    const prev = checkIns[1];
    if (latest.weight && prev.weight && latest.weight < prev.weight) {
      tags.push({ label: 'Weight trending ↓', type: 'green' });
    }
  }
  if (client.assigned_nutrition_id) tags.push({ label: 'On meal plan', type: 'blue' });
  if (!client.assigned_program_id) tags.push({ label: 'No program', type: 'gray' });
  return tags;
}

const TAG_STYLES = {
  red:    { bg: 'var(--tc-destructive)', text: 'var(--tc-destructive)', border: 'var(--tc-destructive)' },
  orange: { bg: 'var(--tc-warning)', text: 'var(--kc-ea580c)', border: 'var(--tc-warning)' },
  yellow: { bg: 'var(--tc-warning)', text: 'var(--kc-ca8a04)', border: 'var(--tc-warning)' },
  green:  { bg: 'var(--tc-success)', text: 'var(--tc-success)', border: 'var(--tc-success)' },
  blue:   { bg: 'var(--tc-accent)', text: 'var(--tc-primary)', border: 'var(--tc-accent)' },
  gray:   { bg: 'var(--tc-background)', text: 'var(--tc-muted-foreground)', border: 'var(--tc-border)' },
};

// ─────────────────────────────────────────────────────────
export default function SummaryTab({ client, checkIns, messages, program, nutritionPlan, workoutSessions, earnedBadges = [], onAwardBadge, onClientUpdated }) {
  const { me } = useAuth();
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [showAIOnboarding, setShowAIOnboarding] = useState(false);

  const [user, setUser] = useState(null);
  useEffect(() => { me().then(setUser).catch(() => {}); }, []);
  const canAIOnboard = hasFeature(user, 'ai_onboarding');

  const score = compositeAdherenceScore(checkIns);
  const smartTags = generateSmartTags(client, checkIns, messages);
  const lastCheckIn = checkIns[0];
  const lastMsgFromCoach = messages.find(m => m.sender === 'coach');
  const lastMsgFromClient = messages.find(m => m.sender === 'client');

  const now = new Date();
  const weeks = [
    { label: '2 Wks Ago', start: startOfWeek(subWeeks(now, 2)), end: endOfWeek(subWeeks(now, 2)) },
    { label: '1 Wk Ago',  start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) },
    { label: 'This Week', start: startOfWeek(now), end: endOfWeek(now), active: true },
    { label: 'Next Week', start: startOfWeek(new Date(now.getTime() + 7 * 86400000)), end: endOfWeek(new Date(now.getTime() + 7 * 86400000)) },
  ];

  const saveTag = async () => {
    if (!newTag.trim()) return;
    const existing = client.tags || [];
    await db.entities.Client.update(client.id, { tags: [...existing, newTag.trim()] });
    toast.success('Tag added');
    setNewTag('');
    setAddingTag(false);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--tc-muted)' }}>
      <div className="grid h-full min-h-0" style={{ gridTemplateColumns: '260px 1fr 280px' }}>

        {/* ═══════════════ LEFT COLUMN ═══════════════ */}
        <div className="border-r border-border bg-card overflow-y-auto p-5 space-y-5">

          {/* Contact info */}
          <div className="space-y-1">
            <InfoRow label="Goal" value={goalLabels[client.goal] || 'General Fitness'} />
            {client.phone && <InfoRow label="Phone" value={client.phone} />}
            {client.start_date && <InfoRow label="Client since" value={format(new Date(client.start_date), 'MMM d, yyyy')} />}
            {client.monthly_rate && <InfoRow label="Rate" value={`$${client.monthly_rate}/mo`} />}
          </div>

          <Section title="Activity">
            <InfoRow label="Last check-in" value={lastCheckIn ? formatDistanceToNow(new Date(lastCheckIn.date), { addSuffix: true }) : 'Never'} />
            <InfoRow label="Msg sent" value={lastMsgFromCoach ? formatDistanceToNow(new Date(lastMsgFromCoach.created_date), { addSuffix: true }) : 'Never'} />
            <InfoRow label="Msg received" value={lastMsgFromClient ? formatDistanceToNow(new Date(lastMsgFromClient.created_date), { addSuffix: true }) : 'Never'} />
          </Section>

          <Section title="Totals">
            <InfoRow label="Workouts done" value={workoutSessions.length || 0} />
            <InfoRow label="Check-ins" value={checkIns.length} />
          </Section>

          <Section title="Achievements">
            {earnedBadges.length === 0 ? (
              <p className="text-xs text-muted-foreground">No achievements yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...earnedBadges].sort((a,b) => new Date(b.earned_date) - new Date(a.earned_date)).slice(0, 8).map(b => {
                  const cfg = BADGE_CONFIG[b.badge_key];
                  const tier = cfg ? TIER_STYLES[cfg.tier] : null;
                  if (!cfg || !tier) return null;
                  return (
                    <div key={b.id}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${tier.accent}15`, color: tier.accent, border: `1px solid ${tier.accent}35` }}
                      title={`${cfg.desc} · ${b.earned_date}`}
                    >
                      <span>{cfg.emoji}</span> {cfg.label}
                    </div>
                  );
                })}
              </div>
            )}
            {onAwardBadge && (
              <button onClick={onAwardBadge}
                className="flex items-center gap-1 text-[10px] font-semibold mt-1.5 hover:opacity-70"
                style={{ color: 'var(--tc-primary)' }}>
                <Plus className="w-3 h-3" /> Award Badge
              </button>
            )}
          </Section>

          <Section title="Smart Tags">
            <div className="flex flex-wrap gap-1.5">
              {smartTags.map((t, i) => {
                const s = TAG_STYLES[t.type] || TAG_STYLES.gray;
                return (
                  <span key={i} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                    {t.label}
                  </span>
                );
              })}
              {(client.tags || []).map((t, i) => (
                <span key={`c-${i}`} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--tc-ai)', color: 'var(--tc-ai)', border: '1px solid var(--tc-ai)' }}>
                  #{t}
                </span>
              ))}
            </div>
            {addingTag ? (
              <div className="flex gap-1 mt-2">
                <input
                  autoFocus
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTag()}
                  placeholder="Tag name…"
                  className="flex-1 text-xs border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={saveTag} className="text-xs text-primary font-semibold px-2">Save</button>
                <button onClick={() => setAddingTag(false)} className="text-xs text-muted-foreground px-1">✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingTag(true)} className="flex items-center gap-1 text-[10px] font-semibold mt-1.5 hover:opacity-70"
                style={{ color: 'var(--tc-primary)' }}>
                <Plus className="w-3 h-3" /> Add Tag
              </button>
            )}
          </Section>

          <Section title="Integrations">
            {[
              { name: 'Apple Watch', icon: '⌚' },
              { name: 'Fitbit', icon: '📊' },
              { name: 'MyFitnessPal', icon: '🥗' },
              { name: 'Withings', icon: '⚖️' },
            ].map(app => (
              <div key={app.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{app.icon}</span>
                  <span className="text-xs text-muted-foreground">{app.name}</span>
                </div>
                <button className="text-[10px] font-semibold hover:opacity-70" style={{ color: 'var(--tc-primary)' }}>Connect</button>
              </div>
            ))}
          </Section>

          <Section title="Threshold Alerts">
            <button className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ color: 'var(--tc-primary)' }}>
              <Bell className="w-3.5 h-3.5" /> Set up alerts
            </button>
          </Section>
        </div>

        {/* ═══════════════ MIDDLE COLUMN ═══════════════ */}
        <div className="overflow-y-auto p-5 space-y-4">

          {/* AI Onboarding button */}
          <button
            onClick={() => canAIOnboard ? setShowAIOnboarding(true) : toast.error('AI Onboarding requires Pro or Elite plan')}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-2.5 rounded-xl transition-all"
            style={{ background: canAIOnboard ? 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' : 'var(--tc-muted-foreground)' }}
          >
            {canAIOnboard ? <Sparkles className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            {canAIOnboard ? 'AI Onboarding — Generate Starting Plan' : 'AI Onboarding (Pro+)'}
          </button>

          {/* Program card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--tc-muted-foreground)' }}>Current Program</p>
                {program ? (
                  <>
                    <p className="font-bold text-foreground">{program.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {program.duration_weeks ? `${program.duration_weeks} weeks` : ''}
                      {client.start_date && program.duration_weeks ? ` · ${format(new Date(client.start_date), 'MMM d')} – ${format(new Date(new Date(client.start_date).getTime() + program.duration_weeks * 7 * 86400000), 'MMM d')}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No program assigned</p>
                )}
              </div>
              <Dumbbell className="w-5 h-5 text-border flex-shrink-0 mt-0.5" />
            </div>
            {nutritionPlan && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <Salad className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--tc-primary)' }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tc-muted-foreground)' }}>Meal Plan</p>
                  <p className="text-xs font-semibold cursor-pointer hover:opacity-70" style={{ color: 'var(--tc-primary)' }}>{nutritionPlan.title}</p>
                </div>
              </div>
            )}
          </div>

          {/* Exercise compliance */}
          <ComplianceSection
            title="Exercise Compliance"
            weeks={weeks}
            checkIns={checkIns}
            type="training"
            planLabel={program ? `${program.days_per_week || '?'} days/wk` : null}
          />

          {/* Nutrition compliance */}
          <ComplianceSection
            title="Nutrition Compliance"
            weeks={weeks}
            checkIns={checkIns}
            type="nutrition"
            planLabel={nutritionPlan?.calories ? `${nutritionPlan.calories} kcal` : null}
          />

          {/* Goals */}
          <GoalsSummarySection client={client} />
        </div>

        {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
        <div className="border-l border-border bg-card overflow-hidden flex flex-col">
          <NotesColumn client={client} />
        </div>
      </div>

      {/* AI Onboarding modal */}
      {showAIOnboarding && (
        <AIOnboardingModal
          client={client}
          onClose={() => setShowAIOnboarding(false)}
          onSaved={onClientUpdated}
        />
      )}
    </div>
  );
}

// ── Helpers ──

function Section({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-0.5 h-3 rounded-full" style={{ background: 'var(--tc-primary)' }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tc-muted-foreground)' }}>{title}</p>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right truncate">{value ?? '—'}</span>
    </div>
  );
}

function AchievementBadge({ emoji, label }) {
  return (
    <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'var(--tc-warning)', color: 'var(--tc-warning)', border: '1px solid var(--tc-warning)' }}>
      <span>{emoji}</span> {label}
    </div>
  );
}

function ComplianceSection({ title, weeks, checkIns, type, planLabel }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tc-muted-foreground)' }}>
          {title}
        </p>
        {planLabel && <span className="text-[10px] text-muted-foreground font-medium">{planLabel}</span>}
      </div>
      <div className="flex items-end justify-around gap-2">
        {weeks.map((w, i) => {
          const pct = type === 'training'
            ? weekCompliance(checkIns, w.start, w.end)
            : weekNutritionCompliance(checkIns, w.start, w.end);
          return (
            <Ring
              key={i}
              pct={pct}
              label={w.label}
              active={!!w.active}
              size={w.active ? 82 : 68}
            />
          );
        })}
      </div>
    </div>
  );
}

function NotesColumn({ client }) {
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: notes = [], refetch } = useQuery({
    queryKey: ['notes-col', client?.id],
    queryFn: () => db.entities.CheckIn.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => d.filter(ci => ci.coach_notes).sort((a, b) => new Date(b.date) - new Date(a.date)),
  });

  const save = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    await db.entities.CheckIn.create({
      client_id: client.id,
      client_name: client.name,
      date: new Date().toISOString().split('T')[0],
      coach_notes: newNote.trim(),
      review_status: 'reviewed',
    });
    setNewNote('');
    refetch();
    setSaving(false);
    toast.success('Note saved');
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full" style={{ background: 'var(--tc-primary)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--tc-foreground)' }}>Trainer Notes</p>
          {notes.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--tc-primary) 10%, transparent)', color: 'var(--tc-primary)' }}>
              {notes.length}
            </span>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0" style={{ background: 'var(--tc-background)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Add a note</p>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Write a note about this client…"
            rows={3}
            className="w-full text-xs p-2.5 resize-none outline-none bg-transparent"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || !newNote.trim()}
          className="mt-2 w-full text-primary-foreground text-xs font-semibold py-2 rounded-lg transition-all disabled:opacity-40"
          style={{ background: 'var(--tc-primary)' }}
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-4">No notes yet</p>
        ) : notes.map(ci => (
          <div key={ci.id} className="rounded-xl bg-card border border-border p-3 shadow-sm">
            <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--tc-primary)' }}>
              {format(new Date(ci.date), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{ci.coach_notes}</p>
          </div>
        ))}
      </div>
    </>
  );
}