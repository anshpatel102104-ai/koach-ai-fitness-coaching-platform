import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TagInput from './TagInput';
import { Mail } from 'lucide-react';

const goals = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'general_fitness', label: 'General fitness' },
];

const lifecycleStatuses = [
  { value: 'lead',      label: 'Lead' },
  { value: 'active',    label: 'Active' },
  { value: 'at_risk',   label: 'At risk' },
  { value: 'completed', label: 'Completed' },
  { value: 'alumni',    label: 'Alumni' },
];

const defaultForm = {
  name: '', email: '', phone: '', goal: 'general_fitness',
  lifecycle_status: 'lead', tags: [],
  current_weight: '', target_weight: '', height: '', monthly_rate: '',
  notes: '', lifecycle_notes: '', start_date: '',
};

export default function ClientForm({ open, onOpenChange, onSubmit, client }) {
  const [form, setForm] = useState(defaultForm);
  const [sendInvite, setSendInvite] = useState(true);

  useEffect(() => {
    setForm(client ? { ...defaultForm, ...client, tags: client.tags || [] } : defaultForm);
    setSendInvite(!client); // default ON for new clients only
  }, [client, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      current_weight: form.current_weight ? Number(form.current_weight) : undefined,
      target_weight: form.target_weight ? Number(form.target_weight) : undefined,
      monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : undefined,
    }, sendInvite);
    onOpenChange(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? `Edit ${client.name || 'client'}` : 'Invite a client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>

            {/* Lifecycle Status */}
            <div>
              <Label>Lifecycle status</Label>
              <Select value={form.lifecycle_status} onValueChange={v => set('lifecycle_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lifecycleStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal</Label>
              <Select value={form.goal} onValueChange={v => set('goal', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {goals.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start date</Label>
              <Input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Monthly rate ($)</Label>
              <Input type="number" value={form.monthly_rate} onChange={e => set('monthly_rate', e.target.value)} />
            </div>
            <div>
              <Label>Current weight (lbs)</Label>
              <Input type="number" value={form.current_weight} onChange={e => set('current_weight', e.target.value)} />
            </div>
            <div>
              <Label>Target weight (lbs)</Label>
              <Input type="number" value={form.target_weight} onChange={e => set('target_weight', e.target.value)} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-1.5 block">Tags</Label>
            <TagInput tags={form.tags} onChange={v => set('tags', v)} />
            <p className="text-[11px] text-muted-foreground mt-1">Press enter or comma to add a tag</p>
          </div>

          <div>
            <Label>Coach notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Journey notes</Label>
            <Textarea value={form.lifecycle_notes || ''} onChange={e => set('lifecycle_notes', e.target.value)} rows={2} placeholder="Notes about this client's progress and status changes..." />
          </div>

          {/* Invite toggle — only shown when adding a new client */}
          {!client && (
            <div
              onClick={() => setSendInvite(v => !v)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${sendInvite ? 'bg-accent border-primary' : 'bg-muted border-border'}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${sendInvite ? 'bg-primary/10' : 'bg-border'}`}>
                <Mail className={`w-4 h-4 ${sendInvite ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${sendInvite ? 'text-foreground' : 'text-muted-foreground'}`}>Send invite email</p>
                <p className="text-xs text-muted-foreground">Client receives a welcome email to set up their profile</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${sendInvite ? 'bg-primary border-primary' : 'bg-card border-muted-foreground'}`}>
                {sendInvite && <div className="w-2 h-2 rounded-full bg-card" />}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{client ? 'Update' : sendInvite ? 'Add and send invite' : 'Add client'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}