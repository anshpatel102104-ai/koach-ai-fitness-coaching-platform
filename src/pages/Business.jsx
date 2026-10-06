import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

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

import { Plus, RefreshCw } from 'lucide-react';
import { Page, PageHeader, Segmented, EmptyState, TextLink } from '@/components/kit';
import { Button } from '@/components/ui/button';
import InvoicesWorkspace from '@/components/invoicing/InvoicesWorkspace';
import PackagesWorkspace from '@/components/packages/PackagesWorkspace';
import StripeWorkspace, { useStripeDashboard } from '@/components/stripe/StripeWorkspace';
import { money, plural } from '@/components/business/ui';

const TABS = [
  { key: 'overview',   label: 'Overview' },
  { key: 'analytics',  label: 'Growth' },
  { key: 'payments',   label: 'Stripe' },
  { key: 'invoicing',  label: 'Invoices' },
  { key: 'packages',   label: 'Packages' },
];

// ── TAB: OVERVIEW ──────────────────────────────────────────────────────────────
function OverviewTab({ clients, checkIns, payments, leads, user }) {
  const isEmpty = clients.length === 0;
  const sharedProps = { clients, checkIns, payments, leads };
  if (isEmpty) return (
    <div className="panel">
      <EmptyState
        title="Nothing to measure yet"
        body="Revenue, retention and growth show up here once you have clients with a monthly rate."
        action={<Button onClick={() => window.location.assign('/clients?new=1')}>Invite a client</Button>}
      />
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
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
function InvoicingTab({ ui }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => db.entities.Invoice.list('-created_date', 500),
  });
  return <InvoicesWorkspace invoices={invoices} isLoading={isLoading} {...ui} />;
}

// ── TAB: ANALYTICS ─────────────────────────────────────────────────────────────
function AnalyticsTab({ clients, checkIns, payments, leads, user }) {
  const sharedProps = { clients, checkIns, payments, leads };
  return (
    <div className="flex flex-col gap-5">
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL param first, then localStorage
    const params = new URLSearchParams(location.search);
    const urlTab = params.get('tab');
    if (urlTab && TABS.find(t => t.key === urlTab)) return urlTab;
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.find(t => t.key === stored) ? stored : 'overview';
  });
  const [user, setUser] = useState(null);

  // Create-dialog state for the tabs that have one (owned here so the header button can open it)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [showSubCreate, setShowSubCreate] = useState(false);
  const stripe = useStripeDashboard(activeTab === 'payments');

  useEffect(() => {
    me().then(setUser).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
    localStorage.setItem(TAB_STORAGE_KEY, key);
  };

  const { data: clients = [] } = useQuery({ queryKey: ['clients-bi'], queryFn: () => db.entities.Client.list('-created_date', 200) });
  const { data: checkIns = [] } = useQuery({ queryKey: ['checkins-bi'], queryFn: () => db.entities.CheckIn.list('-date', 500) });
  const { data: payments = [] } = useQuery({ queryKey: ['payments-bi'], queryFn: () => db.entities.Payment.list('-created_date', 200) });
  const { data: leads = [] } = useQuery({ queryKey: ['leads-bi'], queryFn: () => db.entities.Lead.list('-created_date', 200) });

  const active = clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active');
  const mrr = active.reduce((s, c) => s + (c.monthly_rate || 0), 0);
  const atRisk = clients.filter(c => c.lifecycle_status === 'at_risk').length;
  const subtitle = clients.length === 0
    ? 'Revenue, retention and growth, in one place.'
    : `${money(mrr)} a month from ${plural(active.length, 'active client')}. ${atRisk ? `${atRisk} at risk.` : 'Nobody at risk.'}`;

  const actions = activeTab === 'invoicing'
    ? <Button onClick={() => { setEditingInvoice(null); setShowInvoiceForm(true); }}><Plus /> New invoice</Button>
    : activeTab === 'packages'
      ? <Button onClick={() => { setEditingPkg(null); setShowPackageForm(true); }}><Plus /> New package</Button>
      : activeTab === 'payments'
        ? (
          <>
            <Button variant="outline" onClick={() => stripe.refetch()} disabled={stripe.isFetching}>
              <RefreshCw className={stripe.isFetching ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button onClick={() => setShowSubCreate(true)}><Plus /> New subscription</Button>
          </>
        )
        : null;

  const shared = { clients, checkIns, payments, leads, user };

  return (
    <Page>
      <PageHeader title="Insights" subtitle={subtitle} actions={actions} />

      <div className="flex items-center justify-between gap-4 mb-5">
        <Segmented
          value={activeTab}
          onChange={handleTabChange}
          options={TABS.map(t => ({ value: t.key, label: t.label }))}
        />
        <TextLink className="hidden md:inline whitespace-nowrap" onClick={() => navigate('/analytics')}>Client results</TextLink>
      </div>

      {activeTab === 'overview'  && <OverviewTab {...shared} />}
      {activeTab === 'invoicing' && (
        <InvoicingTab ui={{ showForm: showInvoiceForm, setShowForm: setShowInvoiceForm, editingInvoice, setEditingInvoice }} />
      )}
      {activeTab === 'packages'  && (
        <PackagesWorkspace showForm={showPackageForm} setShowForm={setShowPackageForm} editingPkg={editingPkg} setEditingPkg={setEditingPkg} />
      )}
      {activeTab === 'payments'  && <StripeWorkspace showCreate={showSubCreate} setShowCreate={setShowSubCreate} />}
      {activeTab === 'analytics' && <AnalyticsTab {...shared} />}
    </Page>
  );
}
