import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Panel, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CATEGORY_CONFIG = {
  supplement: { label: 'Supplements' },
  vitamin:    { label: 'Vitamins' },
  mineral:    { label: 'Minerals' },
  electrolyte:{ label: 'Electrolytes' },
  herb:       { label: 'Herbs' },
  other:      { label: 'Other' },
};

const PRESETS = [
  { name: 'Creatine Monohydrate', category: 'supplement', default_dosage: '5g', default_timing: 'Post-workout or any time', purpose: 'Increases strength, power output, and muscle mass', is_preset: true },
  { name: 'Vitamin D3', category: 'vitamin', default_dosage: '2000–4000 IU', default_timing: 'Morning with food', purpose: 'Supports bone health, immune function, mood regulation', is_preset: true },
  { name: 'Fish Oil (Omega-3)', category: 'supplement', default_dosage: '2–3g EPA/DHA', default_timing: 'With meals', purpose: 'Anti-inflammatory, heart health, joint recovery', is_preset: true },
  { name: 'Magnesium Glycinate', category: 'mineral', default_dosage: '300–400mg', default_timing: 'Before bed', purpose: 'Sleep quality, muscle recovery, stress reduction', is_preset: true },
  { name: 'Zinc', category: 'mineral', default_dosage: '25–40mg', default_timing: 'With dinner', purpose: 'Testosterone support, immune function, recovery', is_preset: true },
  { name: 'Electrolytes', category: 'electrolyte', default_dosage: 'Per label', default_timing: 'During/after training', purpose: 'Hydration, muscle function, prevents cramping', is_preset: true },
];

const defaultForm = { name: '', category: 'supplement', default_dosage: '', default_timing: '', purpose: '', notes: '' };

function SupplementForm({ open, onOpenChange, supplement, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  React.useEffect(() => { setForm(supplement ? { ...defaultForm, ...supplement } : defaultForm); }, [supplement, open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{supplement ? 'Edit supplement' : 'Add supplement'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 mt-2">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Creatine Monohydrate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Usual dose</Label>
              <Input value={form.default_dosage || ''} onChange={e => set('default_dosage', e.target.value)} placeholder="e.g. 5g, 2000 IU" />
            </div>
          </div>
          <div>
            <Label>Timing</Label>
            <Input value={form.default_timing || ''} onChange={e => set('default_timing', e.target.value)} placeholder="e.g. Post-workout, Morning with food" />
          </div>
          <div>
            <Label>What it's for</Label>
            <Textarea rows={2} value={form.purpose || ''} onChange={e => set('purpose', e.target.value)} placeholder="Why this supplement is used…" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={1} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{supplement ? 'Save changes' : 'Add supplement'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplementCard({ supp, onEdit, onDelete }) {
  const line = [supp.default_dosage, supp.default_timing].filter(Boolean).join(', ');
  return (
    <div className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-semibold text-foreground">{supp.name}</p>
          {line && <p className="text-sm text-foreground/80 text-right">{line}</p>}
        </div>
        {supp.purpose && <p className="text-[13px] text-muted-foreground mt-0.5">{supp.purpose}</p>}
      </div>
      {!supp.is_preset && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit} aria-label="Edit supplement" className="touch-compact p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"><Edit2 className="w-4 h-4" /></button>
          <button onClick={onDelete} aria-label="Delete supplement" className="touch-compact p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent rounded-md"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

export default function SupplementsSection() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: supplements = [], isLoading } = useQuery({
    queryKey: ['supplement-library'],
    queryFn: () => db.entities.SupplementLibrary.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.SupplementLibrary.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplement-library'] }); toast.success('Supplement added'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.SupplementLibrary.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplement-library'] }); toast.success('Supplement updated'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.SupplementLibrary.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplement-library'] }); toast.success('Removed'); },
  });

  const seedPresets = async () => {
    for (const p of PRESETS) {
      const exists = supplements.find(s => s.name === p.name);
      if (!exists) await db.entities.SupplementLibrary.create(p);
    }
    qc.invalidateQueries({ queryKey: ['supplement-library'] });
    toast.success('Common supplements added');
  };

  const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat] = supplements.filter(s => s.category === cat);
    return acc;
  }, {});

  if (isLoading) return <Panel className="h-40 animate-pulse" aria-hidden />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Supplements you can add to a client's plan, with your usual dose and timing.</p>
        <div className="flex gap-2">
          {supplements.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedPresets}>Add common supplements</Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus /> Add supplement
          </Button>
        </div>
      </div>

      {supplements.length === 0 ? (
        <Panel>
          <EmptyState
            title="No supplements yet."
            body="Start with creatine, vitamin D, fish oil and a few other basics, or add your own."
            action={<Button variant="outline" size="sm" onClick={seedPresets}>Add common supplements</Button>}
          />
        </Panel>
      ) : (
        Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => {
          const items = byCategory[cat];
          if (!items.length) return null;
          return (
            <Panel key={cat} className="overflow-hidden">
              <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
                <h2 className="text-[20px] text-foreground">{cfg.label}</h2>
                <span className="text-[13px] text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <div className="border-t border-border">
                {items.map(s => (
                  <SupplementCard
                    key={s.id}
                    supp={s}
                    onEdit={() => { setEditing(s); setShowForm(true); }}
                    onDelete={() => deleteMutation.mutate(s.id)}
                  />
                ))}
              </div>
            </Panel>
          );
        })
      )}

      <SupplementForm
        open={showForm}
        onOpenChange={setShowForm}
        supplement={editing}
        onSubmit={(data) => {
          if (editing) updateMutation.mutate({ id: editing.id, data });
          else createMutation.mutate(data);
          setShowForm(false);
        }}
      />
    </div>
  );
}