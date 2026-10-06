import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Panel, PanelHeader, Stat, EmptyState } from '@/components/kit';

const STATUS_BADGE = { paid: 'success', pending: 'warning', failed: 'destructive', refunded: 'secondary' };
const TYPE_LABEL = { monthly: 'Monthly', one_time: 'One-time', upsell: 'Upsell' };

export default function PaymentTracker({ clients }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: '', amount: '', type: 'monthly', description: '', status: 'pending', due_date: '' });
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => db.entities.Payment.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (d) => db.entities.Payment.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Payment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === form.client_id);
    createMutation.mutate({ ...form, amount: Number(form.amount), client_name: client?.name || '' });
  };

  return (
    <Panel>
      <PanelHeader
        title="Payments"
        subtitle="Manual payments you track outside Stripe. The last 50 are shown."
        right={<Button size="sm" onClick={() => setShowForm(true)}><Plus /> Add payment</Button>}
      />
      <div className="grid grid-cols-2 gap-6 px-5 sm:px-6 pb-5 border-b border-border">
        <Stat label="Collected" value={`$${totalPaid.toLocaleString()}`} />
        <Stat label="Pending" value={`$${totalPending.toLocaleString()}`} tone={totalPending > 0 ? 'warning' : undefined} />
      </div>

      {payments.length === 0 ? (
        <EmptyState title="No payments recorded yet" body="Add one when a client pays you by bank transfer, cash or another app." />
      ) : (
        <ul className="divide-y divide-border px-5 sm:px-6 max-h-[480px] overflow-y-auto">
          {payments.map(p => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate">{p.client_name || 'Unknown client'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {p.description || TYPE_LABEL[p.type] || p.type}{p.due_date ? `, due ${p.due_date}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {p.status === 'pending' && (
                  <button
                    className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
                    onClick={() => updateMutation.mutate({ id: p.id, data: { status: 'paid', paid_date: new Date().toISOString().split('T')[0] } })}
                  >
                    Mark paid
                  </button>
                )}
                <Badge variant={STATUS_BADGE[p.status] || 'secondary'} className="capitalize">{p.status}</Badge>
                <span className="num text-lg w-20 text-right">${(p.amount || 0).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add payment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.status === 'active').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Add payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}