import { format, parseISO } from 'date-fns';

export const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '–'; } };

/** Invoice status -> pill tone + label. */
export const INVOICE_STATUS = {
  paid: { label: 'Paid', tone: 'success' },
  sent: { label: 'Unpaid', tone: 'warning' },
  viewed: { label: 'Unpaid', tone: 'warning' },
  draft: { label: 'Pending', tone: 'neutral' },
  overdue: { label: 'Overdue', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
