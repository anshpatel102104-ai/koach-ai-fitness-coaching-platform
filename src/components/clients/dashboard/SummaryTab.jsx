import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { compositeAdherenceScore } from '@/lib/adherence';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { cn } from '@/lib/utils';
import { Plus, Bell, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, TextLink, ComplianceStrip, complianceState } from '@/components/kit';
import GoalsSummarySection from './GoalsSummarySection';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { hasFeature } from '@/lib/subscription';
import AIOnboardingModal from '@/components/clients/ai-onboarding/AIOnboardingModal';

const goalLabels = {
  weight_loss: 'Weight loss', muscle_gain: 'Muscle gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General fitness'
};

// Week compliance helpers
function weekCompliance(checkIns, weekStart, weekEnd) {
  const inRange = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return d >= weekStart && d <= weekEnd;
  });
  const vals = inRange.map(ci => ci.compliance_training).filter(v => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}
function weekNutritionCompliance(checkIns, weekStart, weekEnd) {
  const inRange = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return d >= weekStart && d <= weekEnd;
  });
  const vals = inRange.map(ci => ci.compliance_nutrition).filter(v => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
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
      tags.push({ label: 'Weight trending down', type: 'green' });
    }
  }
  if (client.assigned_nutrition_id) tags.push({ label: 'On meal plan', type: 'blue' });
  if (!client.assigned_program_id) tags.push({ label: 'No program', type: 'gray' });
  return tags;
}

