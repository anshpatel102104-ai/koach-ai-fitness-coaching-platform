import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, CreditCard, FileText, Receipt, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BillingCurrentPackage from '@/components/portal/billing/BillingCurrentPackage';
import BillingOutstandingCard from '@/components/portal/billing/BillingOutstandingCard';
import BillingInvoiceList from '@/components/portal/billing/BillingInvoiceList';
import BillingPaymentMethods from '@/components/portal/billing/BillingPaymentMethods';
import BillingHistory from '@/components/portal/billing/BillingHistory';
import InvoiceDetailModal from '@/components/portal/billing/InvoiceDetailModal';
import PaymentFlowModal from '@/components/portal/billing/PaymentFlowModal';
import ManageSubscriptionModal from '@/components/portal/billing/ManageSubscriptionModal';

const TABS = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'history', label: 'History', icon: Receipt },
  { key: 'methods', label: 'Payment Methods', icon: CreditCard },
];

export default function PortalBilling({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [showManageSub, setShowManageSub] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-billing', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['portal-invoices', myClient?.id],
    queryFn: () => portalDb.entities.Invoice.filter({ client_id: myClient.id }, '-issue_date', 100),
    enabled: !!myClient?.id,
  });

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['portal-payments', myClient?.id],
    queryFn: () => portalDb.entities.Payment.filter({ client_id: myClient.id }, '-created_date', 100),
    enabled: !!myClient?.id,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['portal-packages'],
    queryFn: () => portalDb.entities.CoachingPackage.list('-created_date', 50),
  });

  const unpaidInvoices = invoices.filter(i => ['draft', 'sent', 'viewed', 'overdue'].includes(i.status));
  const totalDue = unpaidInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const handlePayNow = (invoice) => {
    setSelectedInvoice(null);
    setPayingInvoice(invoice);
  };

  const handlePaymentComplete = () => {
    setPayingInvoice(null);
    refetchInvoices();
    refetchPayments();
  };

  return (
    <div className="pb-32 min-h-screen" style={{ background: '#0A0F1A' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => navigate('/portal/profile')} className="text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">Billing & Payments</h1>
          {unpaidInvoices.length > 0 && (
            <p className="text-orange-400 text-xs font-semibold mt-0.5">
              {unpaidInvoices.length} invoice{unpaidInvoices.length > 1 ? 's' : ''} outstanding
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? 'rgb(var(--primary) / 0.2)' : 'transparent',
                color: activeTab === tab.key ? 'rgb(var(--primary))' : 'rgba(255,255,255,0.35)',
                border: activeTab === tab.key ? '1px solid rgb(var(--primary) / 0.3)' : '1px solid transparent',
              }}>
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-4">
        {activeTab === 'overview' && (
          <>
            <BillingCurrentPackage
              client={myClient}
              packages={packages}
              invoices={invoices}
              onManage={() => setShowManageSub(true)}
            />
            {totalDue > 0 && (
              <BillingOutstandingCard
                unpaidInvoices={unpaidInvoices}
                totalDue={totalDue}
                onPayAll={() => setPayingInvoice(unpaidInvoices[0])}
                onPayInvoice={setPayingInvoice}
                onViewInvoice={setSelectedInvoice}
              />
            )}
            <BillingInvoiceList
              invoices={invoices}
              onView={setSelectedInvoice}
              onPay={setPayingInvoice}
            />
            {/* Referral card */}
            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgb(var(--ai) / 0.15), rgb(var(--primary) / 0.15))', border: '1px solid rgb(var(--ai) / 0.25)' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--ai) / 0.2)' }}>
                  <Gift className="w-5 h-5 text-ai" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">Refer a Friend</p>
                  <p className="text-white/40 text-xs mt-0.5">Love KOACH AI? Share it and earn rewards!</p>
                  <button className="mt-3 text-xs font-bold px-4 py-2 rounded-lg" style={{ background: 'rgb(var(--ai) / 0.3)', color: 'rgb(var(--ai))', border: '1px solid rgb(var(--ai) / 0.4)' }}
                    onClick={() => {
                      const link = `${window.location.origin}/join?ref=${myClient?.id || ''}`;
                      navigator.clipboard.writeText(link);
                    }}>
                    Copy Referral Link
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <BillingHistory payments={payments} invoices={invoices} />
        )}

        {activeTab === 'methods' && (
          <BillingPaymentMethods client={myClient} />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onPay={handlePayNow}
          />
        )}
        {payingInvoice && (
          <PaymentFlowModal
            invoice={payingInvoice}
            client={myClient}
            user={user}
            onClose={() => setPayingInvoice(null)}
            onComplete={handlePaymentComplete}
          />
        )}
        {showManageSub && (
          <ManageSubscriptionModal
            client={myClient}
            invoices={invoices}
            onClose={() => setShowManageSub(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}