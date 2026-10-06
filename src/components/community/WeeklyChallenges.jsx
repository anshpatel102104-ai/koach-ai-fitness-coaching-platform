import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader, EmptyState } from '@/components/kit';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BADGE_CONFIG } from '@/lib/badges';

const TYPE_CONFIG = {
  steps:        { label: 'Steps',       unit: 'steps' },
  workouts:     { label: 'Workouts',    unit: 'sessions' },
  streak:       { label: 'Streak',      unit: 'days' },
  weight_loss:  { label: 'Weight loss', unit: 'lb' },
  custom:       { label: 'Custom',      unit: 'units' },
};

const BLANK_FORM = {
  title: '', description: '', type: 'workouts', goal: '',
  start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '', reward_badge: '', is_active: true,
};

function ChallengeCard({ challenge, isCoach, onToggle, onDelete }) {
  const isActive = challenge.is_active && challenge.end_date && isAfter(parseISO(challenge.end_date), new Date());
  const daysLeft = challenge.end_date ? differenceInDays(parseISO(challenge.end_date), new Date()) : null;
  const cfg = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.custom;
  const rewardBadge = challenge.reward_badge ? BADGE_CONFIG[challenge.reward_badge] : null;
  const participants = challenge.participants || [];

  const progressPct = challenge.goal > 0 && challenge.completed_count != null
    ? Math.min(100, Math.round((challenge.completed_count / (challenge.goal || 1)) * 100))
    : null;

  const meta = [
    `Goal ${challenge.goal?.toLocaleString() ?? '—'} ${cfg.unit}`,
    challenge.end_date ? `ends ${format(parseISO(challenge.end_date), 'MMM d')}` : null,
    participants.length > 0 ? `${participants.length} joined` : null,
    rewardBadge ? `${rewardBadge.label} badge for finishers` : null,
  ].filter(Boolean).join(' · ');

  let status = 'Off';
  if (isActive && daysLeft !== null) status = daysLeft <= 0 ? 'Ends today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  else if (challenge.is_active) status = 'Ended';

  return (
    <li className={cn('py-4', !isActive && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">{challenge.title}</p>
          <p className="text-[13px] text-muted-foreground">{cfg.label} challenge</p>
        </div>
        <span className={cn('text-[13px] font-semibold whitespace-nowrap', isActive && daysLeft !== null && daysLeft <= 2 ? 'text-warning' : isActive ? 'text-foreground' : 'text-muted-foreground')}>
          {status}
        </span>
      </div>

      {challenge.description && <p className="text-sm text-foreground/80 mt-1.5">{challenge.description}</p>}

      {progressPct !== null && (
        <div className="mt-3">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">{challenge.completed_count || 0} of {challenge.goal} {cfg.unit}, {progressPct}%</p>
        </div>
      )}

      <p className="text-[13px] text-muted-foreground mt-2">{meta}</p>

      {isCoach && (
        <div className="flex items-center gap-4 mt-3">
          <button onClick={() => onToggle(challenge)} className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
            {challenge.is_active ? 'Turn off' : 'Turn on'}
          </button>
          <button onClick={() => onDelete(challenge.id)} className="text-sm font-semibold text-destructive underline underline-offset-4 decoration-1 hover:decoration-2">
            Delete
          </button>
        </div>
      )}
    </li>
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

  const toggle = (ch) => updateMutation.mutate({ id: ch.id, data: { is_active: !ch.is_active } });
  const remove = (id) => deleteMutation.mutate(id);

  return (
    <div className="space-y-5">
      <Panel>
        {!compact && (
          <PanelHeader
            title="Running now"
            subtitle={active.length ? `${active.length} active` : undefined}
            right={isCoach ? <Button size="sm" onClick={() => setShowForm(true)}><Plus /> New challenge</Button> : null}
          />
        )}
        {shownActive.length === 0 ? (
          <EmptyState
            title="No challenges running"
            body={isCoach && !compact ? 'A two-week workout or step challenge is an easy way to get the group moving.' : undefined}
          />
        ) : (
          <ul className={cn('divide-y divide-border px-5 sm:px-6', compact && 'px-5 sm:px-5')}>
            {shownActive.map(c => (
              <ChallengeCard key={c.id} challenge={c} isCoach={isCoach} onToggle={toggle} onDelete={remove} />
            ))}
          </ul>
        )}
      </Panel>

      {!compact && past.length > 0 && (
        <Panel>
          <PanelHeader title="Past challenges" />
          <ul className="divide-y divide-border px-5 sm:px-6">
            {past.map(c => (
              <ChallengeCard key={c.id} challenge={c} isCoach={isCoach} onToggle={toggle} onDelete={remove} />
            ))}
          </ul>
        </Panel>
      )}

      {/* Create Challenge Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New challenge</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Seven workouts in seven days" />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Log a workout every day this week" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Goal ({TYPE_CONFIG[form.type]?.unit})</Label>
                <Input className="mt-1" required type="number" value={form.goal} onChange={e => setForm(f => ({...f, goal: e.target.value}))} placeholder="5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts</Label>
                <Input className="mt-1" type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
              </div>
              <div>
                <Label>Ends</Label>
                <Input className="mt-1" required type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
              </div>
            </div>
            <div>
              <Label>Reward badge, optional</Label>
              <Select value={form.reward_badge} onValueChange={v => setForm(f => ({...f, reward_badge: v}))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No reward" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value={null}>No reward</SelectItem>
                  {Object.entries(BADGE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Create challenge</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}