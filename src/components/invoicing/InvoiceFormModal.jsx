import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money } from '@/components/business/ui';

const today = () => format(new Date(), 'yyyy-MM-dd');
const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return format(d, 'yyyy-MM-dd');
};

function generateInvoiceNumber(existing) {
  const nums = existing.map(i => parseInt((i.invoice_number || '').replace('INV-', '') || '0')).filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `INV-${String(next).padStart(4, '0')}`;
}

export default function InvoiceFormModal({ invoice, onClose, onSave, existingInvoices = [] }) {
  const isEdit = !!invoice?.id;
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-invoice'],
    queryFn: () => db.entities.Client.list('-created_date', 200),
  });

  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number || generateInvoiceNumber(existingInvoices),
    client_id: invoice?.client_id || '',
    client_name: invoice?.client_name || '',
    client_email: invoice?.client_email || '',
    description: invoice?.description || '',
    amount: invoice?.amount || '',
    status: invoice?.status || 'draft',
    type: invoice?.type || 'one_time',
    issue_date: invoice?.issue_date || today(),
    due_date: invoice?.due_date || nextMonth(),
    notes: invoice?.notes || '',
    recurring_interval: invoice?.recurring_interval || 'monthly',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientChange = (clientId) => {
    const c = clients.find(c => c.id === clientId);
    set('client_id', clientId);
    if (c) {
      set('client_name', c.name);
      set('client_email', c.email || '');
      if (!form.amount && c.monthly_rate) set('amount', c.monthly_rate);
    }
  };

  const handleSave = () => {
    if (!form.client_id || !form.amount || !form.due_date) return;
    onSave({ ...form, amount: Number(form.amount) });
  };

  const canSave = !!form.client_id && !!form.amount;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:p-0 sm:max-w-[560px] sm:flex sm:flex-col sm:gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-[13px] text-muted-foreground">{form.invoice_number}</p>
            <DialogTitle className="text-[26px] text-foreground leading-tight">{isEdit ? "Edit invoice" : "New invoice"}</DialogTitle>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Bill to</Label>
              <Select value={form.client_id || undefined} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.client_email && <p className="text-[13px] text-muted-foreground">{form.client_email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>For</Label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Monthly coaching, November" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className="pl-7 tabular-nums" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Billing</Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-off</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'recurring' && (
              <div className="space-y-1.5">
                <Label>Repeats</Label>
                <Select value={form.recurring_interval} onValueChange={v => set('recurring_interval', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Issued</Label>
                <Input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due</Label>
                <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Note on the invoice <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Payment terms, thanks, anything else" rows={3} />
            </div>
          </div>
        </div>

        {/* Footer: total + actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <div className="mr-auto">
            <p className="text-[13px] text-muted-foreground">Total</p>
            <p className="num text-[24px] leading-none text-foreground">{money(form.amount || 0, { cents: true })}</p>
          </div>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Save changes' : 'Create invoice'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
