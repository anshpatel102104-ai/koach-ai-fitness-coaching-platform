import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2, Edit2, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORY_CONFIG = {
  supplement: { label: '💊 Supplement', color: 'bg-ai/10 text-ai border-ai' },
  vitamin:    { label: '🌞 Vitamin',    color: 'bg-warning/10 text-warning border-warning' },
  mineral:    { label: '🪨 Mineral',    color: 'bg-muted text-foreground border-border' },
  electrolyte:{ label: '⚡ Electrolyte',color: 'bg-accent text-primary border-primary' },
  herb:       { label: '🌿 Herb',       color: 'bg-success/10 text-success border-success' },
  other:      { label: '📦 Other',      color: 'bg-secondary text-muted-foreground border-border' },
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
        <DialogHeader><DialogTitle>{supplement ? 'Edit Supplement' : 'Add Supplement'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 mt-2">
          <div>
            <Label>Name *</Label>
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
              <Label>Default Dosage</Label>
              <Input value={form.default_dosage || ''} onChange={e => set('default_dosage', e.target.value)} placeholder="e.g. 5g, 2000 IU" />
            </div>
          </div>
          <div>
            <Label>Timing</Label>
            <Input value={form.default_timing || ''} onChange={e => set('default_timing', e.target.value)} placeholder="e.g. Post-workout, Morning with food" />
          </div>
          <div>
            <Label>Purpose / Benefits</Label>
            <Textarea rows={2} value={form.purpose || ''} onChange={e => set('purpose', e.target.value)} placeholder="Why this supplement is used…" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={1} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{supplement ? 'Update' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplementCard({ supp, onEdit, onDelete }) {
  const cfg = CATEGORY_CONFIG[supp.category] || CATEGORY_CONFIG.other;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{supp.name}</p>
            <Badge className={cn('text-[10px] border', cfg.color)}>{cfg.label}</Badge>
          </div>
          {supp.default_dosage && <p className="text-xs text-muted-foreground mt-0.5">Dose: <span className="text-foreground font-medium">{supp.default_dosage}</span></p>}
          {supp.default_timing && <p className="text-xs text-muted-foreground">Timing: <span className="text-foreground">{supp.default_timing}</span></p>}
          {supp.purpose && <p className="text-xs text-muted-foreground mt-1">{supp.purpose}</p>}
        </div>
        {!supp.is_preset && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplement-library'] }); toast.success('Supplement added!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.SupplementLibrary.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplement-library'] }); toast.success('Updated!'); },
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
    toast.success('Common supplements added!');
  };

  const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat] = supplements.filter(s => s.category === cat);
    return acc;
  }, {});

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">Build your supplement library to assign to client nutrition plans.</p>
        <div className="flex gap-2">
          {supplements.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedPresets}>⚡ Add Common Supplements</Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Supplement
          </Button>
        </div>
      </div>

      {supplements.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground">No supplements yet</p>
          <p className="text-sm mt-1">Add common supplements or create your own</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={seedPresets}>⚡ Add Common Supplements</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => {
            const items = byCategory[cat];
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cfg.label}</p>
                <div className="space-y-2">
                  {items.map(s => (
                    <SupplementCard
                      key={s.id}
                      supp={s}
                      onEdit={() => { setEditing(s); setShowForm(true); }}
                      onDelete={() => deleteMutation.mutate(s.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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