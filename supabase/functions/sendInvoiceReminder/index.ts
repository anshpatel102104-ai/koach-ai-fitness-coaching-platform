// Supabase Edge Function: sendInvoiceReminder  (Migration Step 5e)
//
// Faithful port of base44/functions/sendInvoiceReminder. The invoice lookup
// is ownership-checked explicitly (Base44 relied on the user-scoped list);
// the email goes through the shared mailer and the in-app copy through the
// shared sendMessage executor.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { sendResendEmail } from '../_shared/resendEmail.js';
import { sendMessage } from '../_shared/automationActions.js';
import { ownsClient } from '../_shared/ownership.js';
import { safeSubject } from '../_shared/escapeHtml.js';
import { serve } from '../_shared/observe.js';

serve('sendInvoiceReminder', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    const userId = caller.auth.id;

    const { invoice_id, message_override } = await req.json();
    if (!invoice_id) return jsonResponse({ error: 'invoice_id required' }, 400);

    const { data: invoice } = await svc.from('invoices').select('*').eq('id', invoice_id).maybeSingle();
    if (!invoice) return jsonResponse({ error: 'Invoice not found' }, 404);
    // ownership: the invoice's creator, or the owner of its client
    const owned = invoice.created_by === userId
      || (invoice.client_id && await ownsClient(svc, userId, invoice.client_id));
    if (!owned) return jsonResponse({ error: 'Invoice not found' }, 404);

    const firstName = (invoice.client_name || '').split(' ')[0] || 'there';
    const coachFirst = (caller.profile.full_name || 'Your Coach').split(' ')[0];

    const defaultMessage = `Hi ${firstName}, this is a friendly reminder that invoice ${invoice.invoice_number} for $${Number(invoice.amount).toFixed(2)} is due on ${invoice.due_date || 'soon'}. Please make your payment at your earliest convenience. Thank you! — Coach ${coachFirst}`;
    const body = message_override || defaultMessage;

    const results = [];

    // Email reminder — the recipient is resolved from the caller-owned clients
    // row, never from invoice.client_email (a free-text column the invoice
    // author controls, which would make this an arbitrary-recipient mailer).
    if (!invoice.client_id || !(await ownsClient(svc, userId, invoice.client_id))) {
      return jsonResponse({ error: 'Invoice has no linked client to remind' }, 400);
    }
    const { data: client } = await svc.from('clients').select('email')
      .eq('id', invoice.client_id).maybeSingle();
    const recipient = typeof client?.email === 'string' ? client.email.trim() : '';
    if (!recipient) {
      return jsonResponse({ error: 'Client has no email address on file' }, 400);
    }
    {
      const sent = await sendResendEmail({
        to: recipient,
        subject: safeSubject(`Payment Reminder: Invoice ${invoice.invoice_number} — $${Number(invoice.amount).toFixed(2)}`),
        text: body,
        replyTo: caller.profile.email,
      });
      if (sent.ok) results.push('email');
    }

    // In-app message (shared executor — same write path as automations)
    if (invoice.client_id) {
      await sendMessage(svc, {
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        sender: 'coach',
        content: `⏰ Payment Reminder: ${body}`,
        tag: 'general',
        created_by: userId,
      });
      results.push('message');
    }

    return jsonResponse({ success: true, sent_via: results });
  } catch (error) {
    console.error('[sendInvoiceReminder] error:', error);
    return jsonResponse({ error: 'Could not send reminder' }, 500);
  }
});
