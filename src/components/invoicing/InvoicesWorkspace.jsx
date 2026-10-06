import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Panel, Segmented, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InvoiceFormModal from './InvoiceFormModal';
import InvoiceRow from './InvoiceRow';
import InvoiceListHeader from './InvoiceListHeader';
import InvoiceStatCards from './InvoiceStatCards';
import RevenueChart from './RevenueChart';
import InvoiceSidebar from './InvoiceSidebar';

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'unpaid',    label: 'Unpaid' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'paid',      label: 'Paid' },
  { key: 'recurring', label: 'Recurring' },
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',    label: 'Oldest first' },
  { value: 'amount_hi', label: 'Largest amount' },
  { value: 'amount_lo', label: 'Smallest amount' },
  { value: 'due_date',  label: 'Due date' },
];

/**
 * The invoice list, stats, chart and side panels. Used by Billing
 * (/invoicing) and the Invoices tab of /business. The caller owns the query
 * and the "New invoice" button; this owns filters, row actions and the form.
 */
export default function InvoicesWorkspace({ invoices = [], isLoading, showForm, setShowForm, editingInvoice, setEditingInvoice }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const filtered = useMemo(() => {
    let list = [...invoices];
    if (activeTab === 'unpaid') list = list.filter(i => ['draft', 'sent', 'viewed'].includes(i.status));
    else if (activeTab === 'paid') list = list.filter(i => i.status === 'paid');
    else if (activeTab === 'overdue') list = list.filter(i => i.status === 'overdue');
    else if (activeTab === 'recurring') list = list.filter(i => i.type === 'recurring');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.client_name || '').toLowerCase().includes(q) ||
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }

    if (sort === 'newest') list.sort((a, b) => (b.created_date || '') > (a.created_date || '') ? 1 : -1);
    else if (sort === 'oldest') list.sort((a, b) => (a.created_date || '') > (b.created_date || '') ? 1 : -1);
    else if (sort === 'amount_hi') list.sort((a, b) => Number(b.amount) - Number(a.amount));
    else if (sort === 'amount_lo') list.sort((a, b) => Number(a.amount) - Number(b.amount));
    else if (sort === 'due_date') list.sort((a, b) => (a.due_date || '') > (b.due_date || '') ? 1 : -1);
    return list;
  }, [invoices, activeTab, search, sort]);

  const counts = useMemo(() => ({
    all: invoices.length,
    unpaid: invoices.filter(i => ['draft', 'sent', 'viewed'].includes(i.status)).length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    recurring: invoices.filter(i => i.type === 'recurring').length,
  }), [invoices]);

  const handleSave = async (formData) => {
    if (editingInvoice?.id) {
      await db.entities.Invoice.update(editingInvoice.id, formData);
      toast.success('Invoice updated');
    } else {
      await db.entities.Invoice.create(formData);
      toast.success('Invoice created');
    }
    qc.invalidateQueries({ queryKey: ['invoices'] });
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleMarkPaid = async (inv) => {
    await db.entities.Invoice.update(inv.id, { status: 'paid', paid_date: format(new Date(), 'yyyy-MM-dd') });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    toast.success(`${inv.invoice_number} marked as paid`);
  };

  const handleDelete = async (inv) => {
    if (!confirm(`Delete ${inv.invoice_number}?`)) return;
    await db.entities.Invoice.delete(inv.id);
    qc.invalidateQueries({ queryKey: ['invoices'] });
    toast.success('Invoice deleted');
  };

  const handleSendReminder = async (inv) => {
    toast.success(`Reminder sent to ${inv.client_name}`);
    if (inv.status === 'draft') {
      await db.entities.Invoice.update(inv.id, { status: 'sent' });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    }
  };

  const handleDuplicate = async (inv) => {
    const { id, created_date, updated_date, created_by, ...rest } = inv;
    const nums = invoices.map(i => parseInt((i.invoice_number || '').replace('INV-', '') || '0')).filter(Boolean);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    await db.entities.Invoice.create({
      ...rest,
      invoice_number: `INV-${String(next).padStart(4, '0')}`,
      status: 'draft',
      paid_date: undefined,
      issue_date: format(new Date(), 'yyyy-MM-dd'),
    });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    toast.success('Invoice duplicated as draft');
  };

  const exportCSV = () => {
    const headers = ['Invoice #', 'Client', 'Description', 'Amount', 'Status', 'Issue Date', 'Due Date', 'Paid Date'];
    const rows = filtered.map(i => [
      i.invoice_number, i.client_name, i.description,
      i.amount, i.status, i.issue_date, i.due_date, i.paid_date || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const openNew = () => { setEditingInvoice(null); setShowForm(true); };

  return (
    <div className="flex flex-col gap-5">
      <InvoiceStatCards invoices={invoices} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          {/* Invoice table */}
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border">
              <Segmented
                size="sm"
                value={activeTab}
                onChange={setActiveTab}
                options={TABS.map(t => ({ value: t.key, label: t.label, count: counts[t.key] }))}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-[260px] justify-end">
                <div className="relative flex-1 sm:max-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Client, number or note"
                    className="h-9 w-full rounded-md bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-9 w-[130px] sm:w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={exportCSV} title="Export CSV" aria-label="Export CSV">
                  <Download />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <p className="px-6 py-10 text-sm text-muted-foreground">Loading invoices…</p>
            ) : invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                body="Send your first invoice and it shows up here with its status."
                action={<Button onClick={openNew}>New invoice</Button>}
              />
            ) : filtered.length === 0 ? (
              <EmptyState title="Nothing matches" body="Try another filter or clear the search." />
            ) : (
              <>
                <InvoiceListHeader />
                {filtered.map(inv => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onView={() => { setEditingInvoice(inv); setShowForm(true); }}
                    onMarkPaid={() => handleMarkPaid(inv)}
                    onSendReminder={() => handleSendReminder(inv)}
                    onDuplicate={() => handleDuplicate(inv)}
                    onDelete={() => handleDelete(inv)}
                  />
                ))}
              </>
            )}
          </Panel>

          <RevenueChart invoices={invoices} />
        </div>

        <div className="xl:sticky xl:top-5">
          <InvoiceSidebar invoices={invoices} />
        </div>
      </div>

      {showForm && (
        <InvoiceFormModal
          invoice={editingInvoice}
          onClose={() => { setShowForm(false); setEditingInvoice(null); }}
          onSave={handleSave}
          existingInvoices={invoices}
        />
      )}
    </div>
  );
}
