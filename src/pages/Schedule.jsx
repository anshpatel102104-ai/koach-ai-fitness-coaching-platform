import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import {
  format, startOfWeek, addDays, addWeeks, addMonths,
  subWeeks, subMonths, subDays, startOfMonth, endOfMonth,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import CalendarHeader from '../components/schedule/CalendarHeader';
import TimeGrid from '../components/schedule/TimeGrid';
import MonthView from '../components/schedule/MonthView';
import AvailabilityDrawer from '../components/schedule/AvailabilityDrawer';
import GoogleCalendarBanner from '../components/schedule/GoogleCalendarBanner';
import SessionFormDialog from '../components/schedule/SessionFormDialog';
import CalendlyBookingPages from '../components/schedule/CalendlyBookingPages';
import { useAuth } from '@/lib/AuthContext';
import { buildSessionEvent } from '@/lib/googleCalendar';
import { sendZapierEvent } from '@/lib/zapier';
import { createZoomMeeting } from '@/lib/zoom';
import { getScheduledEvents } from '@/lib/calendly';

const SESSION_TYPE_COLORS = {
  check_in:  'bg-primary',
  strategy:  'bg-sidebar',
  assessment:'bg-warning',
  video_call:'bg-ai',
  in_person: 'bg-success',
  custom:    'bg-muted-foreground',
};

export default function Schedule() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [view, setView] = useState(isMobile ? 'day' : 'week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => db.entities.Session.list('-date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: coachSettings = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });

  const settings = coachSettings[0];
  const gcalConnected = !!settings?.google_calendar_connected;
  const zoomConnected = !!settings?.zoom_connected && !!settings?.zoom_access_token;
  const calendlyConnected = !!settings?.calendly_connected && !!settings?.calendly_user_uri;

  // Time range for Google Calendar / Calendly fetch
  const monthStart = startOfMonth(currentDate).toISOString();
  const monthEnd = endOfMonth(currentDate).toISOString();

  // ── Calendly data ────────────────────────────────────────────────────────
  const { data: calendlyEventsData } = useQuery({
    queryKey: ['calendly-scheduled', settings?.calendly_user_uri, monthStart, monthEnd],
    queryFn: () => getScheduledEvents(settings.calendly_user_uri, monthStart, monthEnd),
    enabled: calendlyConnected,
    staleTime: 5 * 60 * 1000,
  });

  // Map Calendly events into the same shape as KOACH sessions
  const calendlyEvents = (calendlyEventsData?.collection || []).map(e => ({
    id: `calendly-${e.uri?.split('/').pop()}`,
    title: e.name || 'Calendly Booking',
    date: e.start_time ? e.start_time.slice(0, 10) : '',
    time: e.start_time ? format(new Date(e.start_time), 'HH:mm') : '',
    duration_minutes: e.start_time && e.end_time
      ? Math.round((new Date(e.end_time) - new Date(e.start_time)) / 60000)
      : 60,
    type: 'video_call',
    status: 'scheduled',
    meeting_link: e.location?.join_url || '',
    _isCalendlyEvent: true,
    _calendlyUri: e.uri,
  }));

  const { data: googleEventsData, isFetching: gcalFetching } = useQuery({
    queryKey: ['google-calendar-events', monthStart, monthEnd],
    queryFn: async () => {
      const res = await db.functions.invoke('googleCalendarProxy', {
        action: 'getEvents',
        payload: { timeMin: monthStart, timeMax: monthEnd },
      });
      return res.data?.events || [];
    },
    enabled: gcalConnected,
    staleTime: 5 * 60 * 1000,
  });

  const googleEvents = googleEventsData || [];

  // Merge: google events that are NOT already linked to a koach session
  const linkedGCalIds = new Set(sessions.map(s => s.google_event_id).filter(Boolean));
  const pureGoogleEvents = googleEvents
    .filter(e => !linkedGCalIds.has(e.id))
    .map(e => ({
      id: `gcal-${e.id}`,
      google_event_id: e.id,
      title: e.summary || 'Google Event',
      date: e.start?.date || (e.start?.dateTime ? e.start.dateTime.slice(0, 10) : ''),
      time: e.start?.dateTime ? format(new Date(e.start.dateTime), 'HH:mm') : '',
      duration_minutes: e.start?.dateTime && e.end?.dateTime
        ? Math.round((new Date(e.end.dateTime) - new Date(e.start.dateTime)) / 60000)
        : 60,
      type: 'gcal',
      status: 'scheduled',
      _isGoogleEvent: true,
    }));

  const allEvents = [...sessions, ...pureGoogleEvents, ...calendlyEvents];

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Session.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Session.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const session = sessions.find(s => s.id === id);
      // Delete from Google Calendar if linked
      if (session?.google_event_id && gcalConnected) {
        await db.functions.invoke('googleCalendarProxy', {
          action: 'deleteEvent',
          payload: { eventId: session.google_event_id },
        });
      }
      return db.entities.Session.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowForm(false);
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-settings'] }),
  });

  // ── Google Calendar connect / disconnect ─────────────────────────────────
  const handleConnectGoogle = () => {
    settingsMutation.mutate({ google_calendar_connected: true });
    queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
    toast.success('Google Calendar connected!');
  };

  const handleDisconnectGoogle = () => {
    settingsMutation.mutate({ google_calendar_connected: false });
    queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
    toast.success('Google Calendar disconnected');
  };

  // ── Save session ─────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    setSavingSession(true);
    try {
      const data = { ...form, duration_minutes: Number(form.duration_minutes) };
      let gcalEventId = form.google_event_id;

      if ((form.send_invite || settings?.auto_send_invites) && gcalConnected && !editing) {
        const client = clients.find(c => c.id === form.client_id);
        if (client) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const start = `${form.date}T${form.time || '09:00'}:00`;
          const endDate = form.end_time
            ? `${form.date}T${form.end_time}:00`
            : `${form.date}T${form.time || '09:00'}:00`;
          const gcalEvent = buildSessionEvent(client, {
            start_time: new Date(start).toISOString(),
            end_time: new Date(endDate).toISOString(),
            notes: form.notes,
          });
          const res = await db.functions.invoke('googleCalendarProxy', {
            action: 'createEvent',
            payload: { event: gcalEvent },
          });
          gcalEventId = res.data?.event?.id || '';
          if (gcalEventId) toast.success('Session added to Google Calendar!');
        }
      }

      // Zoom meeting creation
      let zoomData = {};
      if (form.add_zoom && zoomConnected && !editing) {
        const client = clients.find(c => c.id === form.client_id);
        const startISO = form.date && form.time
          ? new Date(`${form.date}T${form.time}:00`).toISOString()
          : new Date().toISOString();
        const zoomMeeting = await createZoomMeeting(settings.zoom_access_token, {
          topic: form.title || `Coaching Session with ${client?.name}`,
          start_time: startISO,
          duration: Number(form.duration_minutes) || 60,
          agenda: form.notes || '',
          waiting_room: settings.zoom_waiting_room !== false,
          auto_record: !!settings.zoom_auto_record,
        });
        if (zoomMeeting.join_url) {
          zoomData = {
            zoom_meeting_id: String(zoomMeeting.id),
            zoom_join_url: zoomMeeting.join_url,
            zoom_start_url: zoomMeeting.start_url,
            zoom_password: zoomMeeting.password || '',
          };
          // Auto-message client with Zoom link
          if (client) {
            const dateStr = form.date ? new Date(form.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : form.date;
            const timeStr = form.time || '';
            await db.entities.Message.create({
              client_id: form.client_id,
              client_name: client.name,
              content: `Hi ${client.name}! Your coaching session is booked 🎉\n\n📅 ${dateStr}\n⏰ ${timeStr}\n\n🔗 Join Zoom: ${zoomMeeting.join_url}${zoomMeeting.password ? `\n\nPassword: ${zoomMeeting.password}` : ''}\n\nSee you then!`,
              sender: 'coach',
            });
          }
          // Zapier zoom created event
          sendZapierEvent('session.zoom_created', {
            client_id: form.client_id,
            client_name: client?.name,
            zoom_join_url: zoomMeeting.join_url,
            start_time: startISO,
          });
          toast.success('Zoom meeting created & client notified!');
        } else {
          toast.error('Zoom: ' + (zoomMeeting.message || 'Failed to create meeting'));
        }
      }

      const finalData = { ...data, google_event_id: gcalEventId, ...zoomData };
      let result;
      if (editing) {
        result = await updateMutation.mutateAsync({ id: editing.id, data: finalData });
      } else {
        result = await createMutation.mutateAsync(finalData);
        const client = clients.find(c => c.id === form.client_id);
        sendZapierEvent('session.booked', {
          client_id: form.client_id,
          client_name: client?.name,
          session_type: form.type,
          date: form.date,
          time: form.time,
        });
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to save session: ' + err.message);
    } finally {
      setSavingSession(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (view === 'month') setCurrentDate(d => subMonths(d, 1));
    else setCurrentDate(d => subDays(d, 1));
  };
  const handleNext = () => {
    if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (view === 'month') setCurrentDate(d => addMonths(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  const headerTitle = (() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const sameMonth = format(weekStart, 'MM') === format(weekEnd, 'MM');
    return `${format(weekStart, 'MMM d')} – ${sameMonth ? format(weekEnd, 'd') : format(weekEnd, 'MMM d')}, ${format(weekEnd, 'yyyy')}`;
  })();

  const weekDays = (() => {
    if (view === 'day') return [currentDate];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  })();

  const openCreate = (date) => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (session) => {
    if (session._isGoogleEvent) return; // can't edit pure google events here
    setEditing(session);
    setShowForm(true);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-screen-2xl mx-auto overflow-x-hidden">
      {/* ── Header ── */}
      <div className="bg-sidebar rounded-xl p-4 sm:p-5 mb-4">
        <h1 className="text-lg sm:text-xl font-semibold text-white">Calendar</h1>
        <p className="text-sm mt-0.5" style={{ color: 'color-mix(in srgb, white 50%, transparent)' }}>Schedule and manage coaching sessions</p>
      </div>

      {/* ── Google Calendar Banner ── */}
      <div className="mb-4">
        <GoogleCalendarBanner
          connected={gcalConnected}
          onConnect={handleConnectGoogle}
          onDisconnect={handleDisconnectGoogle}
          syncing={gcalFetching}
        />
      </div>

      {/* ── Calendly Booking Pages ── */}
      <CalendlyBookingPages />

      <CalendarHeader
        title={headerTitle}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={() => setCurrentDate(new Date())}
        view={view}
        onViewChange={setView}
        onNewSession={() => openCreate(view === 'day' ? currentDate : null)}
        onAvailability={() => setShowAvailability(true)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {view === 'month' ? (
            <MonthView
              currentDate={currentDate}
              sessions={allEvents}
              onDayClick={(day) => { setCurrentDate(day); setView('day'); }}
              onEditSession={openEdit}
              clients={clients}
            />
          ) : (
            <TimeGrid
              days={weekDays}
              sessions={allEvents}
              onEdit={openEdit}
              onNewSession={openCreate}
              clients={clients}
              onUpdate={({ id, data }) => updateMutation.mutate({ id, data })}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Session Form */}
      <SessionFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        clients={clients}
        onSave={handleSave}
        onDelete={(id) => deleteMutation.mutate(id)}
        googleConnected={gcalConnected}
        zoomConnected={zoomConnected}
        saving={savingSession}
      />

      {showAvailability && (
        <AvailabilityDrawer coachId={user?.email} onClose={() => setShowAvailability(false)} />
      )}
    </div>
  );
}