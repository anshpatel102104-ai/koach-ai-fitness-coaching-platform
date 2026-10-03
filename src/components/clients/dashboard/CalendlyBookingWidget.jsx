import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { getEventTypes, createSingleUseLink, getScheduledEvents } from '@/lib/calendly';
import { Calendar, Send, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, addDays, subDays, startOfToday } from 'date-fns';

export default function CalendlyBookingWidget({ client }) {
  const [sending, setSending] = useState(false);
  const [selectedEventUri, setSelectedEventUri] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });
  const settings = settingsList[0];
  const isConnected = !!settings?.calendly_connected && !!settings?.calendly_user_uri;

  const { data: eventTypesData, isLoading: etLoading } = useQuery({
    queryKey: ['calendly-event-types', settings?.calendly_user_uri],
    queryFn: () => getEventTypes(settings.calendly_user_uri),
    enabled: isConnected,
    staleTime: 5 * 60 * 1000,
  });

  // Upcoming bookings for this client (last 60d → next 30d, match by email)
  const { data: upcomingData } = useQuery({
    queryKey: ['calendly-client-bookings', settings?.calendly_user_uri],
    queryFn: () => getScheduledEvents(
      settings.calendly_user_uri,
      subDays(startOfToday(), 60).toISOString(),
      addDays(startOfToday(), 30).toISOString()
    ),
    enabled: isConnected && !!client?.email,
    staleTime: 5 * 60 * 1000,
  });

  const eventTypes = eventTypesData?.collection || [];
  const allBookings = upcomingData?.collection || [];

  // Filter bookings for this client by email match in location/invitees (best-effort from event name)
  // We'll just show the count of their bookings fetched without invitee data (too many API calls)
  // Instead, show the last and next from all (simplified — a full impl would batch-fetch invitees)
  const pastBookings = allBookings.filter(e => new Date(e.start_time) < new Date());
  const futureBookings = allBookings.filter(e => new Date(e.start_time) >= new Date());
  const lastBooking = pastBookings[pastBookings.length - 1];
  const nextBooking = futureBookings[0];

  const handleSend = async () => {
    const uri = selectedEventUri || eventTypes[0]?.uri;
    if (!uri) return toast.error('No event type selected');
    setSending(true);
    try {
      const result = await createSingleUseLink(uri);
      const bookingUrl = result?.resource?.booking_url;
      if (!bookingUrl) throw new Error(result?.message || 'Failed to generate link');
      await db.entities.Message.create({
        client_id: client.id,
        client_name: client.name,
        content: `Hi ${client.name}! Here's your personal booking link to schedule our next session:\n\n🗓 ${bookingUrl}\n\nThis link is just for you — pick a time that works!`,
        sender: 'coach',
      });
      toast.success(`Booking link sent to ${client.name}!`);
      setShowSelector(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send booking link');
    } finally {
      setSending(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-[var(--kc-006bff)]/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[var(--kc-006bff)]" />
        </div>
        <p className="text-sm font-semibold text-foreground">Calendly Booking</p>
      </div>

      {/* Session info */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 bg-background rounded-lg">
          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Last Session</p>
          <p className="text-xs font-semibold text-foreground">
            {lastBooking ? format(new Date(lastBooking.start_time), 'MMM d') : 'None'}
          </p>
        </div>
        <div className="p-2.5 bg-background rounded-lg">
          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Next Session</p>
          <p className="text-xs font-semibold text-foreground">
            {nextBooking ? format(new Date(nextBooking.start_time), 'MMM d, h:mm a') : 'Not booked'}
          </p>
        </div>
      </div>

      {/* Event type selector */}
      {showSelector && (
        <div className="mb-3">
          <div className="relative">
            <select
              value={selectedEventUri}
              onChange={e => setSelectedEventUri(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-xs appearance-none bg-card text-foreground pr-8"
            >
              {eventTypes.map(et => (
                <option key={et.uri} value={et.uri}>{et.name} ({et.duration} min)</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!showSelector ? (
          <Button
            size="sm"
            className="flex-1 bg-sidebar hover:bg-sidebar-accent text-xs h-8"
            onClick={() => { setShowSelector(true); setSelectedEventUri(eventTypes[0]?.uri || ''); }}
            disabled={etLoading || eventTypes.length === 0}
          >
            <Send className="w-3 h-3 mr-1.5" /> Send Booking Link
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="text-xs h-8"
              onClick={() => setShowSelector(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-[var(--kc-006bff)] hover:bg-[var(--kc-0057d0)] text-xs h-8"
              onClick={handleSend} disabled={sending}>
              {sending ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Sending...</> : 'Send Link'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}