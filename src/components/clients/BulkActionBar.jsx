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
    <div className="p-3 bg-orange-500/8 border border-orange-500/20 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-orange-400">Adjust calories for {selectedClients.length} clients</p>
      <div className="grid grid-cols-4 gap-2">
        {[[-250, '−250'], [-150, '−150'], [+150, '+150'], [+250, '+250']].map(([d, l]) => (
          <button key={d} onClick={() => adjust(d)} disabled={saving}
            className={cn('py-2.5 rounded-lg text-xs font-bold border active:scale-95 transition-all',
              d < 0 ? 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20'
                : 'bg-success/10 border-success/20 text-success hover:bg-success/20')}>
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
    <div className="p-3 bg-primary/8 border border-primary/20 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-primary">Assign program to {selectedClients.length} clients</p>
      <select
        value={programId}
        onChange={e => setProgramId(e.target.value)}
        className="w-full text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Select a program…</option>
        {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <button
        onClick={assign}
        disabled={saving || !programId}
        className="w-full py-2 rounded-lg text-xs font-bold bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Dumbbell className="w-3 h-3" />}
        {saving ? 'Assigning…' : 'Assign Program'}
      </button>
    </div>
  );
}

function AddTag({ selectedClients, onDone }) {
  const [saving, setSaving] = useState(false);
  const [tagVal, setTagVal] = useState('');
  const QUICK_TAGS = ['VIP', 'Fat Loss', 'Muscle Gain', 'Hybrid Program', 'At Risk', 'New Client'];
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
    <div className="p-3 bg-ai/8 border border-ai/20 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-ai">Add tag to {selectedClients.length} clients</p>
      <div className="flex flex-wrap gap-1">
        {QUICK_TAGS.map(t => (
          <button key={t} onClick={() => applyTag(t)} disabled={saving}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-ai/10 border border-ai/20 text-ai hover:bg-ai/20 transition-all">
            #{t}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={tagVal}
          onChange={e => setTagVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyTag(tagVal)}
          placeholder="Custom tag…"
          className="flex-1 text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        <button onClick={() => applyTag(tagVal)} disabled={saving || !tagVal.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-ai/20 border border-ai/30 text-ai disabled:opacity-40">
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
      <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 w-full max-w-lg pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold">{count} client{count !== 1 ? 's' : ''} selected</span>
          <button onClick={onClear} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { key: 'message', icon: MessageSquare, label: 'Message', color: 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/20' },
              { key: 'program', icon: Dumbbell, label: 'Program', color: 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/20' },
              { key: 'tag', icon: Tag, label: 'Tag', color: 'text-ai bg-ai/10 border-ai/20 hover:bg-ai/20' },
              { key: 'calories', icon: Flame, label: 'Calories', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20' },
              { key: 'reviewed', icon: ClipboardCheck, label: 'Review', color: 'text-success bg-success/10 border-success/20 hover:bg-success/20' },
            ].map(({ key, icon: Icon, label, color }) => (
              <button
                key={key}
                onClick={key === 'reviewed' ? markReviewed : () => toggle(key)}
                disabled={key === 'reviewed' && marking}
                className={cn('flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95', color, panel === key && 'ring-2 ring-primary/30')}
              >
                {key === 'reviewed' && marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {key === 'reviewed' && marking ? '…' : label}
              </button>
            ))}
          </div>

          {panel === 'message' && (
            <div className="space-y-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Send a message to ${count} client${count !== 1 ? 's' : ''}...`}
                rows={3}
                className="w-full text-sm bg-secondary/40 border border-border rounded-xl p-3 resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {sending ? 'Sending…' : `Send to ${count} Client${count !== 1 ? 's' : ''}`}
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