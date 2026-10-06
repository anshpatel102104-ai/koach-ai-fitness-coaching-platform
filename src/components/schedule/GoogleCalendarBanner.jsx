import React from 'react';
import { RefreshCw } from 'lucide-react';

function GoogleG({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="var(--kc-4285f4)"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--kc-34a853)"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--kc-fbbc05)"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--kc-ea4335)"/>
    </svg>
  );
}

/** One quiet line: Google Calendar sync state + the one action. */
export default function GoogleCalendarBanner({ connected, onConnect, onDisconnect, syncing }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5 text-sm shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
      <GoogleG />
      <p className="flex-1 min-w-0 truncate text-muted-foreground">
        {connected
          ? <><span className="font-medium text-foreground">Google Calendar is synced.</span> New sessions can be added to it with an invite.</>
          : <>Connect Google Calendar to see your other events here and send invites.</>}
      </p>
      {connected && syncing && <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin flex-shrink-0" aria-label="Syncing" />}
      <button
        type="button"
        onClick={connected ? onDisconnect : onConnect}
        className="touch-compact flex-shrink-0 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
