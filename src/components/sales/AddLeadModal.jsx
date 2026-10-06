import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KANBAN_STAGES } from './KanbanBoard';

const DEFAULT = {
  name: '', email: '', phone: '', instagram: '',
  source: 'instagram', stage: 'new_lead',
  deal_value: '', goal: '', notes: '',
};

export default function AddLeadModal({ open, onOpenChange, onSubmit, lead, initialStage }) {
  const [form, setForm] = useState(DEFAULT);

  useEffect(() => {
    if (lead) setForm({ ...DEFAULT, ...lead, deal_value: lead.deal_value || '' });
    else setForm({ ...DEFAULT, stage: initialStage || 'new_lead' });
  }, [lead, open, initialStage]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      deal_value: Number(form.deal_value) || 0,
      stage_changed_at: new Date().toISOString(),
      lead_score: 50,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit lead' : 'Add a lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Sarah Johnson" />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="sarah@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 0123" />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input className="mt-1" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@username" />
            </div>
            <div>
              <Label>Value ($ per month)</Label>
              <Input className="mt-1" type="number" min="0" value={form.deal_value} onChange={e => set('deal_value', e.target.value)} placeholder="500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram DM</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="store_purchase">Store purchase</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="cold_outreach">Cold outreach</SelectItem>
                  <SelectItem value="dm">DM (other)</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={v => set('stage', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Their goal</Label>
            <Input className="mt-1" value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="Lose 20 lb before summer" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Where they came from, what they asked, anything to remember" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">
              {lead ? 'Save changes' : 'Add lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}