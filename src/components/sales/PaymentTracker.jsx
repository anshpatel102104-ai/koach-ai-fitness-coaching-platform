import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  failed: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};
const STATUS_ICON = { paid: CheckCircle2, pending: Clock, failed: XCircle, refunded: XCircle };

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
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Tracker</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-success font-medium">${totalPaid.toLocaleString()} collected</span>
            <span className="text-xs text-warning font-medium">${totalPending.toLocaleString()} pending</span>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Payment
        </Button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
        ) : payments.map(p => {
          const Icon = STATUS_ICON[p.status] || Clock;
          return (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", STATUS_STYLE[p.status])}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.client_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{p.description || p.type} {p.due_date ? `· Due ${p.due_date}` : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold">${(p.amount || 0).toLocaleString()}</p>
                <div className="flex items-center gap-1 justify-end">
                  <Badge className={cn("text-[10px]", STATUS_STYLE[p.status])}>{p.status}</Badge>
                  {p.status === 'pending' && (
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] text-success px-1"
                      onClick={() => updateMutation.mutate({ id: p.id, data: { status: 'paid', paid_date: new Date().toISOString().split('T')[0] } })}>
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Add Payment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Client *</Label>
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
              <div><Label>Amount ($) *</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
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
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Add Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}