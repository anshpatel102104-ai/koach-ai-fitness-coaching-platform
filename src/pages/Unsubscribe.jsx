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
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-background">
      <header className="flex-shrink-0 bg-sidebar px-5 py-4 sm:px-8">
        <img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <h1 className="text-[32px] leading-tight text-foreground">Email preferences</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {email ? <>We've received your request for <strong className="font-semibold text-foreground">{email}</strong>. </> : null}
          To stop coaching emails or change what you get, update your notification settings in the app, or reply to your coach and they'll change it for you.
        </p>
        <a
          href="/notification-settings"
          className="mt-6 inline-flex h-11 w-fit items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
        >
          Manage notifications
        </a>
      </main>
    </div>
  );
}
