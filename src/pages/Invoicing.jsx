import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO, isPast } from 'date-fns';
import { Plus, Package, Search, Download, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import InvoiceFormModal from '@/components/invoicing/InvoiceFormModal';
import InvoiceRow from '@/components/invoicing/InvoiceRow';
import InvoiceListHeader from '@/components/invoicing/InvoiceListHeader';
import InvoiceStatCards from '@/components/invoicing/InvoiceStatCards';
import RevenueChart from '@/components/invoicing/RevenueChart';
import InvoiceSidebar from '@/components/invoicing/InvoiceSidebar';

const TABS = [
  { key: 'all',       label: 'All Invoices' },
  { key: 'unpaid',    label: 'Unpaid' },
  { key: 'paid',      label: 'Paid' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'recurring', label: 'Recurring' },
];

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'amount_hi', label: 'Amount: High → Low' },
  { value: 'amount_lo', label: 'Amount: Low → High' },
  { value: 'due_date', label: 'Due date' },
];

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tc-foreground)', margin: '0 0 8px' }}>No invoices yet</h3>
      <p style={{ fontSize: 14, color: 'var(--tc-muted-foreground)', margin: 0 }}>Create your first invoice to start getting paid 💰</p>
    </div>
  );
}

export default function Invoicing() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => db.entities.Invoice.list('-created_date', 500),
  });

  // Auto-mark overdue
  const markOverdueIfNeeded = async (inv) => {
    if (['sent', 'viewed'].includes(inv.status) && inv.due_date) {
      try {
        if (isPast(parseISO(inv.due_date))) {
          await db.entities.Invoice.update(inv.id, { status: 'overdue' });
          qc.invalidateQueries({ queryKey: ['invoices'] });
        }
      } catch (_) {}
    }
  };

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...invoices];

    // Tab filter
    if (activeTab === 'unpaid') list = list.filter(i => ['draft', 'sent', 'viewed'].includes(i.status));
    else if (activeTab === 'paid') list = list.filter(i => i.status === 'paid');
    else if (activeTab === 'overdue') list = list.filter(i => i.status === 'overdue');
    else if (activeTab === 'recurring') list = list.filter(i => i.type === 'recurring');

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.client_name || '').toLowerCase().includes(q) ||
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'newest') list.sort((a, b) => (b.created_date || '') > (a.created_date || '') ? 1 : -1);
    else if (sort === 'oldest') list.sort((a, b) => (a.created_date || '') > (b.created_date || '') ? 1 : -1);
    else if (sort === 'amount_hi') list.sort((a, b) => Number(b.amount) - Number(a.amount));
    else if (sort === 'amount_lo') list.sort((a, b) => Number(a.amount) - Number(b.amount));
    else if (sort === 'due_date') list.sort((a, b) => (a.due_date || '') > (b.due_date || '') ? 1 : -1);

    return list;
  }, [invoices, activeTab, search, sort]);

  // Tab counts
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
    // Update status to 'sent' if still draft
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--tc-background)' }}>
      {/* Header */}
      <div style={{ background: 'var(--tc-card)', borderBottom: '1px solid var(--tc-muted)', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tc-foreground)', margin: 0, letterSpacing: '-0.02em' }}>Invoicing & Payments</h1>
            <p style={{ fontSize: 12, color: 'var(--tc-muted-foreground)', margin: '2px 0 0' }}>Manage billing, track payments, and get paid</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setEditingInvoice(null); setShowForm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
              <Plus size={16} /> New Invoice
            </button>
            <button onClick={() => navigate('/packages')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--tc-card)', color: 'var(--tc-foreground)', border: '1.5px solid var(--tc-border)', cursor: 'pointer' }}>
              <Package size={15} /> Manage Packages
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px' }}>

          {/* Stat Cards */}
          <div style={{ marginBottom: 20 }}>
            <InvoiceStatCards invoices={invoices} />
          </div>

          {/* Main Grid: Invoice list + Sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 20, alignItems: 'start' }}>
            {/* Left: Tabs + List */}
            <div>
              {/* Tabs */}
              <div style={{ background: 'var(--tc-card)', borderRadius: '14px 14px 0 0', border: '1px solid var(--tc-muted)', borderBottom: 'none', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}>
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{ padding: '12px 14px', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? 'var(--tc-primary)' : 'transparent'}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tab.label}
                    {counts[tab.key] > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: activeTab === tab.key ? 'var(--tc-accent)' : 'var(--tc-muted)', color: activeTab === tab.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Filter bar */}
              <div style={{ background: 'var(--tc-card)', borderLeft: '1px solid var(--tc-muted)', borderRight: '1px solid var(--tc-muted)', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by client or invoice #…"
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, fontSize: 13, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', boxSizing: 'border-box', color: 'var(--tc-foreground)' }} />
                </div>
                {/* Sort */}
                <div style={{ position: 'relative' }}>
                  <select value={sort} onChange={e => setSort(e.target.value)}
                    style={{ padding: '8px 32px 8px 12px', borderRadius: 9, fontSize: 13, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', color: 'var(--tc-foreground)', appearance: 'none', cursor: 'pointer' }}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', pointerEvents: 'none' }} />
                </div>
                {/* Export */}
                <button onClick={exportCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', color: 'var(--tc-foreground)', cursor: 'pointer' }}>
                  <Download size={13} /> Export CSV
                </button>
              </div>

              {/* Invoice List */}
              <div style={{ background: 'var(--tc-card)', border: '1px solid var(--tc-muted)', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                {isLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--tc-muted-foreground)', fontSize: 14 }}>Loading invoices…</div>
                ) : filtered.length === 0 ? (
                  <EmptyState />
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
              </div>

              {/* Revenue Chart */}
              <div style={{ marginTop: 20 }}>
                <RevenueChart invoices={invoices} />
              </div>
            </div>

            {/* Right Sidebar */}
            <div style={{ position: 'sticky', top: 20 }}>
              <InvoiceSidebar invoices={invoices} />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Form Modal */}
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