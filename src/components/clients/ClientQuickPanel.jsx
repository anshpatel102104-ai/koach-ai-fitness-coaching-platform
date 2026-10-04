import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// Step 2 cutover: Clients/CRM surface runs on Supabase via the entity-shaped
// facade — call sites unchanged.
import { db } from '@/api/supabaseClient';
import {
  X, Edit, ExternalLink, Dumbbell, Salad, ClipboardCheck, MessageSquare,
  Phone, Target, Calendar, TrendingUp, Users, Plus, Send, CheckCircle2,
  Circle, BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import LifecycleBadge from './LifecycleBadge';
import LeadPipelinePanel from './LeadPipelinePanel';
import { compositeAdherenceScore } from '@/lib/adherence';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const goalLabels = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness'
};

const moodEmoji = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };

function StatBox({ label, value, sub, color = 'text-foreground' }) {
  return (
    <div className="bg-muted rounded-xl p-3 flex flex-col gap-0.5">
      <span className={`text-base font-bold ${color}`}>{value ?? '—'}</span>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function OnboardingChecklist({ client, checkIns, program, nutritionPlan }) {
  const steps = [
    { label: 'Profile filled', done: !!(client.goal || client.height || client.current_weight) },
    { label: 'Program assigned', done: !!client.assigned_program_id },
    { label: 'Nutrition plan set', done: !!client.assigned_nutrition_id },
    { label: 'First check-in', done: checkIns.length > 0 },
    { label: 'Message sent', done: false }, // would need messages data; left as false
  ];
  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  const color = pct === 100 ? 'bg-success' : pct >= 60 ? 'bg-primary' : 'bg-warning';

  return (
    <div className="p-4 bg-muted rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-foreground">Onboarding</p>
        <span className="text-xs font-bold text-foreground">{completed} of {steps.length} done</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
        {steps.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[11px]">
            {s.done
              ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
              : <Circle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            }
            <span className={s.done ? 'text-foreground font-medium' : 'text-muted-foreground'}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientQuickPanel({ client, checkIns = [], onClose, onEdit }) {
  const isLead = (client.lifecycle_status || 'lead') === 'lead';
  const [tab, setTab] = useState(isLead ? 'pipeline' : 'overview');
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ['program', client?.assigned_program_id],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: client.assigned_program_id }),
    enabled: !!client?.assigned_program_id,
    select: d => d[0],
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-plan', client?.assigned_nutrition_id],
    queryFn: () => db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id }),
    enabled: !!client?.assigned_nutrition_id,
    select: d => d[0],
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages-panel', client?.id],
    queryFn: () => db.entities.Message.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-panel', client?.id],
    queryFn: () => db.entities.Session.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => d.filter(s => s.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date)),
  });

  useEffect(() => {
    if (tab === 'messages') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [tab, messages.length]);

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSendingMsg(true);
    await db.entities.Message.create({ client_id: client.id, client_name: client.name, sender: 'coach', content: msgText.trim() });
    setMsgText('');
    await refetchMessages();
    setSendingMsg(false);
    toast.success('Message sent');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  if (!client) return null;

  const initials = client.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const score = compositeAdherenceScore(checkIns);
  const scoreColor = score === null ? 'var(--tc-muted-foreground)' : score >= 80 ? 'var(--tc-success)' : score >= 60 ? 'var(--tc-warning)' : 'var(--tc-destructive)';
  const daysAsClient = client.start_date ? differenceInDays(new Date(), new Date(client.start_date)) : null;
  const lastCheckIn = checkIns[0];
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const nextSession = sessions[0];

  // Weight chart data
  const weightData = [...checkIns]
    .filter(ci => ci.weight)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-12)
    .map(ci => ({ date: format(new Date(ci.date), 'MMM d'), weight: ci.weight }));

  // Adherence chart data
  const adherenceData = [...checkIns]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-8)
    .map(ci => ({
      date: format(new Date(ci.date), 'MMM d'),
      training: ci.compliance_training ?? 0,
      nutrition: ci.compliance_nutrition ?? 0,
    }));

  const TABS = [
    ...(isLead ? [{ key: 'pipeline', label: 'Pipeline', icon: Users }] : []),
    { key: 'overview', label: 'Overview', icon: Target },
    { key: 'program', label: 'Program', icon: Dumbbell },
    { key: 'nutrition', label: 'Nutrition', icon: Salad },
    { key: 'checkins', label: 'Check-ins', icon: ClipboardCheck },
    { key: 'messages', label: 'Messages', icon: MessageSquare },
    { key: 'progress', label: 'Progress', icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-2xl bg-card h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-primary flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
              {client.avatar_url
                ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                : <span className="text-base">{initials}</span>
              }
            </div>
            <div>
              <p className="font-bold text-foreground text-base leading-tight">{client.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <LifecycleBadge status={client.lifecycle_status || 'lead'} />
                {client.goal && (
                  <span className="text-[10px] text-muted-foreground">{goalLabels[client.goal]}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Full profile" onClick={() => navigate(`/client-profile?id=${client.id}`)}>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Quick stats bar ── */}
        <div className="flex border-b border-border flex-shrink-0 bg-background">
          {[
            { label: 'Adherence', value: score !== null ? `${score}%` : '—', color: scoreColor },
            { label: 'Check-ins', value: checkIns.length, color: 'var(--tc-foreground)' },
            { label: 'Days Active', value: daysAsClient !== null ? daysAsClient : '—', color: 'var(--tc-foreground)' },
            { label: 'Rate', value: client.monthly_rate ? `$${client.monthly_rate}` : '—', color: 'var(--tc-foreground)' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 flex flex-col items-center py-2.5 border-r border-border last:border-r-0">
              <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex overflow-x-auto border-b border-border flex-shrink-0 bg-muted">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0',
                tab === t.key ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── PIPELINE (leads only) ── */}
          {tab === 'pipeline' && (
            <div className="p-5">
              <LeadPipelinePanel
                client={client}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
              />
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="p-5 space-y-4">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-2">
                {client.email && (
                  <div className="col-span-2 flex items-center gap-2.5 text-sm text-foreground bg-muted rounded-xl px-3 py-2.5">
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground bg-muted rounded-xl px-3 py-2.5">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    {client.phone}
                  </div>
                )}
                {client.start_date && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground bg-muted rounded-xl px-3 py-2.5">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    Since {format(new Date(client.start_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Current" value={client.current_weight ? `${client.current_weight} lbs` : '—'} />
                <StatBox label="Starting" value={checkIns.length > 0 && checkIns[checkIns.length - 1]?.weight ? `${checkIns[checkIns.length - 1].weight} lbs` : '—'} />
                <StatBox label="Goal" value={client.target_weight ? `${client.target_weight} lbs` : '—'} />
                <StatBox label="Days" value={daysAsClient !== null ? daysAsClient : '—'} />
              </div>

              {/* Activity */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Last Check-in</p>
                  <p className="text-sm font-bold text-foreground">
                    {lastCheckIn ? formatDistanceToNow(new Date(lastCheckIn.date), { addSuffix: true }) : 'Never'}
                  </p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Last Message</p>
                  <p className="text-sm font-bold text-foreground">
                    {lastMsg ? formatDistanceToNow(new Date(lastMsg.created_date), { addSuffix: true }) : 'Never'}
                  </p>
                </div>
              </div>

              {/* Next session */}
              {nextSession && (
                <div className="bg-accent border border-accent rounded-xl p-3 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary">Next Session</p>
                    <p className="text-sm text-foreground">{nextSession.title} · {format(new Date(nextSession.date), 'EEE, MMM d')} {nextSession.time && `at ${nextSession.time}`}</p>
                  </div>
                </div>
              )}

              {/* Onboarding checklist */}
              <OnboardingChecklist client={client} checkIns={checkIns} program={program} nutritionPlan={nutritionPlan} />

              {/* Tags */}
              {client.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map(tag => (
                    <span key={tag} className="text-xs bg-accent/10 text-primary border border-accent rounded-lg px-2 py-0.5 font-medium">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {client.notes && (
                <div className="p-3 bg-muted rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Coach Notes</p>
                  <p className="text-sm text-foreground leading-relaxed">{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROGRAM ── */}
          {tab === 'program' && (
            <div className="p-5 space-y-4">
              {program ? (
                <>
                  <div className="p-4 bg-muted rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground text-base">{program.title}</p>
                        {program.description && <p className="text-xs text-muted-foreground mt-0.5">{program.description}</p>}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-primary border border-accent font-semibold flex-shrink-0 capitalize">{program.difficulty}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Weeks', value: program.duration_weeks || '—' },
                        { label: 'Days/wk', value: program.days_per_week || '—' },
                        { label: 'Workouts', value: (program.workouts || []).length },
                      ].map(s => (
                        <div key={s.label} className="bg-card rounded-xl p-2.5">
                          <p className="text-sm font-bold text-foreground">{s.value}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly schedule */}
                  {(program.workouts || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Weekly Schedule</p>
                      <div className="space-y-2">
                        {program.workouts.map((w, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {w.day_number || i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{w.day_name}</p>
                              <p className="text-[11px] text-muted-foreground">{(w.exercises || []).length} exercises</p>
                            </div>
                            <Dumbbell className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={onEdit}>
                    <Plus className="w-3.5 h-3.5" /> Swap Program
                  </Button>
                </>
              ) : (
                <div className="text-center py-14">
                  <Dumbbell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">No program assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Assign a workout program to get started</p>
                  <Button variant="outline" size="sm" onClick={onEdit}>Assign Program</Button>
                </div>
              )}
            </div>
          )}

          {/* ── NUTRITION ── */}
          {tab === 'nutrition' && (
            <div className="p-5 space-y-4">
              {nutritionPlan ? (
                <>
                  <div className="p-4 bg-muted rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground text-base">{nutritionPlan.title}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success font-semibold flex-shrink-0 capitalize">{nutritionPlan.tracking_mode || 'macros'}</span>
                    </div>
                    {nutritionPlan.description && <p className="text-xs text-muted-foreground">{nutritionPlan.description}</p>}
                    {nutritionPlan.tracking_mode !== 'habits' && (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'Calories', value: nutritionPlan.calories ? `${nutritionPlan.calories}` : '—', color: 'text-orange-500' },
                          { label: 'Protein', value: nutritionPlan.protein_g ? `${nutritionPlan.protein_g}g` : '—', color: 'text-destructive' },
                          { label: 'Carbs', value: nutritionPlan.carbs_g ? `${nutritionPlan.carbs_g}g` : '—', color: 'text-warning' },
                          { label: 'Fats', value: nutritionPlan.fats_g ? `${nutritionPlan.fats_g}g` : '—', color: 'text-primary' },
                        ].map(s => (
                          <div key={s.label} className="bg-card rounded-xl p-2.5">
                            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meals */}
                  {(nutritionPlan.meals || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Meal Plan</p>
                      <div className="space-y-2">
                        {nutritionPlan.meals.map((m, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                            <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{m.meal_name}</p>
                              <p className="text-[11px] text-muted-foreground">{m.time || ''}{m.foods?.length ? ` · ${m.foods.length} foods` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={onEdit}>
                    <Plus className="w-3.5 h-3.5" /> Edit / Swap Plan
                  </Button>
                </>
              ) : (
                <div className="text-center py-14">
                  <Salad className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">No nutrition plan assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Assign a meal plan or set macro targets</p>
                  <Button variant="outline" size="sm" onClick={onEdit}>Assign Plan</Button>
                </div>
              )}
            </div>
          )}

          {/* ── CHECK-INS ── */}
          {tab === 'checkins' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{checkIns.length} total check-ins</p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/submit-checkin?client_id=${client.id}`)}>
                  <Plus className="w-3 h-3" /> Log Check-in
                </Button>
              </div>
              {checkIns.length === 0 ? (
                <div className="text-center py-14">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No check-ins yet</p>
                </div>
              ) : checkIns.map((ci) => (
                <div key={ci.id} className="p-3 bg-muted rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">{format(new Date(ci.date), 'MMM d, yyyy')}</p>
                      {ci.mood && <span className="text-sm">{moodEmoji[ci.mood]}</span>}
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ci.review_status === 'reviewed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                      {ci.review_status || 'pending'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {ci.weight && <span>⚖️ {ci.weight} lbs</span>}
                    {ci.compliance_training !== undefined && <span>🏋️ Training {ci.compliance_training}%</span>}
                    {ci.compliance_nutrition !== undefined && <span>🥗 Nutrition {ci.compliance_nutrition}%</span>}
                    {ci.sleep_hours && <span>😴 {ci.sleep_hours}h sleep</span>}
                    {ci.energy_level && <span>⚡ Energy {ci.energy_level}/10</span>}
                  </div>
                  {ci.notes && <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{ci.notes}"</p>}
                  {ci.photo_urls?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {ci.photo_urls.map((url, i) => (
                        <SignedImg key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MESSAGES ── */}
          {tab === 'messages' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center py-14">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={cn('flex', msg.sender === 'coach' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed', msg.sender === 'coach' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm')}>
                      <p>{msg.content}</p>
                      <p className={cn('text-[10px] mt-1', msg.sender === 'coach' ? 'text-white/60' : 'text-muted-foreground')}>
                        {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {/* Compose box */}
              <div className="border-t border-border p-4 flex-shrink-0 bg-card">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Write a message…"
                    rows={2}
                    className="resize-none text-sm flex-1"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={sendingMsg || !msgText.trim()} className="h-10 w-10 flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Enter to send · Shift+Enter for new line</p>
              </div>
            </div>
          )}

          {/* ── PROGRESS ── */}
          {tab === 'progress' && (
            <div className="p-5 space-y-6">
              {/* Weight chart */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Weight Over Time</p>
                {weightData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={weightData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} domain={['auto', 'auto']} width={40} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--tc-border)' }} />
                      <Line type="monotone" dataKey="weight" stroke="var(--tc-primary)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-32 flex items-center justify-center bg-muted rounded-xl text-sm text-muted-foreground">
                    {checkIns.length < 2 ? 'Need at least 2 check-ins with weight data' : 'No weight data recorded'}
                  </div>
                )}
              </div>

              {/* Adherence chart */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Adherence Over Time</p>
                {adherenceData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={adherenceData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} domain={[0, 100]} width={30} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--tc-border)' }} />
                      <Bar dataKey="training" name="Training %" fill="var(--tc-primary)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="nutrition" name="Nutrition %" fill="var(--tc-success)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-32 flex items-center justify-center bg-muted rounded-xl text-sm text-muted-foreground">
                    Need at least 2 check-ins with compliance data
                  </div>
                )}
              </div>

              {/* Progress photos */}
              {checkIns.some(ci => ci.photo_urls?.length > 0) && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Progress Photos</p>
                  <div className="space-y-4">
                    {checkIns.filter(ci => ci.photo_urls?.length > 0).map(ci => (
                      <div key={ci.id}>
                        <p className="text-[11px] text-muted-foreground mb-2">{format(new Date(ci.date), 'MMM d, yyyy')}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {ci.photo_urls.map((url, i) => (
                            <SignedImg key={i} src={url} alt="Progress" className="w-full aspect-square object-cover rounded-xl border border-border" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkIns.length === 0 && (
                <div className="text-center py-14">
                  <BarChart2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No check-in data yet to chart</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}