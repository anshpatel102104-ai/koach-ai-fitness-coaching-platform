import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const today = () => format(new Date(), 'yyyy-MM-dd');
const dueDate = (days) => format(addDays(new Date(), days), 'yyyy-MM-dd');

function generateInvoiceNumber(existing) {
  const nums = (existing || []).map(i => parseInt((i.invoice_number || '').replace('INV-', '') || '0')).filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `INV-${String(next).padStart(4, '0')}`;
}

const LINE_PRESETS = [
  'Monthly Coaching',
  'Program Design',
  'Nutrition Plan',
  'One-time Consultation',
  'Custom Package',
  'Late Fee',
];

const DUE_OPTIONS = [
  { label: 'Due immediately', days: 0 },
  { label: 'Net 7', days: 7 },
  { label: 'Net 14', days: 14 },
  { label: 'Net 30', days: 30 },
];

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'color-mix(in srgb, black 55%, transparent)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'var(--tc-card)', borderRadius: 20, width: '100%', maxWidth: '90vw', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px color-mix(in srgb, black 25%, transparent)' },
  col: { overflowY: 'auto', padding: '20px 24px', flex: 1 },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'var(--tc-background)', border: '1.5px solid var(--tc-border)', outline: 'none', boxSizing: 'border-box', color: 'var(--tc-foreground)' },
};

function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tc-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--tc-muted)' }}>{children}</div>;
}

function Field({ label, children, half }) {
  return (
    <div style={{ marginBottom: 14, width: half ? 'calc(50% - 6px)' : '100%', display: 'inline-block', verticalAlign: 'top' }}>
      {label && <label style={s.label}>{label}</label>}
      {children}
    </div>
  );
}

// Live invoice preview
function InvoicePreview({ form, lineItems, coachName }) {
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.qty) * Number(li.price) || 0), 0);
  const discountAmt = form.discountType === '%' ? subtotal * (Number(form.discount) / 100) : Number(form.discount || 0);
  const taxAmt = subtotal * (Number(form.tax || 0) / 100);
  const total = Math.max(0, subtotal - discountAmt + taxAmt);

  return (
    <div style={{ background: 'var(--tc-background)', border: '1px solid var(--tc-border)', borderRadius: 14, padding: 24, minHeight: 400, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, background: 'linear-gradient(135deg,var(--tc-primary),var(--tc-ai))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KOACH AI</div>
          <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)', marginTop: 2 }}>{coachName || 'Your Coaching Business'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--tc-foreground)' }}>INVOICE</div>
          <div style={{ fontSize: 12, color: 'var(--tc-muted-foreground)' }}>{form.invoice_number || 'INV-XXXX'}</div>
        </div>
      </div>

      {/* Client + dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', marginBottom: 4 }}>Bill To</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-foreground)' }}>{form.client_name || 'Client Name'}</div>
          <div style={{ fontSize: 12, color: 'var(--tc-muted-foreground)' }}>{form.client_email || 'client@email.com'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)' }}>Issue: {form.issue_date || today()}</div>
          <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)' }}>Due: {form.due_date || '—'}</div>
        </div>
      </div>

      {/* Line items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: 'var(--tc-muted)' }}>
            {['Description', 'Qty', 'Price', 'Total'].map((h, i) => (
              <th key={h} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: '12px 8px', fontSize: 12, color: 'var(--tc-muted-foreground)', textAlign: 'center' }}>Add line items…</td></tr>
          ) : lineItems.map((li, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--tc-muted)' }}>
              <td style={{ padding: '8px 8px', fontSize: 12, color: 'var(--tc-foreground)' }}>{li.description || '—'}</td>
              <td style={{ padding: '8px 8px', fontSize: 12, color: 'var(--tc-foreground)', textAlign: 'right' }}>{li.qty}</td>
              <td style={{ padding: '8px 8px', fontSize: 12, color: 'var(--tc-foreground)', textAlign: 'right' }}>${Number(li.price || 0).toFixed(2)}</td>
              <td style={{ padding: '8px 8px', fontSize: 12, fontWeight: 600, color: 'var(--tc-foreground)', textAlign: 'right' }}>${(Number(li.qty) * Number(li.price) || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginLeft: 'auto', maxWidth: 200 }}>
        <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
        {discountAmt > 0 && <Row label={`Discount (${form.discount}${form.discountType})`} value={`-$${discountAmt.toFixed(2)}`} color="var(--tc-warning)" />}
        {taxAmt > 0 && <Row label={`Tax (${form.tax}%)`} value={`$${taxAmt.toFixed(2)}`} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--tc-foreground)', marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tc-foreground)' }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--tc-foreground)' }}>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Pay button preview */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg,var(--tc-primary),var(--tc-ai))', color: 'var(--tc-primary-foreground)', fontSize: 13, fontWeight: 700 }}>
          Pay ${total.toFixed(2)} →
        </div>
      </div>

      {form.notes && (
        <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--tc-background)', borderRadius: 8, fontSize: 11, color: 'var(--tc-muted-foreground)' }}>
          <strong>Notes:</strong> {form.notes}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: color || 'var(--tc-foreground)' }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

