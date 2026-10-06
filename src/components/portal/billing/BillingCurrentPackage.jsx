import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { KeyValue } from '@/components/kit';
import { Pill } from '@/components/portal/PortalUI';

const BILLING_LABEL = { one_time: 'one-time', monthly: 'per month', quarterly: 'per quarter', annual: 'per year', custom: '' };

function InclusionRow({ label }) {
  return (
    <li className="flex items-center gap-2 py-1 text-sm text-foreground">
      <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" strokeWidth={3} />
      {label}
    </li>
  );
}

export default function BillingCurrentPackage({ client, packages, invoices, onManage }) {
  const [expanded, setExpanded] = useState(false);

  // Find the most recent paid invoice to infer package
  const paidInvoices = invoices.filter(i => i.status === 'paid').sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));
  const latestPaid = paidInvoices[0];

  // Try to find a matching package
  const pkg = packages.find(p => p.name === latestPaid?.description?.split(' — ')[0]) || packages.find(p => p.is_active) || null;

  const monthlyRate = client?.monthly_rate;
  const billingStatus = client?.billing_status || 'none';

  if (!monthlyRate && !pkg) {
    return (
      <section className="panel px-4 py-5">
        <p className="text-[15px] font-semibold text-foreground">No plan set up yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Your coach will add your billing here.</p>
      </section>
    );
  }

  const statusTone = billingStatus === 'active' ? 'success' : billingStatus === 'past_due' ? 'warning' : 'neutral';
  const statusLabel = billingStatus === 'active' ? 'Active' : billingStatus === 'past_due' ? 'Past due' : billingStatus === 'cancelled' ? 'Cancelled' : 'Inactive';

  const nextBilling = addMonths(new Date(), 1);

  const inclusions = pkg ? Object.entries(pkg.inclusions || {}).filter(([, v]) => v === true).map(([k]) =>
    k.replace(/_/g, ' ').replace(/^\w/, l => l.toUpperCase())
  ) : [];
  const customInclusions = pkg?.custom_inclusions || [];

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Pill tone={statusTone}>{statusLabel}</Pill>
          <h2 className="mt-2 text-[22px] text-foreground">{pkg?.name || 'Coaching plan'}</h2>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="num text-[32px] text-foreground">${monthlyRate || pkg?.price || 0}</p>
          <p className="text-[13px] text-muted-foreground">{pkg ? BILLING_LABEL[pkg.billing_type] : 'per month'}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-border">
        <KeyValue label="Next payment" value={format(nextBilling, 'MMM d, yyyy')} />
      </div>

      {(inclusions.length > 0 || customInclusions.length > 0) && (
        <>
          <button type="button" onClick={() => setExpanded(e => !e)} className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4">
            {expanded ? 'Hide what\'s included' : 'What\'s included'}
          </button>
          {expanded && (
            <ul className="mt-2">
              {inclusions.map(inc => <InclusionRow key={inc} label={inc} />)}
              {customInclusions.map(inc => <InclusionRow key={inc} label={inc} />)}
            </ul>
          )}
        </>
      )}

      <Button variant="outline" className="mt-4 w-full" onClick={onManage}>Manage plan</Button>
    </section>
  );
}
