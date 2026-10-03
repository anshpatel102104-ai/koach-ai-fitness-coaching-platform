import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// Business Intelligence
import BIKPIRow from '@/components/business/bi/BIKPIRow';
import BIRevenueChart from '@/components/business/bi/BIRevenueChart';
import BIClientGrowthChart from '@/components/business/bi/BIClientGrowthChart';
import BIRevenueBreakdown from '@/components/business/bi/BIRevenueBreakdown';
import BILeadPipeline from '@/components/business/bi/BILeadPipeline';
import BIForecast from '@/components/business/bi/BIForecast';
import BIHealthScore from '@/components/business/bi/BIHealthScore';
import BIAIInsights from '@/components/business/bi/BIAIInsights';
import BICapacity from '@/components/business/bi/BICapacity';
import BIGoals from '@/components/business/bi/BIGoals';
import BIBenchmarks from '@/components/business/bi/BIBenchmarks';

// Invoicing
import InvoiceFormModal from '@/components/invoicing/InvoiceFormModal';
import InvoiceRow from '@/components/invoicing/InvoiceRow';
import InvoiceListHeader from '@/components/invoicing/InvoiceListHeader';
import InvoiceStatCards from '@/components/invoicing/InvoiceStatCards';
import RevenueChart from '@/components/invoicing/RevenueChart';
import InvoiceSidebar from '@/components/invoicing/InvoiceSidebar';

// Packages
import PackageCard from '@/components/packages/PackageCard';
import PackageFormModal from '@/components/packages/PackageFormModal';
import ShareLinkModal from '@/components/packages/ShareLinkModal';

// Stripe / Payments
import StripeRevenueSummary from '@/components/stripe/StripeRevenueSummary';
import StripeRevenueChart from '@/components/stripe/StripeRevenueChart';
import StripeSubscriptionTable from '@/components/stripe/StripeSubscriptionTable';
import CreateSubscriptionDialog from '@/components/stripe/CreateSubscriptionDialog';
import PaymentLinksPanel from '@/components/stripe/PaymentLinksPanel';
import SubscriptionPlansPanel from '@/components/stripe/SubscriptionPlansPanel';

import {
  BarChart2, FileText, Package, DollarSign, TrendingUp,
  Plus, Search, Download, ChevronDown, RefreshCw, Rocket
} from 'lucide-react';

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: BarChart2 },
  { key: 'invoicing',  label: 'Invoicing',  icon: FileText },
  { key: 'packages',   label: 'Packages',   icon: Package },
  { key: 'payments',   label: 'Payments',   icon: DollarSign },
  { key: 'analytics',  label: 'Analytics',  icon: TrendingUp },
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',    label: 'Oldest first' },
  { value: 'amount_hi', label: 'Amount: High → Low' },
  { value: 'amount_lo', label: 'Amount: Low → High' },
  { value: 'due_date',  label: 'Due date' },
];

const INV_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'unpaid',    label: 'Unpaid' },
  { key: 'paid',      label: 'Paid' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'recurring', label: 'Recurring' },
];

// ── TAB: OVERVIEW ──────────────────────────────────────────────────────────────
function OverviewTab({ clients, checkIns, payments, leads, user }) {
  const isEmpty = clients.length === 0;
  const sharedProps = { clients, checkIns, payments, leads };
  if (isEmpty) return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent flex items-center justify-center mb-4">
        <Rocket className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">Your business insights will appear here</h2>
      <p className="text-sm text-muted-foreground max-w-xs">As you grow your client base, KOACH AI will surface revenue trends, retention analytics, and growth recommendations.</p>
    </div>
  );
  return (
    <div className="space-y-5">
      <BIKPIRow {...sharedProps} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BIRevenueChart {...sharedProps} />
        <BIHealthScore {...sharedProps} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <BIGoals {...sharedProps} />
        <BICapacity clients={clients} user={user} />
        <BIBenchmarks {...sharedProps} />
      </div>
    </div>
  );
}