const TAG_VARIANT = {
  red: 'destructive', orange: 'warning', yellow: 'warning', green: 'success', blue: 'secondary', gray: 'outline',
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
    { label: '3 weeks ago', start: startOfWeek(subWeeks(now, 3)), end: endOfWeek(subWeeks(now, 3)) },
    { label: '2 weeks ago', start: startOfWeek(subWeeks(now, 2)), end: endOfWeek(subWeeks(now, 2)) },
    { label: 'Last week', start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) },
    { label: 'This week', start: startOfWeek(now), end: endOfWeek(now), active: true },
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
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:h-full lg:min-h-0 lg:grid-cols-[260px_minmax(0,1fr)_280px]">

        {/* ── Left: facts ── */}
        <div className="border-b lg:border-b-0 lg:border-r border-border bg-card lg:overflow-y-auto p-5 space-y-6">
          <div>
            <InfoRow label="Goal" value={goalLabels[client.goal] || 'General fitness'} />
            {client.phone && <InfoRow label="Phone" value={client.phone} />}
            {client.start_date && <InfoRow label="Client since" value={format(new Date(client.start_date), 'MMM d, yyyy')} />}
            {client.monthly_rate && <InfoRow label="Rate" value={`$${client.monthly_rate} a month`} />}
          </div>

          <Section title="Activity">
            <InfoRow label="Last check-in" value={lastCheckIn ? formatDistanceToNow(new Date(lastCheckIn.date), { addSuffix: true }) : 'Never'} />
            <InfoRow label="You messaged" value={lastMsgFromCoach ? formatDistanceToNow(new Date(lastMsgFromCoach.created_date), { addSuffix: true }) : 'Never'} />
            <InfoRow label="They messaged" value={lastMsgFromClient ? formatDistanceToNow(new Date(lastMsgFromClient.created_date), { addSuffix: true }) : 'Never'} />
          </Section>

          <Section title="Totals">
            <InfoRow label="Workouts logged" value={workoutSessions.length || 0} />
            <InfoRow label="Check-ins" value={checkIns.length} />
            <InfoRow label="Compliance" value={score !== null ? `${score}%` : '\u2014'} />
          </Section>

          <Section title="Achievements">
            {earnedBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...earnedBadges].sort((a,b) => new Date(b.earned_date) - new Date(a.earned_date)).slice(0, 8).map(b => {
                  const cfg = BADGE_CONFIG[b.badge_key];
                  const tier = cfg ? TIER_STYLES[cfg.tier] : null;
                  if (!cfg || !tier) return null;
                  return (
                    <Badge key={b.id} variant="secondary" title={`${cfg.desc} \u00b7 ${b.earned_date}`}>{cfg.label}</Badge>
                  );
                })}
              </div>
            )}
            {onAwardBadge && (
              <TextLink className="mt-2 inline-block" onClick={onAwardBadge}>Award a badge</TextLink>
            )}
          </Section>

          <Section title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {smartTags.map((t, i) => (
                <Badge key={i} variant={TAG_VARIANT[t.type] || 'outline'}>{t.label}</Badge>
              ))}
              {(client.tags || []).map((t, i) => (
                <Badge key={`c-${i}`} variant="outline">#{t}</Badge>
              ))}
            </div>
            {addingTag ? (
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  autoFocus
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTag()}
                  placeholder="Tag name"
                  className="flex-1 min-w-0 h-8 text-sm bg-card border border-input rounded-md px-2 outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm" onClick={saveTag}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingTag(false)}>Cancel</Button>
              </div>
            ) : (
              <button onClick={() => setAddingTag(true)} className="touch-compact mt-2 inline-flex items-center gap-1 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1">
                <Plus className="w-3.5 h-3.5" /> Add tag
              </button>
            )}
          </Section>

          <Section title="Integrations">
            {['Apple Watch', 'Fitbit', 'MyFitnessPal', 'Withings'].map(name => (
              <div key={name} className="flex items-center justify-between py-1">
                <span className="text-sm text-foreground/80">{name}</span>
                <button className="touch-compact text-sm font-semibold text-foreground underline underline-offset-4 decoration-1">Connect</button>
              </div>
            ))}
          </Section>

          <Section title="Threshold alerts">
            <button className="touch-compact inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1">
              <Bell className="w-3.5 h-3.5" /> Set up alerts
            </button>
          </Section>
        </div>

        {/* ── Middle: plan + compliance + goals ── */}
        <div className="lg:overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* AI onboarding */}
          <section className="rounded-xl bg-ai text-ai-foreground p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-[20px]">Draft a starting plan</h3>
              <p className="text-sm text-ai-foreground/75 mt-1">The AI drafts a program and meal plan from their intake answers. Nothing is sent until you approve it.</p>
            </div>
            <Button
              variant="outline"
              className="bg-card text-foreground border-transparent hover:bg-card/90 flex-shrink-0"
              onClick={() => canAIOnboard ? setShowAIOnboarding(true) : toast.error('AI onboarding needs the Pro or Elite plan')}
            >
              {!canAIOnboard && <Lock className="w-3.5 h-3.5" />}
              {canAIOnboard ? 'Start AI onboarding' : 'Pro and Elite only'}
            </Button>
          </section>

          {/* Program + meal plan */}
          <Panel className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">Program</p>
                {program ? (
                  <>
                    <p className="text-[15px] font-semibold text-foreground mt-0.5">{program.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {program.duration_weeks ? `${program.duration_weeks} weeks` : ''}
                      {client.start_date && program.duration_weeks ? `, ${format(new Date(client.start_date), 'MMM d')} to ${format(new Date(new Date(client.start_date).getTime() + program.duration_weeks * 7 * 86400000), 'MMM d')}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-[15px] text-muted-foreground mt-0.5">No program assigned</p>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">Meal plan</p>
                {nutritionPlan
                  ? <p className="text-[15px] font-semibold text-foreground mt-0.5">{nutritionPlan.title}</p>
                  : <p className="text-[15px] text-muted-foreground mt-0.5">No meal plan assigned</p>}
              </div>
            </div>
          </Panel>

          <ComplianceSection
            weeks={weeks}
            checkIns={checkIns}
            trainingLabel={program ? `${program.days_per_week || '?'} days a week` : null}
            nutritionLabel={nutritionPlan?.calories ? `${Number(nutritionPlan.calories).toLocaleString('en-US')} kcal` : null}
          />

          <GoalsSummarySection client={client} />
        </div>

        {/* ── Right: trainer notes ── */}
        <div className="border-t lg:border-t-0 lg:border-l border-border bg-card lg:overflow-hidden flex flex-col">
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
      <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right truncate">{value ?? '\u2014'}</span>
    </div>
  );
}

function ComplianceSection({ weeks, checkIns, trainingLabel, nutritionLabel }) {
  const rows = [
    { key: 'training', label: 'Training', sub: trainingLabel, values: weeks.map(w => weekCompliance(checkIns, w.start, w.end)) },
    { key: 'nutrition', label: 'Nutrition', sub: nutritionLabel, values: weeks.map(w => weekNutritionCompliance(checkIns, w.start, w.end)) },
  ];
  return (
    <Panel className="p-5">
      <h3 className="text-[20px] text-foreground">Compliance by week</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="text-[13px] text-muted-foreground">
              <th className="font-normal pb-2 pr-4" />
              {weeks.map(w => <th key={w.label} className={cn('font-normal pb-2 px-2', w.active && 'text-foreground font-medium')}>{w.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-t border-border">
                <td className="py-3 pr-4">
                  <p className="text-[15px] font-semibold text-foreground">{r.label}</p>
                  {r.sub && <p className="text-[13px] text-muted-foreground">{r.sub}</p>}
                </td>
                {r.values.map((v, i) => (
                  <td key={i} className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <ComplianceStrip weeks={[v === null ? 'none' : complianceState(v)]} size="sm" />
                      <span className="num text-[18px] text-foreground">{v === null ? '\u2014' : `${v}%`}</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
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
      <div className="px-5 pt-5 pb-3 flex items-baseline justify-between flex-shrink-0">
        <h3 className="text-[20px] text-foreground">Trainer notes</h3>
        {notes.length > 0 && <span className="text-[13px] text-muted-foreground tabular-nums">{notes.length}</span>}
      </div>

      {/* Input area */}
      <div className="px-5 pb-4 border-b border-border flex-shrink-0">
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="What should future you remember about them?"
          rows={3}
          aria-label="Add a note"
          className="w-full text-sm p-3 rounded-lg border border-input bg-card resize-none outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <Button className="mt-2 w-full" size="sm" onClick={save} disabled={saving || !newNote.trim()}>
          {saving ? 'Saving' : 'Save note'}
        </Button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-5 divide-y divide-border">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No notes yet.</p>
        ) : notes.map(ci => (
          <div key={ci.id} className="py-3">
            <p className="text-[13px] text-muted-foreground mb-1">{format(new Date(ci.date), 'MMM d, yyyy')}</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{ci.coach_notes}</p>
          </div>
        ))}
      </div>
    </>
  );
}