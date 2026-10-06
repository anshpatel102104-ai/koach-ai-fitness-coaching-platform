import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listProducts, createProduct } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { Panel } from '@/components/kit';
import { toast } from 'sonner';

export default function SubscriptionPlansPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', description: '', interval: 'month' });
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stripe-products'],
    queryFn: listProducts,
    staleTime: 60000,
  });

  const products = data?.products || [];

  const createMutation = useMutation({
    mutationFn: () => createProduct(form.name, parseFloat(form.amount), form.description, form.interval),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-products'] });
      toast.success('Plan created in Stripe');
      setShowCreate(false);
      setForm({ name: '', amount: '', description: '', interval: 'month' });
    },
    onError: () => toast.error('Failed to create plan'),
  });

  const isValid = form.name.trim() && parseFloat(form.amount) > 0;

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] text-foreground">Plans in Stripe</h2>
          <p className="text-sm text-muted-foreground mt-1">Recurring prices you can put clients on.</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} aria-label="Refresh plans">
            <RefreshCw />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus /> New plan
          </Button>
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-3">Loading plans…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No plans yet. Create one for your main coaching offer.</p>
        ) : (
          products.map(p => {
            const price = p.prices?.[0];
            const amount = price ? price.unit_amount / 100 : null;
            const interval = price?.recurring?.interval;
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{p.name}</p>
                  {p.description && <p className="text-[13px] text-muted-foreground truncate">{p.description}</p>}
                </div>
                {amount !== null && (
                  <p className="flex-shrink-0 whitespace-nowrap">
                    <span className="num text-[18px] text-foreground">${amount.toFixed(2)}</span>
                    {interval && <span className="text-[13px] text-muted-foreground"> / {interval}</span>}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Monthly 1:1 Coaching" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Price (USD)</Label>
                <Input type="number" placeholder="299.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Billed</Label>
                <Select value={form.interval} onValueChange={v => setForm(f => ({ ...f, interval: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea className="resize-none" rows={2} placeholder="What's included"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()}
              disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending ? <><Loader2 className="animate-spin" /> Creating…</> : 'Create plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}