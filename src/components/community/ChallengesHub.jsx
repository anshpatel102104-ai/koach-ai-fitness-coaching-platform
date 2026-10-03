import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import {
  Trophy, Plus, Target, Flame, Dumbbell, Footprints, TrendingDown, Users, Calendar, Zap,
  ChevronRight, Star, Clock
} from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUserTier } from '@/lib/subscription';

// ── Challenge preset templates ────────────────────────────────────────────────
const CHALLENGE_TEMPLATES = [
  {
    id: 'tpl_7day_workout',
    emoji: '💪',
    title: '7-Day Workout Streak',
    description: 'Complete a workout every day for 7 consecutive days. No days off — build that iron habit!',
    type: 'workouts',
    goal: 7,
    duration_days: 7,
    color: 'var(--tc-primary)',
    bg: 'var(--tc-accent)',
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_30day_workout',
    emoji: '🏋️',
    title: '30-Day Fitness Challenge',
    description: 'Complete 20 workouts in 30 days. Quality over quantity — every session counts.',
    type: 'workouts',
    goal: 20,
    duration_days: 30,
    color: 'var(--tc-ai)',
    bg: 'var(--tc-ai)',
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl_steps_10k',
    emoji: '👟',
    title: '10K Steps Daily',
    description: 'Hit 10,000 steps every single day for 2 weeks. Walk your way to better health.',
    type: 'steps',
    goal: 70000,
    duration_days: 14,
    color: 'var(--tc-success)',
    bg: 'var(--tc-success)',
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_hydration',
    emoji: '💧',
    title: 'Hydration Hero',
    description: 'Drink 3 litres of water every day for 21 days. Flush the fat, fuel the gains.',
    type: 'custom',
    goal: 21,
    duration_days: 21,
    color: 'var(--tc-primary)',
    bg: 'var(--kc-f0f9ff)',
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_weight_loss',
    emoji: '⚖️',
    title: 'Weight Loss Sprint',
    description: 'Lose 5 lbs in 30 days through consistent training and nutrition. Track every weigh-in.',
    type: 'weight_loss',
    goal: 5,
    duration_days: 30,
    color: 'var(--tc-destructive)',
    bg: 'var(--tc-destructive)',
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl_streak_21',
    emoji: '🔥',
    title: '21-Day Habit Streak',
    description: 'Build an unstoppable habit over 21 days. Log your progress daily — no breaks.',
    type: 'streak',
    goal: 21,
    duration_days: 21,
    color: 'var(--tc-warning)',
    bg: 'var(--tc-warning)',
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl_sleep',
    emoji: '😴',
    title: 'Sleep Champion',
    description: 'Get 8+ hours of sleep every night for 14 days. Recovery is training too.',
    type: 'custom',
    goal: 14,
    duration_days: 14,
    color: 'var(--tc-primary)',
    bg: 'var(--tc-accent)',
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_nutrition',
    emoji: '🥗',
    title: 'Clean Eating Month',
    description: 'Hit your macro targets for 20 out of 30 days. Track every meal, earn every result.',
    type: 'custom',
    goal: 20,
    duration_days: 30,
    color: 'var(--tc-success)',
    bg: 'var(--tc-success)',
    difficulty: 'Advanced',
  },
  {
    id: 'tpl_hiit_blast',
    emoji: '⚡',
    title: 'HIIT Blast Week',
    description: 'Complete 5 HIIT sessions in 7 days. Short, intense, and incredibly effective.',
    type: 'workouts',
    goal: 5,
    duration_days: 7,
    color: 'var(--tc-warning)',
    bg: 'var(--tc-warning)',
    difficulty: 'Advanced',
  },
];

const TYPE_CONFIG = {
  steps:       { label: 'Steps',       icon: Footprints,   unit: 'steps' },
  workouts:    { label: 'Workouts',    icon: Dumbbell,     unit: 'sessions' },
  streak:      { label: 'Streak',      icon: Flame,        unit: 'days' },
  weight_loss: { label: 'Weight Loss', icon: TrendingDown, unit: 'lbs' },
  custom:      { label: 'Custom',      icon: Target,       unit: 'units' },
};

const DIFFICULTY_CONFIG = {
  Beginner:     { color: 'var(--tc-success)', bg: 'var(--tc-success)' },
  Intermediate: { color: 'var(--tc-warning)', bg: 'var(--tc-warning)' },
  Advanced:     { color: 'var(--tc-destructive)', bg: 'var(--tc-destructive)' },
};

// ── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({ tpl, onUse }) {
  const diff = DIFFICULTY_CONFIG[tpl.difficulty] || DIFFICULTY_CONFIG.Beginner;
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: tpl.bg }}>
            {tpl.emoji}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{tpl.title}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: diff.bg, color: diff.color }}>
              {tpl.difficulty}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{tpl.description}</p>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Goal: {tpl.goal.toLocaleString()} {TYPE_CONFIG[tpl.type]?.unit}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tpl.duration_days} days</span>
      </div>
      <button onClick={() => onUse(tpl)}
        className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all group-hover:shadow-md"
        style={{ background: tpl.color }}>
        Use This Template →
      </button>
    </div>
  );
}

