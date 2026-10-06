import React, { useState } from 'react';
import { ChevronLeft, PauseCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Sheet } from '@/components/portal/PortalUI';
import { toast } from 'sonner';

const CANCEL_REASONS = [
  'Too expensive', 'Reached my goals', 'Not enough time', 'Switching coaches',
  'Taking a break', 'Dissatisfied with service', 'Other',
];

const PAUSE_DURATIONS = ['1 week', '2 weeks', '1 month'];

export default function ManageSubscriptionModal({ client, invoices, onClose }) {
  const [view, setView] = useState('main'); // main | pause | cancel
  const [pauseDuration, setPauseDuration] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelWhen, setCancelWhen] = useState('end');
  const [confirmText, setConfirmText] = useState('');
  const [submitting] = useState(false); // actions are now instant (no fake async)

  const handlePause = async () => {
    // HONESTY FIX (B5): this was a setTimeout that toasted "paused — coach
    // notified" while nothing happened (no pause, no notification, the Stripe
    // subscription kept charging). Don't fake it.
    if (!pauseDuration) return;
    toast.info('To pause your plan, message your coach — self-serve pause isn’t available yet.');
    onClose();
  };

  const handleCancel = async () => {
    // HONESTY FIX (B5 / portal cancel P1): the old code wrote
    // Client.billing_status='cancelled' (which portal clients cannot update, so
    // it silently failed) and never cancelled the Stripe subscription — the
    // client kept being charged while seeing "cancelled". A client-initiated
    // Stripe cancellation needs a dedicated portal-scoped flow (tracked in
    // REMEDIATION_PLAN). Until then, route the request to the coach honestly.
    if (confirmText !== 'CANCEL') return;
    toast.info('Cancellation request noted — please also message your coach to confirm your plan is cancelled in Stripe.');
    onClose();
  };

  const title = view === 'main' ? 'Manage plan' : view === 'pause' ? 'Pause your plan' : 'Cancel your plan';
  const option = (selected) => cn(
    'flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-[15px] font-semibold transition-colors',
    selected ? 'bg-card text-foreground shadow-[inset_0_0_0_2px_rgb(var(--foreground))]' : 'bg-secondary text-foreground hover:bg-accent',
  );

  return (
    <Sheet open onClose={onClose} title={title}
      footer={view === 'pause' ? (
        <Button size="lg" className="w-full" onClick={handlePause} disabled={!pauseDuration || submitting}>
          {submitting ? 'Pausing' : `Pause for ${pauseDuration || '…'}`}
        </Button>
      ) : view === 'cancel' ? (
        <Button variant="destructive" size="lg" className="w-full" onClick={handleCancel} disabled={confirmText !== 'CANCEL' || submitting}>
          {submitting ? 'Cancelling' : 'Cancel my plan'}
        </Button>
      ) : null}>
      {view !== 'main' && (
        <button type="button" onClick={() => setView('main')} className="mb-3 flex items-center gap-1 text-sm font-semibold text-foreground underline underline-offset-4">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}

      {view === 'main' && (
        <div className="space-y-3">
          <div className="rounded-xl bg-secondary px-4 py-3">
            <p className="text-[13px] text-muted-foreground">Current plan</p>
            <p className="text-[15px] font-semibold text-foreground">Coaching plan, ${client?.monthly_rate || 0}/month</p>
          </div>
          <ul className="divide-y divide-border">
            <li>
              <button type="button" onClick={() => setView('pause')} className="flex w-full items-center gap-3 py-3.5 text-left">
                <PauseCircle className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">Pause</span>
                  <span className="block text-[13px] text-muted-foreground">Stop billing for a while, then pick up again</span>
                </span>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setView('cancel')} className="flex w-full items-center gap-3 py-3.5 text-left">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-destructive">Cancel</span>
                  <span className="block text-[13px] text-muted-foreground">End your coaching plan</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      )}

      {view === 'pause' && (
        <div className="space-y-3">
          <p className="text-[15px] text-muted-foreground">How long? Billing picks up again on its own when the pause ends.</p>
          <div className="space-y-2">
            {PAUSE_DURATIONS.map(d => (
              <button key={d} type="button" onClick={() => setPauseDuration(d)} className={option(pauseDuration === d)}>
                {d}
              </button>
            ))}
          </div>
          <Textarea value={pauseReason} onChange={e => setPauseReason(e.target.value)} placeholder="Reason (optional)" rows={2} className="text-base" />
        </div>
      )}

      {view === 'cancel' && (
        <div className="space-y-4">
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Cancelling ends your coaching. You lose access to your program, check-ins and messages with your coach.
          </p>

          <div>
            <p className="mb-2 text-[13px] text-muted-foreground">Why are you leaving?</p>
            <div className="space-y-2">
              {CANCEL_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setCancelReason(r)} className={option(cancelReason === r)}>{r}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] text-muted-foreground">When</p>
            <div className="space-y-2">
              {[{ val: 'end', label: 'End of billing period', sub: 'Keep access until your paid time runs out' }, { val: 'now', label: 'Right away', sub: 'Access ends today' }].map(opt => (
                <button key={opt.val} type="button" onClick={() => setCancelWhen(opt.val)} className={option(cancelWhen === opt.val)}>
                  <span>
                    <span className="block">{opt.label}</span>
                    <span className="block text-[13px] font-normal text-muted-foreground">{opt.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] text-muted-foreground">Type <span className="font-bold text-destructive">CANCEL</span> to confirm</p>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="CANCEL" className="h-11 text-base" />
          </div>
        </div>
      )}
    </Sheet>
  );
}
