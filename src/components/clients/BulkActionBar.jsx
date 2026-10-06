import React, { useState } from 'react';
import { MessageSquare, ClipboardCheck, Flame, X, Loader2, Dumbbell, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

function CalorieAdjust({ selectedClients, onDone }) {
  const [saving, setSaving] = useState(false);
  const adjust = async (delta) => {
    setSaving(true);
    let updated = 0;
    for (const client of selectedClients) {
      if (!client.assigned_nutrition_id) continue;
      const plans = await db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id });
      const plan = plans[0];
      if (plan) {
        const newCals = Math.max(1000, (plan.calories || 2000) + delta);
        await db.entities.NutritionPlan.update(plan.id, { calories: newCals });
        await db.entities.Message.create({
          client_id: client.id, client_name: client.name, sender: 'coach',
          content: `Your daily calorie target has been updated to ${newCals} kcal (${delta > 0 ? '+' : ''}${delta} adjustment).`,
          tag: 'nutrition', is_read: false,
        });
        updated++;
      }
    }
    setSaving(false);
    toast.success(`Calories adjusted for ${updated} client${updated !== 1 ? 's' : ''}`);
    onDone();
  };
  return (
    <div className="pt-1 space-y-2">
      <p className="text-[13px] text-muted-foreground">Adjust daily calories for {selectedClients.length} clients. Each one gets a message about the change.</p>
      <div className="grid grid-cols-4 gap-2">
        {[[-250, '−250'], [-150, '−150'], [+150, '+150'], [+250, '+250']].map(([d, l]) => (
          <button key={d} onClick={() => adjust(d)} disabled={saving}
            className="h-10 rounded-md text-sm font-semibold border border-border bg-card text-foreground hover:bg-accent tabular-nums transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : l}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssignProgram({ selectedClients, onDone }) {
  const [saving, setSaving] = useState(false);
  const [programId, setProgramId] = useState('');
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-bulk'],
    queryFn: () => db.entities.WorkoutProgram.list('-created_date', 50),
  });
  const assign = async () => {
    if (!programId) return;
    setSaving(true);
    await Promise.all(selectedClients.map(c => db.entities.Client.update(c.id, { assigned_program_id: programId })));
    setSaving(false);
    toast.success(`Program assigned to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`);
    onDone();
  };
  return (
    <div className="pt-1 space-y-2">
      <p className="text-[13px] text-muted-foreground">Assign one program to {selectedClients.length} clients.</p>
      <select
        value={programId}
        onChange={e => setProgramId(e.target.value)}
        className="w-full h-10 text-sm bg-card border border-input rounded-md px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Select a program…</option>
        {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <button
        onClick={assign}
        disabled={saving || !programId}
        className="w-full h-10 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Dumbbell className="w-3 h-3" />}
        {saving ? 'Assigning' : 'Assign program'}
      </button>
    </div>
  );
}

function AddTag({ selectedClients, onDone }) {
  const [saving, setSaving] = useState(false);
  const [tagVal, setTagVal] = useState('');
  const QUICK_TAGS = ['VIP', 'Fat Loss', 'Muscle gain', 'Hybrid Program', 'At Risk', 'New Client'];
  const applyTag = async (tag) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t) return;
    setSaving(true);
    await Promise.all(selectedClients.map(c => {
      const existing = c.tags || [];
      if (existing.includes(t)) return Promise.resolve();
      return db.entities.Client.update(c.id, { tags: [...existing, t] });
    }));
    setSaving(false);
    setTagVal('');
    toast.success(`Tag #${t} added to ${selectedClients.length} clients`);
    onDone();
  };
  return (
    <div className="pt-1 space-y-2">
      <p className="text-[13px] text-muted-foreground">Tag {selectedClients.length} clients.</p>
      <div className="flex flex-wrap gap-1">
        {QUICK_TAGS.map(t => (
          <button key={t} onClick={() => applyTag(t)} disabled={saving}
            className="text-[13px] font-medium px-2.5 h-8 rounded-md border border-border bg-card text-foreground hover:bg-accent transition-colors">
            #{t}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={tagVal}
          onChange={e => setTagVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyTag(tagVal)}
          placeholder="Your own tag"
          className="flex-1 h-9 text-sm bg-card border border-input rounded-md px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <button onClick={() => applyTag(tagVal)} disabled={saving || !tagVal.trim()}
          className="px-3 h-9 rounded-md text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-40">
          Add
        </button>
      </div>
    </div>
  );
}

export default function BulkActionBar({ selectedIds, clients, allCheckIns, onClear, onRefresh }) {
  const [panel, setPanel] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  const selectedClients = clients.filter(c => selectedIds.has(c.id));
  const count = selectedClients.length;
  if (count === 0) return null;

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    await Promise.all(selectedClients.map(c =>
      db.entities.Message.create({
        client_id: c.id, client_name: c.name, sender: 'coach',
        content: message.trim(), tag: 'general', is_read: false,
      })
    ));
    setSending(false);
    setMessage('');
    setPanel(null);
    toast.success(`Message sent to ${count} client${count !== 1 ? 's' : ''}`);
    onClear();
  };

  const markReviewed = async () => {
    setMarking(true);
    const checkInsToUpdate = selectedClients.flatMap(c => {
      const ci = allCheckIns
        .filter(ci => ci.client_id === c.id && !ci.coach_responded)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return ci ? [ci] : [];
    });
    await Promise.all(checkInsToUpdate.map(ci => db.entities.CheckIn.update(ci.id, { coach_responded: true })));
    setMarking(false);
    toast.success(`Marked ${checkInsToUpdate.length} check-in${checkInsToUpdate.length !== 1 ? 's' : ''} as reviewed`);
    onClear();
  };

  const toggle = (key) => setPanel(p => p === key ? null : key);

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="bg-card ring-1 ring-border rounded-xl w-full max-w-xl pointer-events-auto shadow-[0_8px_24px_rgb(0_0_0/0.12)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[15px] font-semibold text-foreground">{count} client{count !== 1 ? 's' : ''} selected</span>
          <button onClick={onClear} aria-label="Clear selection" className="touch-compact w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { key: 'message', icon: MessageSquare, label: 'Message' },
              { key: 'program', icon: Dumbbell, label: 'Program' },
              { key: 'tag', icon: Tag, label: 'Tag' },
              { key: 'calories', icon: Flame, label: 'Calories' },
              { key: 'reviewed', icon: ClipboardCheck, label: 'Reviewed' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={key === 'reviewed' ? markReviewed : () => toggle(key)}
                disabled={key === 'reviewed' && marking}
                title={key === 'reviewed' ? 'Mark their latest check-in as reviewed' : undefined}
                className={cn('flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[13px] font-medium transition-colors',
                  panel === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent')}
              >
                {key === 'reviewed' && marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {key === 'reviewed' && marking ? 'Saving' : label}
              </button>
            ))}
          </div>

          {panel === 'message' && (
            <div className="space-y-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`One message, sent to each of the ${count} separately`}
                rows={3}
                className="w-full text-sm bg-card border border-input rounded-lg p-3 resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {sending ? 'Sending' : `Send to ${count} client${count !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
          {panel === 'program' && <AssignProgram selectedClients={selectedClients} onDone={() => { setPanel(null); onClear(); onRefresh && onRefresh(); }} />}
          {panel === 'tag' && <AddTag selectedClients={selectedClients} onDone={() => { setPanel(null); onClear(); onRefresh && onRefresh(); }} />}
          {panel === 'calories' && <CalorieAdjust selectedClients={selectedClients} onDone={() => { setPanel(null); onClear(); }} />}
        </div>
      </div>
    </div>
  );
}