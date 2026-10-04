import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Eye, CheckCircle2, Trash2, Copy, Bell } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import InvoiceStatusBadge from './InvoiceStatusBadge';

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['var(--tc-primary)', 'var(--tc-ai)', 'var(--tc-success)', 'var(--tc-warning)', 'var(--tc-destructive)'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'var(--tc-primary)';
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '20', border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function InvoiceRow({ invoice, onView, onMarkPaid, onDuplicate, onDelete }) {
  const [hovered, setHovered] = useState(false);

  const handleReminder = async (e) => {
    e.stopPropagation();
    await db.functions.invoke('sendInvoiceReminder', { invoice_id: invoice.id });
    toast.success(`Reminder sent to ${invoice.client_name}`);
  };

  const fmt = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid var(--tc-muted)', background: hovered ? 'var(--tc-background)' : 'var(--tc-card)', transition: 'background 0.15s', cursor: 'pointer' }}
      onClick={onView}
    >
      {/* Avatar + Name */}
      <Avatar name={invoice.client_name} />
      <div style={{ flex: 2, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tc-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.client_name}</div>
        <div style={{ fontSize: 12, color: 'var(--tc-muted-foreground)', marginTop: 1 }}>{invoice.invoice_number}</div>
      </div>

      {/* Description */}
      <div style={{ flex: 3, minWidth: 0, display: 'none' }} className="sm-flex">
        <div style={{ fontSize: 13, color: 'var(--tc-muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.description || '—'}</div>
      </div>

      {/* Amount */}
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tc-foreground)', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
        ${Number(invoice.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* Dates */}
      <div style={{ flexShrink: 0, minWidth: 100, display: 'none' }} className="md-flex">
        <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)' }}>Due {fmt(invoice.due_date)}</div>
        <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)', marginTop: 2 }}>Issued {fmt(invoice.issue_date)}</div>
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }} onClick={e => e.stopPropagation()}>
        <ActionBtn icon={Eye} title="View / Edit" onClick={onView} />
        {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
          <ActionBtn icon={Bell} title="Send Reminder" onClick={handleReminder} color="var(--tc-warning)" />
        )}
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <ActionBtn icon={CheckCircle2} title="Mark Paid" onClick={onMarkPaid} color="var(--tc-success)" />
        )}
        <ActionBtn icon={Copy} title="Duplicate" onClick={onDuplicate} />
        <ActionBtn icon={Trash2} title="Delete" onClick={onDelete} color="var(--tc-destructive)" />
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, color = 'var(--tc-muted-foreground)' }) {
  const [h, setH] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: h ? 'var(--tc-muted)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
      <Icon size={14} />
    </button>
  );
}