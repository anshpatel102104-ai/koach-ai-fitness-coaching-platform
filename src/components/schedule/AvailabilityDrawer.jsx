import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Copy, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

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

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-card border-l border-border shadow-lg z-50 overflow-y-auto"
    >
      <div className="p-6 sticky top-0 bg-card border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Availability & Reminders</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Timezone */}
        <div>
          <Label className="mb-2 block">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Weekly Availability Grid */}
        <div>
          <Label className="mb-3 block">Weekly Availability</Label>
          <div className="space-y-2 mb-4">
            {DAYS.map((day, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDay(idx)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  selectedDay === idx ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-[var(--kc-eaecf5)]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="space-y-1 mb-4 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
            {HOURS.map((hour, idx) => (
              <button
                key={idx}
                onClick={() => handleToggleBlock(idx)}
                className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                  isAvailable(idx) ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                }`}
              >
                {hour} - {HOURS[idx + 1] || '24:00'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyToWeekdays} className="flex-1">
              <Copy className="w-4 h-4 mr-1" /> Copy to Weekdays
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearAll} className="flex-1">
              <Trash2 className="w-4 h-4 mr-1" /> Clear All
            </Button>
          </div>
        </div>

        {/* Buffer Time */}
        <div>
          <Label className="mb-2 block">Buffer Between Sessions</Label>
          <Select value={String(bufferMinutes)} onValueChange={v => setBufferMinutes(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No buffer</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reminders */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Automated Reminders</h3>
          
          <div className="space-y-3">
            {/* 24h Reminder */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">24h before</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Day before reminder</p>
              </div>
              <Switch
                checked={reminders.reminder_24h_enabled}
                onCheckedChange={v => setReminders(prev => ({ ...prev, reminder_24h_enabled: v }))}
              />
            </div>
            {reminders.reminder_24h_enabled && (
              <button onClick={() => setEditingReminder('24h')} className="text-xs text-primary hover:underline ml-0">
                Edit message
              </button>
            )}

            {/* 1h Reminder */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">1 hour before</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Hour before reminder</p>
              </div>
              <Switch
                checked={reminders.reminder_1h_enabled}
                onCheckedChange={v => setReminders(prev => ({ ...prev, reminder_1h_enabled: v }))}
              />
            </div>
            {reminders.reminder_1h_enabled && (
              <button onClick={() => setEditingReminder('1h')} className="text-xs text-primary hover:underline ml-0">
                Edit message
              </button>
            )}

            {/* No-show Follow-up */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">No-show follow-up</Label>
                <p className="text-xs text-muted-foreground mt-0.5">After 30 min if marked no-show</p>
              </div>
              <Switch
                checked={reminders.noshow_enabled}
                onCheckedChange={v => setReminders(prev => ({ ...prev, noshow_enabled: v }))}
              />
            </div>
            {reminders.noshow_enabled && (
              <button onClick={() => setEditingReminder('noshow')} className="text-xs text-primary hover:underline ml-0">
                Edit message
              </button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={async () => {
            await Promise.all([saveAvailability(), saveBuffer(), saveReminders()]);
            onClose();
          }}
          className="w-full"
        >
          Save Settings
        </Button>
      </div>
    </motion.div>
  );
}