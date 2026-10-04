import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Target, Calendar, Users, Dumbbell, Footprints, Flame, TrendingDown, Trophy } from 'lucide-react';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BADGE_CONFIG } from '@/lib/badges';

const TYPE_CONFIG = {
  steps:        { label: 'Steps',       icon: Footprints,   unit: 'steps' },
  workouts:     { label: 'Workouts',    icon: Dumbbell,     unit: 'sessions' },
  streak:       { label: 'Streak',      icon: Flame,        unit: 'days' },
  weight_loss:  { label: 'Weight Loss', icon: TrendingDown, unit: 'lbs' },
  custom:       { label: 'Custom',      icon: Target,       unit: 'units' },
};

const BLANK_FORM = {
  title: '', description: '', type: 'workouts', goal: '',
  start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '', reward_badge: '', is_active: true,
};

function ChallengeCard({ challenge, isCoach, onToggle, onDelete }) {
  const isActive = challenge.is_active && challenge.end_date && isAfter(parseISO(challenge.end_date), new Date());
  const daysLeft = challenge.end_date ? differenceInDays(parseISO(challenge.end_date), new Date()) : null;
  const cfg = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.custom;
  const CfgIcon = cfg.icon;
  const rewardBadge = challenge.reward_badge ? BADGE_CONFIG[challenge.reward_badge] : null;
  const participants = challenge.participants || [];

  const progressPct = challenge.goal > 0 && challenge.completed_count != null
    ? Math.min(100, Math.round((challenge.completed_count / (challenge.goal || 1)) * 100))
    : null;

  return (
    <div className={cn('bg-card border rounded-xl p-4 space-y-3 transition-all', isActive ? 'border-border' : 'border-border opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <CfgIcon className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{challenge.title}</p>
            <p className="text-xs text-muted-foreground">{cfg.label} challenge</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isActive && daysLeft !== null && (
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
              daysLeft <= 2 ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-success/10 border-success text-success')}>
              {daysLeft <= 0 ? 'Ended' : `${daysLeft}d left`}
            </span>
          )}
          {!isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">Inactive</span>}
        </div>
      </div>

      {challenge.description && <p className="text-xs text-muted-foreground leading-relaxed">{challenge.description}</p>}

      {/* Progress bar */}
      {progressPct !== null && (
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{challenge.completed_count || 0} / {challenge.goal} {cfg.unit}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-sidebar rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Goal: {challenge.goal?.toLocaleString()} {cfg.unit}</span>
        {challenge.end_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Ends {format(parseISO(challenge.end_date), 'MMM d')}</span>}
        {participants.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {participants.length} joined</span>}
      </div>

      {/* Reward badge */}
      {rewardBadge && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-[var(--kc-fef08a)] rounded-lg">
          <Trophy className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-semibold text-warning">Reward: {rewardBadge.label} badge</span>
        </div>
      )}

      {isCoach && (
        <div className="flex items-center gap-2 pt-1 border-t border-muted">
          <button onClick={() => onToggle(challenge)} className="text-[10px] font-semibold px-3 py-1 rounded-lg border border-border text-foreground hover:border-foreground transition-colors">
            {challenge.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => onDelete(challenge.id)} className="text-[10px] font-semibold px-3 py-1 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function WeeklyChallenges({ isCoach, compact, groupId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const queryClient = useQueryClient();

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges', groupId],
    queryFn: () => groupId
      ? db.entities.Challenge.filter({ group_id: groupId }, '-created_date')
      : db.entities.Challenge.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => db.entities.Challenge.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['challenges', groupId] }); setShowForm(false); setForm(BLANK_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Challenge.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges', groupId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Challenge.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges', groupId] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, goal: Number(form.goal), group_id: groupId || undefined });
  };

  const active = challenges.filter(c => c.is_active);
  const past = challenges.filter(c => !c.is_active);

  const shownActive = compact ? active.slice(0, 2) : active;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Challenges</p>
          {isCoach && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-sidebar text-white rounded-lg hover:bg-black transition-colors">
              <Plus className="w-3 h-3" /> New Challenge
            </button>
          )}
        </div>
      )}

      {shownActive.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl bg-background">
          <Target className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground">No active challenges</p>
          {isCoach && !compact && <p className="text-xs text-muted-foreground mt-1">Create one to motivate your community!</p>}
        </div>
      ) : (
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
          {shownActive.map(c => (
            <ChallengeCard key={c.id} challenge={c} isCoach={isCoach}
              onToggle={(ch) => updateMutation.mutate({ id: ch.id, data: { is_active: !ch.is_active } })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {!compact && past.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Past Challenges</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {past.map(c => (
              <ChallengeCard key={c.id} challenge={c} isCoach={isCoach}
                onToggle={(ch) => updateMutation.mutate({ id: ch.id, data: { is_active: !ch.is_active } })}
                onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </div>
        </>
      )}

      {/* Create Challenge Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-semibold">Create Challenge</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-foreground">Challenge Name *</Label>
              <Input className="mt-1" required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="7-Day Workout Challenge" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Description</Label>
              <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Complete 7 workouts in 7 days…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => {
                      const Icon = v.icon;
                      return <SelectItem key={k} value={k}><span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{v.label}</span></SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">Goal ({TYPE_CONFIG[form.type]?.unit})</Label>
                <Input className="mt-1" required type="number" value={form.goal} onChange={e => setForm(f => ({...f, goal: e.target.value}))} placeholder="e.g. 5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Start Date</Label>
                <Input className="mt-1" type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">End Date *</Label>
                <Input className="mt-1" required type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Reward Badge (optional)</Label>
              <Select value={form.reward_badge} onValueChange={v => setForm(f => ({...f, reward_badge: v}))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a badge reward…" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value={null}>No reward</SelectItem>
                  {Object.entries(BADGE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-background transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-sidebar text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors">Create Challenge</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}