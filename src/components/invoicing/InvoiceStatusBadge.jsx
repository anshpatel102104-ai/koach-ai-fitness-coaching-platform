import React from 'react';
import { StatusDot } from '@/components/business/ui';

/** Invoice status as text with a small dot. Paid = green, Due = grey, Overdue = red. */
export const INVOICE_STATUS = {
  draft:     { label: 'Draft',     tone: 'muted' },
  sent:      { label: 'Due',       tone: 'muted' },
  viewed:    { label: 'Due, viewed', tone: 'muted' },
  paid:      { label: 'Paid',      tone: 'success' },
  overdue:   { label: 'Overdue',   tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export default function InvoiceStatusBadge({ status, className }) {
  const cfg = INVOICE_STATUS[status] || INVOICE_STATUS.draft;
  return <StatusDot tone={cfg.tone} className={className}>{cfg.label}</StatusDot>;
}
