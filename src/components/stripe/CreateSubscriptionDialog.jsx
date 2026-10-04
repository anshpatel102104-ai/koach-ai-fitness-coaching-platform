import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CreateSubscriptionDialog({ open, onOpenChange, clients, onSuccess }) {
  const [form, setForm] = useState({ client_id: '', amount: '', interval: 'month', description: 'Coaching Subscription' });
  const [loading, setLoading] = useState(false);

  const activeClients = clients.filter(c => c.status === 'active' || c.lifecycle_status === 'active');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_id || !form.amount) return;

    const client = clients.find(c => c.id === form.client_id);
    if (!client?.email) {
      toast.error('Selected client has no email address');
      return;
    }

    setLoading(true);
    const res = await db.functions.invoke('stripeCreateSubscription', {
      client_id: form.client_id,
      price_amount: Number(form.amount),
      interval: form.interval,
      client_email: client.email,
      client_name: client.name,
      description: form.description,
    });

    setLoading(false);

    if (res.data?.subscription_id) {
      toast.success('Subscription created in Stripe!');
      onSuccess();
    } else {
      toast.error(res.data?.error || 'Failed to create subscription');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Create Stripe Subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select active client" /></SelectTrigger>
              <SelectContent>
                {activeClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : '⚠ no email'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monthly Amount ($) *</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 250"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Billing Interval</Label>
              <Select value={form.interval} onValueChange={v => setForm({ ...form, interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. 1-on-1 Coaching"
            />
          </div>
          <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
            ⚡ A Stripe subscription will be created. The client must have a valid email. Payment collection requires a payment method via Stripe dashboard or payment link.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Subscription'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}