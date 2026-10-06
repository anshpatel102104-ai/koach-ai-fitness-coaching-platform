import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Copy, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
];

export default function AvailabilityDrawer({ onClose, coachId }) {
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState('America/New_York');
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [availability, setAvailability] = useState({});
  const [reminders, setReminders] = useState({});
  const [editingReminder, setEditingReminder] = useState(null);

  // Fetch current availability
  const { data: availData = [] } = useQuery({
    queryKey: ['coachAvailability', coachId],
    queryFn: () => db.entities.CoachAvailability.filter({ coach_id: coachId }),
  });

  const { data: bufferData } = useQuery({
    queryKey: ['bufferTime', coachId],
    queryFn: () => db.entities.BufferTime.filter({ coach_id: coachId }),
  });

  const { data: reminderData } = useQuery({
    queryKey: ['reminders', coachId],
    queryFn: () => db.entities.ReminderSettings.filter({ coach_id: coachId }),
  });

  useEffect(() => {
    if (availData.length > 0) {
      const avail = {};
      availData.forEach(a => {
        avail[a.day_of_week] = a.time_blocks || [];
      });
      setAvailability(avail);
      if (availData[0].timezone) setTimezone(availData[0].timezone);
    }
    if (bufferData?.length > 0) setBufferMinutes(bufferData[0].minutes);
    if (reminderData?.length > 0) {
      setReminders(reminderData[0]);
    }
  }, [availData, bufferData, reminderData]);

  const saveAvailability = async () => {
    for (let day = 0; day < 7; day++) {
      const existing = availData.find(a => a.day_of_week === day);
      const data = { coach_id: coachId, day_of_week: day, time_blocks: availability[day] || [], timezone };
      if (existing) {
        await db.entities.CoachAvailability.update(existing.id, data);
      } else {
        await db.entities.CoachAvailability.create(data);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['coachAvailability'] });
  };

  const saveBuffer = async () => {
    const existing = bufferData?.[0];
    const data = { coach_id: coachId, minutes: bufferMinutes };
    if (existing) {
      await db.entities.BufferTime.update(existing.id, data);
    } else {
      await db.entities.BufferTime.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['bufferTime'] });
  };

  const saveReminders = async () => {
    const existing = reminderData?.[0];
    const data = { coach_id: coachId, ...reminders };
    if (existing) {
      await db.entities.ReminderSettings.update(existing.id, data);
    } else {
      await db.entities.ReminderSettings.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  const handleToggleBlock = (hour) => {
    const blocks = availability[selectedDay] || [];
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
    const existingIdx = blocks.findIndex(b => b.start_time === startTime);
    
    if (existingIdx > -1) {
      blocks.splice(existingIdx, 1);
    } else {
      blocks.push({ start_time: startTime, end_time: endTime, is_available: true });
    }
    setAvailability(prev => ({ ...prev, [selectedDay]: blocks }));
  };

  const handleCopyToWeekdays = () => {
    const source = availability[selectedDay] || [];
    const updated = { ...availability };
    for (let i = 0; i < 5; i++) {
      updated[i] = JSON.parse(JSON.stringify(source));
    }
    setAvailability(updated);
  };

  const handleClearAll = () => {
    setAvailability({});
  };

  const dayBlocks = availability[selectedDay] || [];
  const isAvailable = (hour) => dayBlocks.some(b => b.start_time === `${String(hour).padStart(2, '0')}:00`);

  const hourLabel = (h) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
  const dayHours = dayBlocks.length;

  const reminderRow = ({ label, hint, field, kind }) => (
    <div key={field} className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <Switch
          checked={reminders[field]}
          onCheckedChange={v => setReminders(prev => ({ ...prev, [field]: v }))}
        />
      </div>
      {reminders[field] && (
        <button onClick={() => setEditingReminder(kind)} className="touch-compact mt-1.5 text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
          Edit message
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="fixed right-0 top-0 h-screen w-full sm:w-[420px] bg-card border-l border-border z-50 overflow-y-auto"
        role="dialog"
        aria-label="Availability and reminders"
      >
        <div className="px-6 pt-6 pb-4 sticky top-0 z-10 bg-card border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] text-foreground">Availability</h2>
            <p className="text-sm text-muted-foreground mt-1">When clients can book you, and the reminders they get.</p>
          </div>
          <button onClick={onClose} className="touch-compact p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-7">
          {/* Timezone */}
          <div className="space-y-1.5">
            <Label>Time zone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Weekly availability */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label>Weekly hours</Label>
              <span className="text-[13px] text-muted-foreground">{DAYS[selectedDay]}: {dayHours} {dayHours === 1 ? 'hour' : 'hours'} open</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-3">
              {DAYS.map((day, idx) => {
                const has = (availability[idx] || []).length > 0;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={cn(
                      'touch-compact h-12 rounded-md text-[13px] font-medium transition-colors flex flex-col items-center justify-center gap-0.5',
                      selectedDay === idx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent'
                    )}
                  >
                    {day.slice(0, 3)}
                    <span className={cn('h-1 w-1 rounded-full', has ? (selectedDay === idx ? 'bg-primary-foreground' : 'bg-foreground') : 'bg-transparent')} />
                  </button>
                );
              })}
            </div>

            <p className="text-[13px] text-muted-foreground mb-2">Tap the hours you take sessions.</p>
            <div className="grid grid-cols-4 gap-1 mb-3 max-h-56 overflow-y-auto pr-1">
              {HOURS.map((hour, idx) => (
                <button
                  key={idx}
                  onClick={() => handleToggleBlock(idx)}
                  aria-pressed={isAvailable(idx)}
                  className={cn(
                    'touch-compact h-9 rounded-md text-[13px] tabular-nums transition-colors',
                    isAvailable(idx) ? 'bg-primary text-primary-foreground font-semibold' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {hourLabel(idx)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyToWeekdays} className="flex-1">
                <Copy /> Copy to weekdays
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearAll} className="flex-1">
                <Trash2 /> Clear all
              </Button>
            </div>
          </div>

          {/* Buffer Time */}
          <div className="space-y-1.5">
            <Label>Gap between sessions</Label>
            <Select value={String(bufferMinutes)} onValueChange={v => setBufferMinutes(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No gap</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reminders */}
          <div>
            <h3 className="text-lg text-foreground mb-1">Reminders</h3>
            <p className="text-[13px] text-muted-foreground mb-1">Sent to the client automatically.</p>
            {reminderRow({ label: "A day before", hint: "24 hours ahead of the session", field: "reminder_24h_enabled", kind: "24h" })}
            {reminderRow({ label: "An hour before", hint: "60 minutes ahead", field: "reminder_1h_enabled", kind: "1h" })}
            {reminderRow({ label: "No-show follow-up", hint: "30 minutes after a session marked no-show", field: "noshow_enabled", kind: "noshow" })}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4">
          <Button
            onClick={async () => {
              await Promise.all([saveAvailability(), saveBuffer(), saveReminders()]);
              onClose();
            }}
            className="w-full"
          >
            Save availability
          </Button>
        </div>
      </motion.div>
    </>
  );
}
