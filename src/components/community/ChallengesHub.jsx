import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, PanelHeader, Segmented, EmptyState, Initials } from '@/components/kit';
import { format, differenceInDays, isAfter, isBefore, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ── Challenge preset templates ────────────────────────────────────────────────
const CHALLENGE_TEMPLATES = [
  {
    id: 'tpl_7day_workout',
    emoji: '💪',
    title: '7-day workout streak',
    description: 'A workout every day for seven days straight.',
    type: 'workouts',
    goal: 7,
    duration_days: 7,
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_30day_workout',
    emoji: '🏋️',
    title: '30-day training block',
    description: '20 workouts in 30 days. Rest days allowed.',
    type: 'workouts',
    goal: 20,
    duration_days: 30,
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl_steps_10k',
    emoji: '👟',
    title: '10k steps a day',
    description: '10,000 steps a day for two weeks.',
    type: 'steps',
    goal: 70000,
    duration_days: 14,
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_hydration',
    emoji: '💧',
    title: 'Hydration, 21 days',
    description: 'Three litres of water a day for 21 days.',
    type: 'custom',
    goal: 21,
    duration_days: 21,
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_weight_loss',
    emoji: '⚖️',
    title: 'Lose 5 lb in 30 days',
    description: 'Lose 5 lb in 30 days. Weigh in every week.',
    type: 'weight_loss',
    goal: 5,
    duration_days: 30,
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl_streak_21',
    emoji: '🔥',
    title: '21-day habit streak',
    description: 'Log the habit every day for 21 days.',
    type: 'streak',
    goal: 21,
    duration_days: 21,
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl_sleep',
    emoji: '😴',
    title: 'Sleep 8 hours, 14 nights',
    description: 'Eight hours of sleep a night for 14 nights.',
    type: 'custom',
    goal: 14,
    duration_days: 14,
    difficulty: 'Beginner',
  },
  {
    id: 'tpl_nutrition',
    emoji: '🥗',
    title: 'Macros on target, 30 days',
    description: 'Hit macro targets on 20 of the next 30 days.',
    type: 'custom',
    goal: 20,
    duration_days: 30,
    difficulty: 'Advanced',
  },
  {
    id: 'tpl_hiit_blast',
    emoji: '⚡',
    title: 'HIIT week',
    description: 'Five HIIT sessions in seven days.',
    type: 'workouts',
    goal: 5,
    duration_days: 7,
    difficulty: 'Advanced',
  },
];

const TYPE_CONFIG = {
  steps:       { label: 'Steps',       unit: 'steps' },
  workouts:    { label: 'Workouts',    unit: 'sessions' },
  streak:      { label: 'Streak',      unit: 'days' },
  weight_loss: { label: 'Weight loss', unit: 'lb' },
  custom:      { label: 'Custom',      unit: 'units' },
};

const fieldClass = 'w-full h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

// ── Template row ──────────────────────────────────────────────────────────────
function TemplateCard({ tpl, onUse, canUse }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{tpl.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{tpl.description}</p>
        <p className="text-[13px] text-muted-foreground mt-1">
          {tpl.difficulty} · goal {tpl.goal.toLocaleString()} {TYPE_CONFIG[tpl.type]?.unit} · {tpl.duration_days} days
        </p>
      </div>
      {canUse && <Button size="sm" variant="outline" className="flex-shrink-0 self-start sm:self-center" onClick={() => onUse(tpl)}>Use</Button>}
    </li>
  );
}

// ── Live challenge row ────────────────────────────────────────────────────────
function LiveChallengeCard({ challenge, isCoach, clients, groups, onToggle, onDelete }) {
  const isActive = challenge.is_active && challenge.end_date && isAfter(parseISO(challenge.end_date), new Date());
  const daysLeft = challenge.end_date ? differenceInDays(parseISO(challenge.end_date), new Date()) : null;
  const cfg = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.custom;
  const participants = challenge.participants || [];
  const participantClients = clients.filter(c => participants.includes(c.id));
  const challengeGroup = groups.find(g => g.id === challenge.group_id);

  let status = 'Off';
  if (isActive && daysLeft !== null) status = daysLeft <= 0 ? 'Ends today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  else if (challenge.is_active) status = 'Finished';

  const meta = [
    `Goal ${challenge.goal?.toLocaleString() ?? '—'} ${cfg.unit}`,
    challenge.end_date ? `ends ${format(parseISO(challenge.end_date), 'MMM d')}` : null,
    challengeGroup ? `in ${challengeGroup.name}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <li className="py-4 md:grid md:grid-cols-[1fr_220px_120px] md:gap-6 md:items-start">
      <div className={cn('min-w-0', !isActive && 'opacity-70')}>
        <p className="text-[15px] font-semibold text-foreground">{challenge.title}</p>
        {challenge.description && <p className="text-sm text-muted-foreground mt-0.5">{challenge.description}</p>}
        <p className="text-[13px] text-muted-foreground mt-1">{cfg.label} · {meta}</p>
        {isCoach && (
          <div className="flex items-center gap-4 mt-2.5">
            <button onClick={() => onToggle(challenge)} className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
              {challenge.is_active ? 'Turn off' : 'Turn on'}
            </button>
            <button onClick={() => { if (confirm('Delete this challenge?')) onDelete(challenge.id); }} className="text-sm font-semibold text-destructive underline underline-offset-4 decoration-1 hover:decoration-2">
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 md:mt-0">
        {participantClients.length > 0 ? (
          <>
            <div className="flex -space-x-1">
              {participantClients.slice(0, 6).map(c => <Initials key={c.id} name={c.name || ''} size={28} className="ring-2 ring-card" />)}
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">
              {participants.length} taking part{participantClients.length > 6 ? `, including ${participantClients.slice(0, 2).map(c => c.name?.split(' ')[0]).join(' and ')}` : ''}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">{participants.length ? `${participants.length} taking part` : 'Nobody added yet'}</p>
        )}
      </div>
      <p className={cn('text-sm font-semibold mt-2 md:mt-0 md:text-right', isActive && daysLeft !== null && daysLeft <= 2 ? 'text-warning' : isActive ? 'text-foreground' : 'text-muted-foreground')}>
        {status}
      </p>
    </li>
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
          <DialogTitle>{prefill ? 'Start this challenge' : 'New challenge'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Title + Emoji */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Name</label>
            <div className="flex gap-2">
              <input type="text" maxLength={2} value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                className="w-12 h-10 rounded-md border border-input bg-card px-2 text-center text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Icon" />
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Seven workouts in seven days"
                className={cn(fieldClass, 'flex-1')} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">What they need to do</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Log a workout every day this week"
              rows={2}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>

          {/* Type + Goal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={fieldClass}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Goal ({TYPE_CONFIG[form.type]?.unit})
              </label>
              <input required type="number" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                placeholder="7"
                className={fieldClass} />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Starts</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className={fieldClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Ends</label>
              <input required type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className={fieldClass} />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Who takes part</label>
            <div className="flex gap-2 mb-3">
              {[{ key: 'clients', label: 'Pick clients' }, { key: 'group', label: 'A whole group' }].map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => setForm(f => ({ ...f, participant_mode: opt.key }))}
                  className={cn('flex-1 h-10 text-sm font-semibold rounded-md border transition-colors',
                    form.participant_mode === opt.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-card text-foreground hover:bg-accent')}>
                  {opt.label}
                </button>
              ))}
            </div>

            {form.participant_mode === 'clients' && (
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                {clients.length === 0 && <p className="text-sm text-muted-foreground px-3 py-3">No clients yet.</p>}
                {clients.map(c => (
                  <label key={c.id} className={cn('flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                    form.participants.includes(c.id) ? 'bg-accent' : 'hover:bg-accent/50')}>
                    <input type="checkbox" checked={form.participants.includes(c.id)}
                      onChange={() => toggleClient(c.id)}
                      className="accent-[rgb(var(--primary))] w-4 h-4" />
                    <Initials name={c.name || ''} size={28} />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            {form.participant_mode === 'group' && (
              <select value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}
                className={fieldClass}>
                <option value="">Choose a group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({(g.member_ids || []).length} members)</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Start challenge</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ChallengesHub({ isCoach, user }) {
  const [view, setView] = useState('active'); // 'templates' | 'active'
  const [showCreate, setShowCreate] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState(null);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const qc = useQueryClient();


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

  const listPanel = (items, emptyTitle, emptyBody, emptyAction) => (
    <Panel>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
      ) : (
        <>
          <div className="hidden md:grid grid-cols-[1fr_220px_120px] gap-6 px-6 py-3 border-b border-border text-[13px] text-muted-foreground">
            <span>Challenge</span><span>Taking part</span><span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-border px-5 sm:px-6">
            {items.map(c => (
              <LiveChallengeCard key={c.id} challenge={c} isCoach={isCoach}
                clients={clients} groups={groups}
                onToggle={(ch) => updateMutation.mutate({ id: ch.id, data: { is_active: !ch.is_active } })}
                onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        className="mb-0"
        title="Challenges"
        subtitle={active.length
          ? `${active.length} running, ${past.length} finished. Challenges show on each client's app and in their group.`
          : `Nothing running right now. Start one from a template or write your own.`}
        actions={isCoach ? (
          <>
            <Button variant="outline" onClick={() => setView('templates')}>Templates</Button>
            <Button onClick={handleCreateBlank}><Plus /> New challenge</Button>
          </>
        ) : null}
      />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'active', label: 'Running', count: active.length },
          { value: 'templates', label: 'Templates' },
          { value: 'past', label: 'Past', count: past.length },
        ]}
      />

      {view === 'templates' && (
        <Panel>
          <PanelHeader
            title="Templates"
            subtitle={isCoach ? 'Pick one, adjust the dates and who takes part, then start it.' : 'Challenges are started by your coach. Check Running to see what is on now.'}
            right={<Segmented size="sm" value={filterDifficulty} onChange={setFilterDifficulty} options={DIFFICULTIES.map(d => ({ value: d, label: d }))} />}
            className="flex-col sm:flex-row"
          />
          <ul className="divide-y divide-border px-5 sm:px-6 pb-1">
            {filteredTemplates.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} canUse={isCoach} onUse={handleUseTemplate} />
            ))}
          </ul>
        </Panel>
      )}

      {view === 'active' && listPanel(
        active,
        'No challenges running',
        isCoach ? 'A two-week step or workout challenge is a simple way to get people moving.' : undefined,
        isCoach ? <Button variant="outline" onClick={() => setView('templates')}>Browse templates</Button> : null,
      )}

      {view === 'past' && listPanel(past, 'No past challenges yet', 'Finished and switched-off challenges land here.')}

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
