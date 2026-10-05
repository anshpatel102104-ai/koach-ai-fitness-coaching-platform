import React from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GoogleCalendarBanner({ connected, onConnect, onDisconnect, syncing, lastSynced }) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border',
      connected
        ? 'bg-success/10 border-success'
        : 'bg-sidebar/5 border-border'
    )}>
      <div className="flex items-center gap-3">
        {/* Google "G" icon */}
        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="var(--kc-4285f4)"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--kc-34a853)"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--kc-fbbc05)"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--kc-ea4335)"/>
          </svg>
        </div>
        <div>
          {connected ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <p className="text-sm font-semibold text-success">Synced with Google Calendar</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-foreground">Connect Google Calendar</p>
          )}
          {connected && lastSynced && (
            <p className="text-xs text-success/70 mt-0.5">Sessions auto-sync to your calendar</p>
          )}
          {!connected && (
            <p className="text-xs text-muted-foreground mt-0.5">Book sessions and sync them to Google Calendar</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {connected && (
          <>
            {syncing && <RefreshCw className="w-3.5 h-3.5 text-success animate-spin" />}
            <Button size="sm" variant="outline" onClick={onDisconnect}
              className="text-xs border-success text-success hover:bg-success/10 h-8">
              Disconnect
            </Button>
          </>
        )}
        {!connected && (
          <Button size="sm" onClick={onConnect}
            className="text-xs bg-sidebar hover:bg-sidebar text-white h-8">
            Connect Google Calendar
          </Button>
        )}
      </div>
    </div>
  );
}