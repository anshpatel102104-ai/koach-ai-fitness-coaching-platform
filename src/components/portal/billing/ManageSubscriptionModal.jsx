import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, PauseCircle, XCircle } from 'lucide-react';
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28 }}
        className="w-full overflow-y-auto"
        style={{ background: 'rgb(var(--sidebar))', borderRadius: '24px 24px 0 0', maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 pb-5">
          <div className="flex items-center gap-3">
            {view !== 'main' && (
              <button onClick={() => setView('main')} className="text-white/40 hover:text-white/70">←</button>
            )}
            <h2 className="text-white font-bold text-lg">
              {view === 'main' ? 'Manage Subscription' : view === 'pause' ? 'Pause Subscription' : 'Cancel Subscription'}
            </h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="px-5 pb-10">
          {view === 'main' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">Current plan</p>
                <p className="text-white font-bold">Coaching Plan</p>
                <p className="text-white/40 text-sm mt-0.5">${client?.monthly_rate || 0}/month · Active</p>
              </div>

              <button onClick={() => setView('pause')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
                style={{ background: 'rgb(var(--warning) / 0.08)', border: '1px solid rgb(var(--warning) / 0.2)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--warning) / 0.15)' }}>
                  <PauseCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Pause Subscription</p>
                  <p className="text-white/40 text-xs mt-0.5">Temporarily pause billing — resume anytime</p>
                </div>
              </button>

              <button onClick={() => setView('cancel')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
                style={{ background: 'rgb(var(--destructive) / 0.08)', border: '1px solid rgb(var(--destructive) / 0.2)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--destructive) / 0.15)' }}>
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-destructive font-semibold text-sm">Cancel Subscription</p>
                  <p className="text-white/40 text-xs mt-0.5">End your coaching plan</p>
                </div>
              </button>
            </div>
          )}

          {view === 'pause' && (
            <div className="space-y-4">
              <p className="text-white/50 text-sm">Select how long to pause your subscription. Billing will resume automatically after the pause period.</p>
              <div className="space-y-2">
                {PAUSE_DURATIONS.map(d => (
                  <button key={d} onClick={() => setPauseDuration(d)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl text-sm font-semibold"
                    style={{ background: pauseDuration === d ? 'rgb(var(--primary) / 0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${pauseDuration === d ? 'rgb(var(--primary) / 0.3)' : 'rgba(255,255,255,0.08)'}`, color: pauseDuration === d ? 'rgb(var(--primary))' : 'rgba(255,255,255,0.7)' }}>
                    {d}
                    {pauseDuration === d && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-card" /></div>}
                  </button>
                ))}
              </div>
              <textarea value={pauseReason} onChange={e => setPauseReason(e.target.value)} placeholder="Reason (optional)" rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <button onClick={handlePause} disabled={!pauseDuration || submitting}
                className="w-full py-4 rounded-2xl text-sm font-bold transition-all"
                style={{ background: pauseDuration ? 'rgb(var(--warning) / 0.2)' : 'rgba(255,255,255,0.05)', color: pauseDuration ? 'rgb(var(--warning))' : 'rgba(255,255,255,0.2)', border: `1px solid ${pauseDuration ? 'rgb(var(--warning) / 0.3)' : 'transparent'}` }}>
                {submitting ? 'Pausing...' : `Pause for ${pauseDuration || '...'}`}
              </button>
            </div>
          )}

          {view === 'cancel' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: 'rgb(var(--destructive) / 0.1)', border: '1px solid rgb(var(--destructive) / 0.2)' }}>
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-destructive text-sm">Cancelling will end your coaching relationship. You'll lose access to your program, check-ins, and coaching support.</p>
              </div>

              <div className="space-y-2">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Reason for cancelling</p>
                {CANCEL_REASONS.map(r => (
                  <button key={r} onClick={() => setCancelReason(r)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: cancelReason === r ? 'rgb(var(--destructive) / 0.12)' : 'rgba(255,255,255,0.04)', color: cancelReason === r ? 'rgb(var(--destructive))' : 'rgba(255,255,255,0.5)', border: `1px solid ${cancelReason === r ? 'rgb(var(--destructive) / 0.25)' : 'transparent'}` }}>
                    {r}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Effective date</p>
                {[{ val: 'end', label: 'End of billing period', sub: 'Keep access until your paid period ends' }, { val: 'now', label: 'Immediately', sub: 'Lose access right away' }].map(opt => (
                  <button key={opt.val} onClick={() => setCancelWhen(opt.val)}
                    className="w-full text-left p-3 rounded-xl text-sm"
                    style={{ background: cancelWhen === opt.val ? 'rgb(var(--destructive) / 0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cancelWhen === opt.val ? 'rgb(var(--destructive) / 0.2)' : 'transparent'}` }}>
                    <p className="text-white font-semibold">{opt.label}</p>
                    <p className="text-white/30 text-xs mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>

              <div>
                <p className="text-white/50 text-xs mb-2">Type <span className="text-destructive font-bold">CANCEL</span> to confirm</p>
                <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type CANCEL"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${confirmText === 'CANCEL' ? 'rgb(var(--destructive) / 0.4)' : 'rgba(255,255,255,0.1)'}` }} />
              </div>

              <button onClick={handleCancel} disabled={confirmText !== 'CANCEL' || submitting}
                className="w-full py-4 rounded-2xl text-sm font-bold"
                style={{ background: confirmText === 'CANCEL' ? 'rgb(var(--destructive) / 0.2)' : 'rgba(255,255,255,0.05)', color: confirmText === 'CANCEL' ? 'rgb(var(--destructive))' : 'rgba(255,255,255,0.2)', border: `1px solid ${confirmText === 'CANCEL' ? 'rgb(var(--destructive) / 0.3)' : 'transparent'}` }}>
                {submitting ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}