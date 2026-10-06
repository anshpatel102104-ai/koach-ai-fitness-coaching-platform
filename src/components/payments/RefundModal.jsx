import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money } from '@/components/business/ui';

const REFUND_REASONS = [
  'Client request',
  'Service not delivered',
  'Duplicate charge',
  'Goodwill gesture',
  'Other',
];

export default function RefundModal({ payment, onClose, onConfirm }) {
  const [type, setType] = useState('full');
  const [partialAmt, setPartialAmt] = useState('');
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [note, setNote] = useState('');

  const refundAmt = type === 'full' ? Number(payment.amount) : Number(partialAmt || 0);
  const valid = reason && (type === 'full' || (partialAmt && Number(partialAmt) > 0 && Number(partialAmt) <= Number(payment.amount)));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:p-0 sm:max-w-[460px] sm:flex sm:flex-col sm:gap-0 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <div>
            <DialogTitle className="text-[22px] text-foreground">Refund {payment.client_name?.split(" ")[0]}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{payment.client_name} paid {money(payment.amount, { cents: true })}</p>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {[['full', 'Full refund', money(payment.amount, { cents: true })], ['partial', 'Part refund', 'Choose an amount']].map(([v, label, sub]) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={cn(
                  'touch-compact rounded-lg border px-3 py-2.5 text-left transition-colors',
                  type === v ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-foreground hover:bg-accent'
                )}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className={cn('block text-[13px]', type === v ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{sub}</span>
              </button>
            ))}
          </div>

          {type === 'partial' && (
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" value={partialAmt} onChange={e => setPartialAmt(e.target.value)}
                  placeholder={`Up to ${Number(payment.amount).toFixed(2)}`} className="pl-7" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Choose a reason" /></SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {reason === 'Other' && (
            <div className="space-y-1.5">
              <Label>What happened</Label>
              <Input value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="One line is enough" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Note to self <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Only you see this" rows={2} />
          </div>

          <p className="text-[13px] text-muted-foreground border-l-2 border-destructive pl-3">
            <span className="text-destructive font-semibold">Refunding {money(refundAmt, { cents: true })} can't be undone.</span>{' '}
            The client is emailed, and banks take 5 to 10 business days.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!valid}
            onClick={() => valid && onConfirm({ type, amount: refundAmt, reason: reason === 'Other' ? otherReason : reason, note })}
          >
            Refund {money(refundAmt, { cents: true })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
