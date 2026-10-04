import { db } from '@/api/supabaseClient';

const invoke = (action, payload = {}) =>
  db.functions.invoke('zoomProxy', { action, payload }).then(r => r.data);

export const testZoomConnection = () => invoke('testConnection');

export const createZoomMeeting = (meetingData) =>
  invoke('createMeeting', {
    topic: meetingData.topic,
    start_time: meetingData.start_time,
    duration: meetingData.duration || 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    agenda: meetingData.agenda || '',
    waiting_room: meetingData.waiting_room !== false,
    auto_record: meetingData.auto_record || false,
  });

export const deleteZoomMeeting = (meetingId) =>
  invoke('deleteMeeting', { meeting_id: meetingId });

export const getZoomMeeting = (meetingId) =>
  invoke('getMeeting', { meeting_id: meetingId });