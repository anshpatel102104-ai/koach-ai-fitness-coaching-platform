import React from 'react';

/** Shared column template for the invoice table (header + rows). */
export const INVOICE_GRID = 'md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.5fr)_96px_72px_112px_32px] md:items-center md:gap-4';

export default function InvoiceListHeader() {
  return (
    <div className={`hidden ${INVOICE_GRID} px-5 sm:px-6 py-2.5 border-b border-border text-[13px] text-muted-foreground`}>
      <div>Client</div>
      <div>Description</div>
      <div className="text-right">Amount</div>
      <div>Due</div>
      <div>Status</div>
      <div />
    </div>
  );
}
