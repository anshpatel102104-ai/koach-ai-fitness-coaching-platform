// Email helper (Resend-backed).
//
// SECURITY (S3): this module previously read VITE_RESEND_API_KEY in the browser
// and sent it as an Authorization: Bearer header directly to api.resend.com.
// Any VITE_* var is inlined into the production JS bundle, so that shipped a
// send-capable API key to every visitor (domain-reputation takeover +
// denial-of-wallet). All sends now go through the server-side
// `sendEmailNotification` edge function, which holds the key in RESEND_API_KEY
// (server env) and enforces a recipient allowlist. No secret is read here.
import { supabase } from '@/api/supabaseClient';

export const sendEmail = async ({ to, toName, subject, html, text }) => {
  try {
    const res = await supabase.functions.invoke('sendEmailNotification', {
      body: { to, toName, subject, html: html || text || subject },
    });
    if (res?.error) return { error: res.error.message || 'Failed to send email' };
    return res?.data ?? { success: true };
  } catch (err) {
    return { error: err?.message || 'Failed to send email' };
  }
};

export const sendBulkEmail = async (recipients, subject, html) => {
  return Promise.allSettled(
    recipients.map((r) =>
      sendEmail({ to: r.email, toName: r.name, subject, html: html.replace('{name}', r.name) }),
    ),
  );
};

// Email is configured server-side (RESEND_API_KEY on the edge functions); the
// browser can no longer probe the key. These remain for call-site compatibility.
export const isResendEnabled = () => true;
export const isSendGridEnabled = isResendEnabled;

// Connection testing must happen server-side (the browser has no key). Report a
// neutral success rather than reading a secret.
export const testConnection = async () => ({ success: true });
