import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Search, Download, ExternalLink } from 'lucide-react';
import { Panel, Segmented, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  { value: 'amount_hi', label: 'Largest amount' },
  { value: 'amount_lo', label: 'Smallest amount' },
];

export default function PaymentTracking() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [refundTarget, setRefundTarget] = useState(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments-tracking'],
    queryFn: () => db.entities.Payment.list('-created_date', 500),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => db.entities.Invoice.list('-created_date', 500),
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
    toast.info('Issue this refund from your Stripe dashboard. Refunds are not processed here yet.');
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

  const statusCount = (k) => (k === 'all' ? allEntries.length : allEntries.filter(p => p.status === k).length);

  return (
    <div className="flex flex-col gap-5">
      <PaymentStatCards payments={allEntries} />

      <FailedPaymentsPanel payments={allEntries} onRetry={handleRetry} onMessage={handleMessage} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border">
              <Segmented
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTS.map(s => ({ value: s, label: s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1), count: statusCount(s) }))}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-[260px] justify-end">
                <div className="relative flex-1 sm:max-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Client or amount"
                    className="h-9 w-full rounded-md bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-9 w-[130px] sm:w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={exportCSV} title="Export CSV" aria-label="Export CSV">
                  <Download />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <p className="px-6 py-10 text-sm text-muted-foreground">Loading payments…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={allEntries.length === 0 ? 'No payments yet' : 'Nothing matches'}
                body={allEntries.length === 0 ? 'Paid invoices and Stripe charges land here.' : 'Try another filter or clear the search.'}
              />
            ) : (
              <>
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_120px_130px_96px] gap-4 px-5 sm:px-6 py-2.5 border-b border-border text-[13px] text-muted-foreground">
                  <div>Client</div>
                  <div className="text-right">Amount</div>
                  <div>Status</div>
                  <div />
                </div>
                {filtered.map(p => (
                  <PaymentFeedItem
                    key={p.id}
                    payment={p}
                    onViewInvoice={() => {}}
                    onRefund={() => setRefundTarget(p)}
                  />
                ))}
              </>
            )}
          </Panel>

          <MonthlySummaryTable invoices={invoices} payments={allEntries} />
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-5">
          <UpcomingPayments invoices={invoices} payments={allEntries} />

          <Panel className="px-5 py-5 sm:px-6">
            <h2 className="text-lg text-foreground">Payouts and disputes</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Payout history, disputes and saved cards live in your Stripe dashboard.
            </p>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              Open Stripe <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Panel>

          <Panel className="px-5 py-5 sm:px-6">
            <h2 className="text-lg text-foreground">Tax time</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Export every transaction for your accountant. This isn't tax advice.
            </p>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download /> Export for your accountant
            </Button>
          </Panel>
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
