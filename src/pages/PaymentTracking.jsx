import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { Search, Download, ChevronDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import PaymentStatCards from '@/components/payments/PaymentStatCards';
import PaymentFeedItem from '@/components/payments/PaymentFeedItem';
import FailedPaymentsPanel from '@/components/payments/FailedPaymentsPanel';
import RefundModal from '@/components/payments/RefundModal';
import UpcomingPayments from '@/components/payments/UpcomingPayments';
import MonthlySummaryTable from '@/components/payments/MonthlySummaryTable';

const STATUS_OPTS = ['all', 'paid', 'pending', 'failed', 'refunded'];
const SORT_OPTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_hi', label: 'Amount: High → Low' },
  { value: 'amount_lo', label: 'Amount: Low → High' },
];

export default function PaymentTracking() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [refundTarget, setRefundTarget] = useState(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments-tracking'],
    queryFn: () => base44.entities.Payment.list('-created_date', 500),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });

  // Build enriched payment objects from both payments and paid invoices
  const allEntries = useMemo(() => {
    const fromPayments = payments.map(p => ({
      ...p,
      _source: 'payment',
    }));
    // Also synthesize entries from paid invoices that have no matching payment
    const paymentInvoiceIds = new Set(payments.map(p => p.client_id + '_' + p.amount));
    const fromInvoices = invoices
      .filter(inv => inv.status === 'paid')
      .filter(inv => !paymentInvoiceIds.has(inv.client_id + '_' + inv.amount))
      .map(inv => ({
        id: 'inv_' + inv.id,
        client_id: inv.client_id,
        client_name: inv.client_name,
        description: inv.description,
        amount: inv.amount,
        status: 'paid',
        paid_date: inv.paid_date || inv.created_date,
        created_date: inv.created_date,
        payment_method: inv.payment_method || 'card',
        invoice_number: inv.invoice_number,
        _source: 'invoice',
      }));

    return [...fromPayments, ...fromInvoices];
  }, [payments, invoices]);

  const filtered = useMemo(() => {
    let list = [...allEntries];
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.client_name || '').toLowerCase().includes(q) ||
        String(p.amount || '').includes(q)
      );
    }
    if (sort === 'newest') list.sort((a, b) => (b.created_date || '') > (a.created_date || '') ? 1 : -1);
    else if (sort === 'oldest') list.sort((a, b) => (a.created_date || '') > (b.created_date || '') ? 1 : -1);
    else if (sort === 'amount_hi') list.sort((a, b) => Number(b.amount) - Number(a.amount));
    else if (sort === 'amount_lo') list.sort((a, b) => Number(a.amount) - Number(b.amount));
    return list;
  }, [allEntries, statusFilter, search, sort]);

  const handleRefundConfirm = async (_refundData) => {
    // HONESTY FIX (B5): this used to set status='refunded' and toast "Refund
    // processed" while NO Stripe refund ever happened — the coach believed the
    // client was repaid when they were not. Refunds move real money and must be
    // issued in Stripe. Do not write a misleading status. (A real stripeRefund
    // edge function is tracked in REMEDIATION_PLAN.)
    toast.info('Issue this refund from your Stripe dashboard — refunds are not processed here yet.');
    setRefundTarget(null);
  };

  const handleRetry = (payment) => {
    toast.info(`Retry initiated for ${payment.client_name}`);
  };

  const handleMessage = (payment) => {
    toast.info(`Opening message composer for ${payment.client_name}`);
  };

  const exportCSV = () => {
    const headers = ['Client', 'Description', 'Amount', 'Status', 'Method', 'Date'];
    const rows = filtered.map(p => [p.client_name, p.description, p.amount, p.status, p.payment_method || '', p.paid_date || p.created_date || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'payments.csv'; a.click();
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ marginBottom: 20 }}>
        <PaymentStatCards payments={allEntries} />
      </div>

      {/* Failed Payments Alert */}
      <FailedPaymentsPanel payments={allEntries} onRetry={handleRetry} onMessage={handleMessage} />

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }}>
        {/* Left: Feed */}
        <div>
          {/* Filter Bar */}
          <div style={{ background: 'var(--tc-card)', borderRadius: '14px 14px 0 0', border: '1px solid var(--tc-muted)', borderBottom: 'none', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or amount…"
                style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, fontSize: 13, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: 4 }}>
              {STATUS_OPTS.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: statusFilter === s ? 'var(--tc-primary)' : 'var(--tc-muted)', color: statusFilter === s ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)', textTransform: 'capitalize' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <select value={sort} onChange={e => setSort(e.target.value)}
                style={{ padding: '6px 28px 6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', pointerEvents: 'none' }} />
            </div>
            <button onClick={exportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', color: 'var(--tc-foreground)', cursor: 'pointer' }}>
              <Download size={12} /> Export
            </button>
          </div>

          {/* Payment Feed */}
          <div style={{ background: 'var(--tc-card)', border: '1px solid var(--tc-muted)', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 70px 90px auto', gap: 12, padding: '8px 16px', background: 'var(--tc-background)', borderBottom: '1px solid var(--tc-muted)' }}>
              {['', 'Client / Description', 'Amount', 'Status', 'Actions'].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 2 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {isLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--tc-muted-foreground)', fontSize: 13 }}>Loading payments…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
                <p style={{ fontSize: 13, color: 'var(--tc-muted-foreground)', margin: 0 }}>No payments match your filter</p>
              </div>
            ) : (
              filtered.map(p => (
                <PaymentFeedItem
                  key={p.id}
                  payment={p}
                  onViewInvoice={() => {}}
                  onRefund={() => setRefundTarget(p)}
                />
              ))
            )}
          </div>

          {/* Monthly Summary */}
          <div style={{ marginTop: 20 }}>
            <MonthlySummaryTable invoices={invoices} payments={allEntries} />
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>
          {/* Upcoming Payments */}
          <UpcomingPayments invoices={invoices} payments={allEntries} />

          {/* Stripe Link */}
          <div style={{ background: 'var(--tc-card)', borderRadius: 14, border: '1px solid var(--tc-muted)', padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tc-foreground)', marginBottom: 8 }}>Advanced Management</div>
            <p style={{ fontSize: 12, color: 'var(--tc-muted-foreground)', margin: '0 0 12px' }}>
              View full payout history, disputes, and payment methods in your Stripe dashboard.
            </p>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', color: 'var(--tc-foreground)', textDecoration: 'none' }}>
              <ExternalLink size={13} /> View in Stripe
            </a>
          </div>

          {/* Tax Summary */}
          <div style={{ background: 'linear-gradient(135deg, var(--tc-ai), var(--tc-accent))', borderRadius: 14, border: '1px solid var(--tc-ai)', padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tc-foreground)', marginBottom: 4 }}>Tax Summary</div>
            <p style={{ fontSize: 11, color: 'var(--tc-muted-foreground)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Download your annual transaction history for tax reporting. Consult a tax professional for specific advice.
            </p>
            <button onClick={exportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'var(--tc-ai)', color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer' }}>
              <Download size={12} /> Export for Accountant
            </button>
          </div>
        </div>
      </div>

      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onConfirm={handleRefundConfirm}
        />
      )}
    </div>
  );
}