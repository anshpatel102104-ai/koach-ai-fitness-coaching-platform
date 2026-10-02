/**
 * Shared Resend mailer (Step 5c). Single place that talks to the Resend API so
 * sendEmailNotification and the DB-trigger automation functions send identical
 * envelopes. Mirrors base44/functions/sendEmailNotification's payload exactly.
 *
 * Env: RESEND_API_KEY (required), FROM_NAME / FROM_EMAIL (preferred) with the
 * Base44-era VITE_FROM_NAME / VITE_FROM_EMAIL still honored as fallbacks.
 */

export function resendConfigured() {
  return Boolean(Deno.env.get('RESEND_API_KEY'));
}

/**
 * Send one email. Returns { ok, id?, error?, details? } — never throws, so
 * fire-and-forget callers can't crash a trigger path on mailer trouble.
 */
export async function sendResendEmail({ to, toName, subject, html, text, replyTo }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };
  if (!to || !subject || (!html && !text)) {
    return { ok: false, error: 'Missing required fields: to, subject, html' };
  }

  const fromName = Deno.env.get('FROM_NAME') || Deno.env.get('VITE_FROM_NAME') || 'KOACH AI';
  const fromEmail = Deno.env.get('FROM_EMAIL') || Deno.env.get('VITE_FROM_EMAIL') || 'onboarding@resend.dev';

  const payload = {
    from: `${fromName} <${fromEmail}>`,
    // Base44's trigger functions addressed recipients as "Name <email>"
    to: toName ? [`${toName} <${to}>`] : [to],
    subject,
    // Base44's Core.SendEmail took plain-text `body`; preserve those callers by
    // accepting `text` and wrapping it, while html callers pass through as-is.
    html: html || `<pre style="font-family:inherit;white-space:pre-wrap;margin:0">${escapeHtml(text)}</pre>`,
  };
  if (replyTo) payload.reply_to = replyTo;

  // Deliverability + compliance (Phase 9): advertise an unsubscribe endpoint.
  // The footer links here too; this header lets inbox providers surface a
  // one-click unsubscribe.
  const appUrl = Deno.env.get('APP_URL') || 'https://app.koachai.net';
  payload.headers = {
    'List-Unsubscribe': `<${appUrl}/unsubscribe?email=${encodeURIComponent(to)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: result.message || 'Resend API error', details: result };
    }
    return { ok: true, id: result.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
