import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { getEventTypes } from '@/lib/calendly';
import { Copy, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CalendlyBookingPages() {
  const [collapsed, setCollapsed] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });
  const settings = settingsList[0];
  const isConnected = !!settings?.calendly_connected && !!settings?.calendly_user_uri;

  const { data, isLoading } = useQuery({
    queryKey: ['calendly-event-types', settings?.calendly_user_uri],
    queryFn: () => getEventTypes(settings.calendly_user_uri),
    enabled: isConnected,
    staleTime: 5 * 60 * 1000,
  });

  const eventTypes = data?.collection || [];

  if (!isConnected) return null;

  const copyLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Booking link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-lg bg-card text-sm shadow-[0_0_0_1px_rgb(var(--border)/0.6)] overflow-hidden">
      <button
        type="button"
        className="touch-compact w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
      >
        <span className="h-2 w-2 rounded-full flex-shrink-0 bg-[var(--kc-006bff)]" aria-hidden="true" />
        <span className="flex-1 min-w-0 truncate text-muted-foreground">
          <span className="font-medium text-foreground">Calendly is connected.</span>{' '}
          {isLoading ? 'Loading your booking pages…' : `${eventTypes.length} booking page${eventTypes.length === 1 ? '' : 's'} clients can book from.`}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-foreground flex-shrink-0">
          {collapsed ? 'Show' : 'Hide'}
          <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
        </span>
      </button>

      {!collapsed && (
        <div className="border-t border-border divide-y divide-border">
          {isLoading ? (
            <p className="px-4 py-3 text-muted-foreground">Loading…</p>
          ) : eventTypes.length === 0 ? (
            <p className="px-4 py-3 text-muted-foreground">No active event types in Calendly.</p>
          ) : (
            eventTypes.map(event => (
              <div key={event.uri} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-foreground truncate">{event.name}</p>
                  <p className="text-[13px] text-muted-foreground truncate">
                    {event.duration} min{event.description_plain ? ` · ${event.description_plain}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => copyLink(event.uri, event.scheduling_url)}
                    className="touch-compact inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
                  >
                    {copiedId === event.uri ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === event.uri ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={event.scheduling_url}
                    target="_blank"
                    rel="noreferrer"
                    className="touch-compact inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
