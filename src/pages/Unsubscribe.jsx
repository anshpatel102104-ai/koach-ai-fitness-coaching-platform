import React from 'react';

// Public unsubscribe landing (Phase 9). Every automated email footer links here
// (_shared/entityEventEmails.js); the route did not exist, so those links 404'd
// — a CAN-SPAM / deliverability problem. This page acknowledges the request.
// NOTE: a full token-based suppression list is a follow-up (REMEDIATION_PLAN);
// until then transactional emails are managed with the coach.
export default function Unsubscribe() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';

  return (
    <div className="fixed inset-0 flex items-center justify-center px-5" style={{ background: 'var(--tc-sidebar, #0f172a)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: 'var(--tc-card, #fff)', border: '1px solid var(--tc-border, #e5e7eb)' }}>
        <div className="text-2xl font-black mb-2" style={{ color: 'var(--tc-foreground, #0f172a)' }}>KOACH AI</div>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--tc-foreground, #0f172a)' }}>
          Notification preferences
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--tc-muted-foreground, #64748b)' }}>
          {email ? <>We’ve received your request for <strong>{email}</strong>. </> : null}
          To stop coaching emails or change what you receive, manage your notification
          settings in the app, or reply to your coach directly and they’ll update your preferences.
        </p>
        <a href="/notification-settings"
          className="inline-block rounded-xl px-5 py-2.5 text-sm font-bold"
          style={{ background: 'var(--tc-primary, #2563eb)', color: 'var(--tc-primary-foreground, #fff)' }}>
          Manage notifications
        </a>
      </div>
    </div>
  );
}