// ── Live challenge card ───────────────────────────────────────────────────────
function LiveChallengeCard({ challenge, isCoach, clients, groups, onToggle, onDelete }) {
  const isActive = challenge.is_active && challenge.end_date && isAfter(parseISO(challenge.end_date), new Date());
  const daysLeft = challenge.end_date ? differenceInDays(parseISO(challenge.end_date), new Date()) : null;
  const cfg = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.custom;
  const participants = challenge.participants || [];

  // Resolve participant names
  const participantClients = clients.filter(c => participants.includes(c.id));

  // Resolve group name
  const challengeGroup = groups.find(g => g.id === challenge.group_id);

  return (
    <div className={cn('bg-card border rounded-xl p-4 space-y-3', isActive ? 'border-border' : 'border-border opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'var(--tc-muted)' }}>
            {challenge.emoji || '🏆'}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{challenge.title}</p>
            <p className="text-[10px] text-muted-foreground">{cfg.label} challenge</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isActive && daysLeft !== null && (
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
              daysLeft <= 2 ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-success/10 border-success text-success')}>
              {daysLeft <= 0 ? 'Ended today' : `${daysLeft}d left`}
            </span>
          )}
          {!isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">Inactive</span>}
        </div>
      </div>

      {challenge.description && <p className="text-xs text-muted-foreground">{challenge.description}</p>}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {challenge.goal?.toLocaleString()} {cfg.unit}</span>
        {challenge.end_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(parseISO(challenge.end_date), 'MMM d')}</span>}
        {participants.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {participants.length} participants</span>}
        {challengeGroup && <span className="flex items-center gap-1 text-ai font-semibold">#{challengeGroup.name}</span>}
      </div>

      {/* Participants preview */}
      {participantClients.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {participantClients.slice(0, 5).map(c => (
            <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
              {c.name?.split(' ')[0]}
            </span>
          ))}
          {participantClients.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{participantClients.length - 5} more</span>
          )}
        </div>
      )}

      {isCoach && (
        <div className="flex items-center gap-2 pt-2 border-t border-muted">
          <button onClick={() => onToggle(challenge)}
            className="text-[10px] font-semibold px-3 py-1 rounded-lg border border-border text-foreground hover:border-foreground transition-colors">
            {challenge.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => { if (confirm('Delete this challenge?')) onDelete(challenge.id); }}
            className="text-[10px] font-semibold px-3 py-1 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Create Challenge Modal ────────────────────────────────────────────────────
function CreateChallengeModal({ open, onClose, prefill, clients, groups, onCreate }) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'workouts', goal: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    emoji: '🏆',
    participants: [],
    group_id: '',
    participant_mode: 'clients', // 'clients' | 'group'
  });

  // Pre-fill from template
  useEffect(() => {
    if (prefill) {
      const startDate = new Date();
      const endDate = addDays(startDate, prefill.duration_days);
      setForm(f => ({
        ...f,
        title: prefill.title,
        description: prefill.description,
        type: prefill.type,
        goal: String(prefill.goal),
        emoji: prefill.emoji,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      }));
    }
  }, [prefill]);

  const toggleClient = (clientId) => {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(clientId)
        ? f.participants.filter(id => id !== clientId)
        : [...f.participants, clientId],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      goal: Number(form.goal),
      start_date: form.start_date,
      end_date: form.end_date,
      emoji: form.emoji,
      is_active: true,
      participants: form.participant_mode === 'group' && form.group_id
        ? (groups.find(g => g.id === form.group_id)?.member_ids || [])
        : form.participants,
      group_id: form.participant_mode === 'group' ? form.group_id || undefined : undefined,
    };
    onCreate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground font-bold flex items-center gap-2">
            <span>{form.emoji}</span> {prefill ? 'Customize Challenge' : 'Create Challenge'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Title + Emoji */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Challenge Name *</label>
            <div className="flex gap-2">
              <input type="text" maxLength={2} value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                className="w-12 border border-border rounded-lg px-2 py-2 text-center text-base outline-none focus:ring-2 focus:ring-primary" />
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Challenge title…"
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what clients need to do…"
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {/* Type + Goal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-card">
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Goal ({TYPE_CONFIG[form.type]?.unit})
              </label>
              <input required type="number" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                placeholder="e.g. 7"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">End Date *</label>
              <input required type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">Who Participates?</label>
            <div className="flex gap-2 mb-3">
              {[{ key: 'clients', label: 'Select Clients' }, { key: 'group', label: 'Community Group' }].map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => setForm(f => ({ ...f, participant_mode: opt.key }))}
                  className={cn('flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all',
                    form.participant_mode === opt.key
                      ? 'border-primary bg-accent/10 text-primary'
                      : 'border-border text-muted-foreground')}>
                  {opt.label}
                </button>
              ))}
            </div>

            {form.participant_mode === 'clients' && (
              <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {clients.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No clients found</p>}
                {clients.map(c => (
                  <label key={c.id} className={cn('flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors',
                    form.participants.includes(c.id) ? 'bg-accent/10' : 'hover:bg-background')}>
                    <input type="checkbox" checked={form.participants.includes(c.id)}
                      onChange={() => toggleClient(c.id)}
                      className="accent-[var(--tc-primary)] w-3.5 h-3.5" />
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground flex-shrink-0">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground">{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            {form.participant_mode === 'group' && (
              <select value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-card">
                <option value="">— Select a community group —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({(g.member_ids || []).length} members)</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-background transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary transition-colors">
              Launch Challenge 🚀
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ChallengesHub({ isCoach, user }) {
  const [view, setView] = useState('templates'); // 'templates' | 'active'
  const [showCreate, setShowCreate] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState(null);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const qc = useQueryClient();

  const tier = getUserTier(user);
  const tierName = tier?.name || 'Starter';

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges-hub'],
    queryFn: () => db.entities.Challenge.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['community-groups'],
    queryFn: () => db.entities.CommunityGroup.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => db.entities.Challenge.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges-hub'] });
      setShowCreate(false);
      setPrefillTemplate(null);
      setView('active');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Challenge.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges-hub'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Challenge.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges-hub'] }),
  });

  const handleUseTemplate = (tpl) => {
    setPrefillTemplate(tpl);
    setShowCreate(true);
  };

  const handleCreateBlank = () => {
    setPrefillTemplate(null);
    setShowCreate(true);
  };

  const active = challenges.filter(c => c.is_active && c.end_date && isAfter(parseISO(c.end_date), new Date()));
  const past = challenges.filter(c => !c.is_active || (c.end_date && isBefore(parseISO(c.end_date), new Date())));

  const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const filteredTemplates = filterDifficulty === 'All'
    ? CHALLENGE_TEMPLATES
    : CHALLENGE_TEMPLATES.filter(t => t.difficulty === filterDifficulty);

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-xl p-5 text-primary-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, var(--tc-foreground) 0%, var(--tc-primary) 100%)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-bold text-white">Challenges</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--kc-w-10)] text-white/80 border border-white/10">
              {tierName}
            </span>
          </div>
          <p className="text-sm text-white/60">Create fitness challenges for your clients using preset templates</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-warning font-semibold">
              <Zap className="w-3.5 h-3.5" /> {active.length} active
            </span>
            <span className="text-xs text-white/40">·</span>
            <span className="text-xs text-white/50">{past.length} completed</span>
          </div>
        </div>
        {isCoach && (
          <div className="flex gap-2">
            <button onClick={handleCreateBlank}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)] text-white text-sm font-semibold rounded-lg transition-colors border border-white/10">
              <Plus className="w-4 h-4" /> Custom
            </button>
            <button onClick={() => setView('templates')}
              className="flex items-center gap-1.5 px-4 py-2 bg-warning text-foreground text-sm font-bold rounded-lg hover:bg-warning transition-colors">
              <Star className="w-4 h-4" /> From Template
            </button>
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-muted border border-border rounded-xl p-1 w-fit">
        {[
          { key: 'templates', label: '✨ Templates', count: null },
          { key: 'active', label: '🔥 Active', count: active.length },
          { key: 'past', label: '📜 Past', count: past.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              view === tab.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground ml-1">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Templates view */}
      {view === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {filteredTemplates.length} Ready-Made Challenges
            </p>
            <div className="flex gap-1.5">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setFilterDifficulty(d)}
                  className={cn('text-xs font-semibold px-3 py-1 rounded-full border transition-all',
                    filterDifficulty === d
                      ? 'bg-sidebar text-white border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground')}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl}
                onUse={isCoach ? handleUseTemplate : () => {}} />
            ))}
          </div>

          {!isCoach && (
            <div className="bg-accent border border-accent rounded-xl p-4 text-center">
              <p className="text-sm text-primary font-semibold">Challenges are launched by your coach</p>
              <p className="text-xs text-primary mt-1">Check Active Challenges to see what's running right now</p>
            </div>
          )}
        </div>
      )}

      {/* Active challenges */}
      {view === 'active' && (
        <div className="space-y-4">
          {active.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl bg-background">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No active challenges</p>
              {isCoach && (
                <button onClick={() => setView('templates')}
                  className="mt-3 text-xs font-bold text-primary hover:underline flex items-center gap-1 mx-auto">
                  Browse Templates <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.map(c => (
                <LiveChallengeCard key={c.id} challenge={c} isCoach={isCoach}
                  clients={clients} groups={groups}
                  onToggle={(ch) => updateMutation.mutate({ id: ch.id, data: { is_active: !ch.is_active } })}
                  onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past challenges */}
      {view === 'past' && (
        <div className="space-y-4">
          {past.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl bg-background">
              <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No past challenges yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map(c => (
                <LiveChallengeCard key={c.id} challenge={c} isCoach={isCoach}
                  clients={clients} groups={groups}
                  onToggle={(ch) => updateMutation.mutate({ id: ch.id, data: { is_active: !ch.is_active } })}
                  onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateChallengeModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setPrefillTemplate(null); }}
        prefill={prefillTemplate}
        clients={clients}
        groups={groups}
        onCreate={(payload) => createMutation.mutate(payload)}
      />
    </div>
  );
}