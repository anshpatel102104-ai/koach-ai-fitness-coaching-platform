import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';
import { PortalScreen, PortalHeader } from '@/components/portal/PortalUI';
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
  { key: 'overview', label: 'Overview' },
  { key: 'history', label: 'History' },
  { key: 'methods', label: 'Cards' },
];

export default function PortalBilling({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [showManageSub, setShowManageSub] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-billing', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
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
    <PortalScreen>
      <PortalHeader
        title="Billing"
        subtitle={unpaidInvoices.length > 0
          ? `${unpaidInvoices.length} invoice${unpaidInvoices.length > 1 ? 's' : ''} to pay.`
          : 'All paid up.'}
        onBack={() => navigate('/portal/profile')}
        backLabel="Back to profile"
      />

      <div className="space-y-3">
        <Segmented
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          value={activeTab}
          onChange={setActiveTab}
          options={TABS.map(t => ({ value: t.key, label: t.label }))}
        />

        {activeTab === 'overview' && (
          <>
            {totalDue > 0 && (
              <BillingOutstandingCard
                unpaidInvoices={unpaidInvoices}
                totalDue={totalDue}
                onPayAll={() => setPayingInvoice(unpaidInvoices[0])}
                onPayInvoice={setPayingInvoice}
                onViewInvoice={setSelectedInvoice}
              />
            )}
            <BillingCurrentPackage
              client={myClient}
              packages={packages}
              invoices={invoices}
              onManage={() => setShowManageSub(true)}
            />
            <BillingInvoiceList
              invoices={invoices}
              onView={setSelectedInvoice}
              onPay={setPayingInvoice}
            />
            {/* Referral */}
            <section className="panel p-4">
              <h2 className="text-lg text-foreground">Know someone who'd train with your coach?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Send them your link to sign up.</p>
              <Button variant="outline" size="sm" className="mt-3"
                onClick={() => {
                  const link = `${window.location.origin}/join?ref=${myClient?.id || ''}`;
                  navigator.clipboard.writeText(link);
                }}>
                <Copy /> Copy referral link
              </Button>
            </section>
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
          onClose={handlePaymentComplete}
        />
      )}
      {showManageSub && (
        <ManageSubscriptionModal
          client={myClient}
          invoices={invoices}
          onClose={() => setShowManageSub(false)}
        />
      )}
    </PortalScreen>
  );
}