// ── TAB: INVOICING ─────────────────────────────────────────────────────────────
function InvoicingTab() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => db.entities.Invoice.list('-created_date', 500),
  });

  const filtered = React.useMemo(() => {
    let list = [...invoices];
    if (activeTab === 'unpaid') list = list.filter(i => ['draft', 'sent', 'viewed'].includes(i.status));
    else if (activeTab === 'paid') list = list.filter(i => i.status === 'paid');
    else if (activeTab === 'overdue') list = list.filter(i => i.status === 'overdue');
    else if (activeTab === 'recurring') list = list.filter(i => i.type === 'recurring');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => (i.client_name || '').toLowerCase().includes(q) || (i.invoice_number || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
    }
    if (sort === 'newest') list.sort((a, b) => (b.created_date || '') > (a.created_date || '') ? 1 : -1);
    else if (sort === 'oldest') list.sort((a, b) => (a.created_date || '') > (b.created_date || '') ? 1 : -1);
    else if (sort === 'amount_hi') list.sort((a, b) => Number(b.amount) - Number(a.amount));
    else if (sort === 'amount_lo') list.sort((a, b) => Number(a.amount) - Number(b.amount));
    else if (sort === 'due_date') list.sort((a, b) => (a.due_date || '') > (b.due_date || '') ? 1 : -1);
    return list;
  }, [invoices, activeTab, search, sort]);

  const counts = React.useMemo(() => ({
    all: invoices.length,
    unpaid: invoices.filter(i => ['draft', 'sent', 'viewed'].includes(i.status)).length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    recurring: invoices.filter(i => i.type === 'recurring').length,
  }), [invoices]);

  const handleSave = async (data) => {
    if (editingInvoice?.id) { await db.entities.Invoice.update(editingInvoice.id, data); toast.success('Invoice updated'); }
    else { await db.entities.Invoice.create(data); toast.success('Invoice created'); }
    qc.invalidateQueries({ queryKey: ['invoices'] });
    setShowForm(false); setEditingInvoice(null);
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
    if (inv.status === 'draft') { await db.entities.Invoice.update(inv.id, { status: 'sent' }); qc.invalidateQueries({ queryKey: ['invoices'] }); }
  };

  const handleDuplicate = async (inv) => {
    const { id, created_date, updated_date, created_by, ...rest } = inv;
    const nums = invoices.map(i => parseInt((i.invoice_number || '').replace('INV-', '') || '0')).filter(Boolean);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    await db.entities.Invoice.create({ ...rest, invoice_number: `INV-${String(next).padStart(4, '0')}`, status: 'draft', paid_date: undefined, issue_date: format(new Date(), 'yyyy-MM-dd') });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    toast.success('Invoice duplicated as draft');
  };

  const exportCSV = () => {
    const headers = ['Invoice #', 'Client', 'Description', 'Amount', 'Status', 'Issue Date', 'Due Date', 'Paid Date'];
    const rows = filtered.map(i => [i.invoice_number, i.client_name, i.description, i.amount, i.status, i.issue_date, i.due_date, i.paid_date || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub-header actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={() => { setEditingInvoice(null); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <InvoiceStatCards invoices={invoices} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* Invoice tabs */}
          <div style={{ background: 'var(--tc-card)', borderRadius: '14px 14px 0 0', border: '1px solid var(--tc-muted)', borderBottom: 'none', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}>
            {INV_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ padding: '12px 14px', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? 'var(--tc-primary)' : 'transparent'}`, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                {tab.label}
                {counts[tab.key] > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: activeTab === tab.key ? 'var(--tc-accent)' : 'var(--tc-muted)', color: activeTab === tab.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>{counts[tab.key]}</span>}
              </button>
            ))}
          </div>
          {/* Filter bar */}
          <div style={{ background: 'var(--tc-card)', borderLeft: '1px solid var(--tc-muted)', borderRight: '1px solid var(--tc-muted)', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or invoice #…"
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, fontSize: 13, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', boxSizing: 'border-box', color: 'var(--tc-foreground)' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 32px 8px 12px', borderRadius: 9, fontSize: 13, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', color: 'var(--tc-foreground)', appearance: 'none', cursor: 'pointer' }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', pointerEvents: 'none' }} />
            </div>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', color: 'var(--tc-foreground)', cursor: 'pointer' }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
          {/* List */}
          <div style={{ background: 'var(--tc-card)', border: '1px solid var(--tc-muted)', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
            {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--tc-muted-foreground)', fontSize: 14 }}>Loading invoices…</div>
              : filtered.length === 0 ? <div style={{ padding: '64px 24px', textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>💰</div><p style={{ color: 'var(--tc-muted-foreground)', fontSize: 14 }}>No invoices found</p></div>
              : <><InvoiceListHeader />{filtered.map(inv => <InvoiceRow key={inv.id} invoice={inv} onView={() => { setEditingInvoice(inv); setShowForm(true); }} onMarkPaid={() => handleMarkPaid(inv)} onSendReminder={() => handleSendReminder(inv)} onDuplicate={() => handleDuplicate(inv)} onDelete={() => handleDelete(inv)} />)}</>
            }
          </div>
          <div style={{ marginTop: 20 }}><RevenueChart invoices={invoices} /></div>
        </div>
        <div style={{ position: 'sticky', top: 20 }}><InvoiceSidebar invoices={invoices} /></div>
      </div>

      {showForm && (
        <InvoiceFormModal invoice={editingInvoice} onClose={() => { setShowForm(false); setEditingInvoice(null); }} onSave={handleSave} existingInvoices={invoices} />
      )}
    </div>
  );
}

// ── TAB: PACKAGES ──────────────────────────────────────────────────────────────
function PackagesTab() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [sharingPkg, setSharingPkg] = useState(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['coaching-packages'],
    queryFn: () => db.entities.CoachingPackage.list('-created_date', 100),
  });

  const active = packages.filter(p => !p.is_archived);
  const archived = packages.filter(p => p.is_archived);
  const displayed = tab === 'active' ? active : archived;
  const refresh = () => qc.invalidateQueries({ queryKey: ['coaching-packages'] });

  const handleSave = async (data) => {
    if (editingPkg?.id) { await db.entities.CoachingPackage.update(editingPkg.id, data); toast.success('Package updated'); }
    else { await db.entities.CoachingPackage.create(data); toast.success('Package created! 🎉'); }
    refresh(); setShowForm(false); setEditingPkg(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Actions + tabs row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ key: 'active', label: 'Active Packages', count: active.length }, { key: 'archived', label: 'Archived', count: archived.length }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--tc-primary)' : 'transparent'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.label}
              {t.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: tab === t.key ? 'var(--tc-accent)' : 'var(--tc-muted)', color: tab === t.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>{t.count}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditingPkg(null); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
          <Plus size={16} /> Create Package
        </button>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tc-muted-foreground)', fontSize: 14 }}>Loading packages…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {displayed.length === 0
            ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 24px' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📦</div><p style={{ color: 'var(--tc-muted-foreground)', fontSize: 14 }}>{tab === 'archived' ? 'No archived packages' : 'No packages yet. Create your first!'}</p></div>
            : displayed.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg}
                onEdit={() => { setEditingPkg(pkg); setShowForm(true); }}
                onDuplicate={async () => { const { id, created_date, updated_date, created_by, enrolled_count, total_revenue, ...rest } = pkg; await db.entities.CoachingPackage.create({ ...rest, name: `${rest.name} (Copy)`, is_active: false, slug: `${rest.slug || 'package'}-copy` }); toast.success('Duplicated'); refresh(); }}
                onArchive={async () => { await db.entities.CoachingPackage.update(pkg.id, tab === 'archived' ? { is_archived: false } : { is_archived: true, is_active: false }); toast.success(tab === 'archived' ? 'Restored' : 'Archived'); refresh(); }}
                onDelete={async () => { if (!confirm(`Delete "${pkg.name}"?`)) return; await db.entities.CoachingPackage.delete(pkg.id); toast.success('Deleted'); refresh(); }}
                onToggleActive={async () => { await db.entities.CoachingPackage.update(pkg.id, { is_active: !pkg.is_active }); refresh(); }}
                onShare={() => setSharingPkg(pkg)}
              />
            ))
          }
        </div>
      )}

      {showForm && <PackageFormModal pkg={editingPkg} onClose={() => { setShowForm(false); setEditingPkg(null); }} onSave={handleSave} />}
      {sharingPkg && <ShareLinkModal pkg={sharingPkg} onClose={() => setSharingPkg(null)} />}
    </div>
  );
}

// ── TAB: PAYMENTS ──────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: dashData, isLoading, refetch } = useQuery({
    queryKey: ['stripe-dashboard'],
    queryFn: async () => { const res = await db.functions.invoke('stripeGetDashboard', {}); return res.data; },
    refetchInterval: 60000,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
  });

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors"
          style={{ background: 'var(--tc-background)', color: 'var(--tc-foreground)', borderColor: 'var(--tc-border)' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'var(--tc-primary-foreground)' }}>
          <Plus className="w-3.5 h-3.5" /> New Subscription
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <StripeRevenueSummary data={dashData} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><StripeRevenueChart data={dashData?.monthly_revenue || []} /></div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">Payment Health</h3>
              <div className="space-y-3">
                {[
                  { label: 'Active Subscriptions', value: dashData?.active_subscriptions || 0 },
                  { label: 'Past Due', value: dashData?.past_due || 0 },
                  { label: 'Canceled', value: dashData?.canceled || 0 },
                  { label: 'Failed Charges', value: dashData?.failed_charges || 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <StripeSubscriptionTable subscriptions={dashData?.subscriptions || []} clients={clients} onRefresh={refetch} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentLinksPanel />
            <SubscriptionPlansPanel />
          </div>
        </div>
      )}

      <CreateSubscriptionDialog open={showCreate} onOpenChange={setShowCreate} clients={clients} onSuccess={() => { setShowCreate(false); refetch(); }} />
    </div>
  );
}

// ── TAB: ANALYTICS ─────────────────────────────────────────────────────────────
function AnalyticsTab({ clients, checkIns, payments, leads, user }) {
  const sharedProps = { clients, checkIns, payments, leads };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BILeadPipeline leads={leads} />
        <BIForecast clients={clients} leads={leads} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BIClientGrowthChart clients={clients} />
        <BIRevenueBreakdown {...sharedProps} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <BIGoals {...sharedProps} />
        <BICapacity clients={clients} user={user} />
        <BIBenchmarks {...sharedProps} />
      </div>
      <BIAIInsights {...sharedProps} />
    </div>
  );
}

// ── MAIN ────────────────────────────────────────────────────────────────────────
const TAB_STORAGE_KEY = 'business_active_tab';

export default function Business() {
  const { me } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL param first, then localStorage
    const params = new URLSearchParams(location.search);
    const urlTab = params.get('tab');
    if (urlTab && TABS.find(t => t.key === urlTab)) return urlTab;
    return localStorage.getItem(TAB_STORAGE_KEY) || 'overview';
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    me().then(setUser).catch(() => {});
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
    localStorage.setItem(TAB_STORAGE_KEY, key);
  };

  const { data: clients = [] } = useQuery({ queryKey: ['clients-bi'], queryFn: () => db.entities.Client.list('-created_date', 200) });
  const { data: checkIns = [] } = useQuery({ queryKey: ['checkins-bi'], queryFn: () => db.entities.CheckIn.list('-date', 500) });
  const { data: payments = [] } = useQuery({ queryKey: ['payments-bi'], queryFn: () => db.entities.Payment.list('-created_date', 200) });
  const { data: leads = [] } = useQuery({ queryKey: ['leads-bi'], queryFn: () => db.entities.Lead.list('-created_date', 200) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--tc-background)' }}>
      {/* Page Header + Tabs */}
      <div style={{ background: 'var(--tc-card)', borderBottom: '1px solid var(--tc-muted)', padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tc-foreground)', margin: 0, letterSpacing: '-0.02em' }}>Business</h1>
            <p style={{ fontSize: 12, color: 'var(--tc-muted-foreground)', margin: '2px 0 0' }}>Invoicing, packages, payments &amp; analytics — all in one place</p>
          </div>

          {/* Pill tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }} className="scrollbar-hide">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 0,
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? 'var(--tc-primary)' : 'transparent'}`,
                    background: 'transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}>
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
          {activeTab === 'overview'  && <OverviewTab clients={clients} checkIns={checkIns} payments={payments} leads={leads} user={user} />}
          {activeTab === 'invoicing' && <InvoicingTab />}
          {activeTab === 'packages'  && <PackagesTab />}
          {activeTab === 'payments'  && <PaymentsTab />}
          {activeTab === 'analytics' && <AnalyticsTab clients={clients} checkIns={checkIns} payments={payments} leads={leads} user={user} />}
        </div>
      </div>
    </div>
  );
}