export default function InvoiceCreationModal({ invoice, onClose, onSave, existingInvoices = [] }) {
  const { me } = useAuth();
  const isEdit = !!invoice?.id;
  const [coachName, setCoachName] = useState('');

  useEffect(() => {
    me().then(u => setCoachName(u?.full_name || '')).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-invoice'],
    queryFn: () => db.entities.Client.list('-created_date', 200),
  });

  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number || generateInvoiceNumber(existingInvoices),
    client_id: invoice?.client_id || '',
    client_name: invoice?.client_name || '',
    client_email: invoice?.client_email || '',
    description: invoice?.description || '',
    status: invoice?.status || 'draft',
    type: invoice?.type || 'one_time',
    issue_date: invoice?.issue_date || today(),
    due_date: invoice?.due_date || dueDate(30),
    currency: 'USD',
    discount: '',
    discountType: '%',
    tax: '',
    notes: invoice?.notes || '',
    internal_notes: '',
    payment_terms: 'Payment due within 30 days',
    payment_method: 'stripe',
    recurring: false,
    recurring_interval: invoice?.recurring_interval || 'monthly',
    recurring_start: today(),
    recurring_end: '',
    late_fee: false,
    late_fee_pct: 1.5,
  });

  const [lineItems, setLineItems] = useState(
    invoice?.line_items || [{ description: '', qty: 1, price: '' }]
  );
  const [showPresets, setShowPresets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientChange = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    set('client_id', clientId);
    if (c) {
      set('client_name', c.name);
      set('client_email', c.email || '');
    }
  };

  const updateLine = (i, key, val) => {
    const updated = [...lineItems];
    updated[i] = { ...updated[i], [key]: val };
    setLineItems(updated);
  };

  const removeLine = (i) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const addPreset = (preset) => {
    setLineItems([...lineItems, { description: preset, qty: 1, price: '' }]);
    setShowPresets(false);
  };

  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.qty) * Number(li.price) || 0), 0);
  const discountAmt = form.discountType === '%' ? subtotal * (Number(form.discount) / 100) : Number(form.discount || 0);
  const taxAmt = subtotal * (Number(form.tax || 0) / 100);
  const total = Math.max(0, subtotal - discountAmt + taxAmt);

  const buildPayload = (status) => ({
    invoice_number: form.invoice_number,
    client_id: form.client_id,
    client_name: form.client_name,
    client_email: form.client_email,
    description: form.description || lineItems.map(l => l.description).filter(Boolean).join(', '),
    amount: total,
    status,
    type: form.recurring ? 'recurring' : form.type,
    issue_date: form.issue_date,
    due_date: form.due_date,
    notes: form.notes,
    recurring_interval: form.recurring ? form.recurring_interval : undefined,
    payment_method: form.payment_method,
  });

  const handleSaveDraft = async () => {
    if (!form.client_id) { toast.error('Please select a client'); return; }
    setSaving(true);
    await onSave(buildPayload('draft'));
    setSaving(false);
  };

  const handleSend = async () => {
    if (!form.client_id) { toast.error('Please select a client'); return; }
    setSaving(true);
    await onSave(buildPayload('sent'));
    toast.success(`Invoice sent to ${form.client_name} ✓`);
    setSaving(false);
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--tc-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--tc-foreground)', margin: 0 }}>{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
            <p style={{ fontSize: 12, color: 'var(--tc-muted-foreground)', margin: '2px 0 0' }}>{form.invoice_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--tc-muted)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex' }}><X size={15} color="var(--tc-muted-foreground)" /></button>
        </div>

        {/* Body: 2 columns */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* LEFT: Builder */}
          <div style={{ ...s.col, borderRight: '1px solid var(--tc-muted)' }}>

            {/* RECIPIENT */}
            <SectionTitle>Recipient</SectionTitle>
            <Field label="Client *">
              <select value={form.client_id} onChange={e => handleClientChange(e.target.value)} style={s.input}>
                <option value="">Search or select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ Add new client</option>
              </select>
            </Field>
            {form.client_email && <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)', marginBottom: 14, marginTop: -10 }}>📧 {form.client_email}</div>}

            {/* INVOICE DETAILS */}
            <SectionTitle>Invoice Details</SectionTitle>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Invoice #</label>
                <input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} style={s.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Currency</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)} style={s.input}>
                  <option value="USD">USD — $</option>
                  <option value="EUR">EUR — €</option>
                  <option value="GBP">GBP — £</option>
                  <option value="CAD">CAD — $</option>
                  <option value="AUD">AUD — $</option>
                </select>
              </div>
            </div>
            <Field label="Title / Description">
              <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Monthly Coaching — June 2026" style={s.input} />
            </Field>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} style={s.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Due Date</label>
                <select value={form.due_date} onChange={e => set('due_date', e.target.value)} style={{ ...s.input, marginBottom: 4 }}>
                  {DUE_OPTIONS.map(o => <option key={o.days} value={dueDate(o.days)}>{o.label}</option>)}
                  <option value={form.due_date}>Custom…</option>
                </select>
                <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={{ ...s.input, fontSize: 11 }} />
              </div>
            </div>

            {/* LINE ITEMS */}
            <SectionTitle>Line Items</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr style={{ background: 'var(--tc-background)' }}>
                  {['Description', 'Qty', 'Unit Price', 'Total', ''].map((h, i) => (
                    <th key={i} style={{ padding: '6px 6px', fontSize: 10, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', textAlign: i >= 1 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 4px 4px 0' }}>
                      <input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description…" style={{ ...s.input, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: '4px 4px', width: 48 }}>
                      <input type="number" value={li.qty} onChange={e => updateLine(i, 'qty', e.target.value)} style={{ ...s.input, fontSize: 12, textAlign: 'right', width: 44, padding: '9px 6px' }} />
                    </td>
                    <td style={{ padding: '4px 4px', width: 80 }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', fontSize: 12 }}>$</span>
                        <input type="number" value={li.price} onChange={e => updateLine(i, 'price', e.target.value)} placeholder="0.00" style={{ ...s.input, fontSize: 12, textAlign: 'right', paddingLeft: 16, width: 76, padding: '9px 6px 9px 14px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '4px 4px', width: 70, textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--tc-foreground)' }}>
                      ${(Number(li.qty) * Number(li.price) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '4px 0 4px 4px', width: 24 }}>
                      <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-muted-foreground)', padding: 2 }}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, position: 'relative' }}>
              <button onClick={() => setLineItems([...lineItems, { description: '', qty: 1, price: '' }])}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--tc-accent)', color: 'var(--tc-primary)', border: 'none', cursor: 'pointer' }}>
                <Plus size={12} /> Add Line Item
              </button>
              <button onClick={() => setShowPresets(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--tc-muted)', color: 'var(--tc-muted-foreground)', border: 'none', cursor: 'pointer' }}>
                Presets <ChevronDown size={11} />
              </button>
              {showPresets && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--tc-card)', border: '1px solid var(--tc-border)', borderRadius: 10, padding: '6px 0', boxShadow: '0 8px 24px color-mix(in srgb, black 10%, transparent)', zIndex: 10, minWidth: 200 }}>
                  {LINE_PRESETS.map(p => (
                    <button key={p} onClick={() => addPreset(p)} style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--tc-foreground)', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--tc-background)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRICING */}
            <SectionTitle>Pricing</SectionTitle>
            <div style={{ background: 'var(--tc-background)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
                <label style={{ ...s.label, margin: 0, flex: 1 }}>Discount</label>
                <input type="number" value={form.discount} onChange={e => set('discount', e.target.value)} placeholder="0" style={{ ...s.input, width: 70, padding: '6px 8px', fontSize: 12 }} />
                <button onClick={() => set('discountType', form.discountType === '%' ? '$' : '%')}
                  style={{ padding: '6px 12px', borderRadius: 7, background: 'var(--tc-border)', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {form.discountType}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...s.label, margin: 0, flex: 1 }}>Tax %</label>
                <input type="number" value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0" style={{ ...s.input, width: 70, padding: '6px 8px', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '1.5px solid var(--tc-border)' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tc-foreground)' }}>Total</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--tc-foreground)' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* PAYMENT OPTIONS */}
            <SectionTitle>Payment Options</SectionTitle>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['stripe', '⚡ Stripe'], ['manual', '💸 Manual'], ['both', '🔀 Both']].map(([v, label]) => (
                <button key={v} onClick={() => set('payment_method', v)}
                  style={{ flex: 1, padding: '8px', borderRadius: 9, border: `1.5px solid ${form.payment_method === v ? 'var(--tc-primary)' : 'var(--tc-border)'}`, background: form.payment_method === v ? 'var(--tc-accent)' : 'var(--tc-card)', fontSize: 12, fontWeight: 600, color: form.payment_method === v ? 'var(--tc-primary)' : 'var(--tc-foreground)', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* RECURRING */}
            <SectionTitle>Recurring Invoice</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.recurring ? 12 : 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-foreground)' }}>Make this a recurring invoice</div>
                <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)' }}>Auto-generate at set intervals</div>
              </div>
              <button onClick={() => set('recurring', !form.recurring)}
                style={{ width: 44, height: 24, borderRadius: 9999, background: form.recurring ? 'var(--tc-primary)' : 'var(--tc-border)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tc-card)', position: 'absolute', top: 4, left: form.recurring ? 24 : 4, transition: 'left 0.2s' }} />
              </button>
            </div>
            {form.recurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={s.label}>Frequency</label>
                  <select value={form.recurring_interval} onChange={e => set('recurring_interval', e.target.value)} style={s.input}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Annually</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Start Date</label>
                  <input type="date" value={form.recurring_start} onChange={e => set('recurring_start', e.target.value)} style={s.input} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={s.label}>End Date (or leave blank = until cancelled)</label>
                  <input type="date" value={form.recurring_end} onChange={e => set('recurring_end', e.target.value)} style={s.input} />
                </div>
              </div>
            )}

            {/* NOTES */}
            <SectionTitle>Notes & Terms</SectionTitle>
            <Field label="Notes to client (visible on invoice)">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Thank you for your business!" rows={2} style={{ ...s.input, resize: 'none' }} />
            </Field>
            <Field label="Internal notes (not visible to client)">
              <textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} placeholder="Private notes…" rows={2} style={{ ...s.input, resize: 'none' }} />
            </Field>
            <Field label="Payment Terms">
              <input value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} style={s.input} />
            </Field>

            {/* LATE FEE */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-foreground)' }}>Late fee policy</div>
                <div style={{ fontSize: 11, color: 'var(--tc-muted-foreground)' }}>Charge {form.late_fee_pct}% per month if overdue</div>
              </div>
              <button onClick={() => set('late_fee', !form.late_fee)}
                style={{ width: 44, height: 24, borderRadius: 9999, background: form.late_fee ? 'var(--tc-primary)' : 'var(--tc-border)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tc-card)', position: 'absolute', top: 4, left: form.late_fee ? 24 : 4, transition: 'left 0.2s' }} />
              </button>
            </div>
          </div>

          {/* RIGHT: Live Preview */}
          <div style={{ ...s.col, background: 'var(--tc-background)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Live Preview</div>
            <InvoicePreview form={form} lineItems={lineItems} coachName={coachName} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--tc-muted)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: 'var(--tc-card)' }}>
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--tc-muted)', color: 'var(--tc-foreground)', border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSaveDraft} disabled={saving}
            style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--tc-card)', color: 'var(--tc-foreground)', border: '1.5px solid var(--tc-border)', cursor: 'pointer' }}>
            Save as Draft
          </button>
          <button onClick={handleSend} disabled={saving || !form.client_id}
            style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: (!form.client_id || saving) ? 'var(--tc-border)' : 'linear-gradient(135deg,var(--tc-primary),var(--tc-ai))', color: (!form.client_id || saving) ? 'var(--tc-muted-foreground)' : 'var(--tc-primary-foreground)', border: 'none', cursor: (!form.client_id || saving) ? 'not-allowed' : 'pointer', boxShadow: (!form.client_id || saving) ? 'none' : '0 0 16px color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
            {saving ? 'Saving…' : 'Send Invoice →'}
          </button>
        </div>
      </div>
    </div>
  );
}