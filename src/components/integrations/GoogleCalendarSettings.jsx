import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

export default function GoogleCalendarSettings({ open, onClose }) {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
    enabled: open,
  });

  const current = settings[0];

  const [form, setForm] = useState({
    google_calendar_id: 'primary',
    default_session_duration: 60,
    buffer_time: 0,
    auto_send_invites: false,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
  });

  useEffect(() => {
    if (current) {
      setForm({
        google_calendar_id: current.google_calendar_id || 'primary',
        default_session_duration: current.default_session_duration || 60,
        buffer_time: current.buffer_time || 0,
        auto_send_invites: !!current.auto_send_invites,
        working_hours_start: current.working_hours_start || '09:00',
        working_hours_end: current.working_hours_end || '18:00',
      });
    }
  }, [current]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      current?.id
        ? db.entities.CoachSettings.update(current.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Calendar settings saved!');
      onClose();
    },
  });

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-sidebar px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="var(--kc-4285f4)"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--kc-34a853)"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--kc-fbbc05)"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--kc-ea4335)"/>
              </svg>
            </div>
            <div>
              <SheetTitle className="text-white text-lg font-bold">Google Calendar Settings</SheetTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-success" />
                <span className="text-xs text-success">Connected</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Default session duration */}
          <div>
            <Label className="text-sm font-semibold text-foreground">Default Session Duration</Label>
            <Select
              value={String(form.default_session_duration)}
              onValueChange={v => setForm(f => ({ ...f, default_session_duration: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buffer time */}
          <div>
            <Label className="text-sm font-semibold text-foreground">Buffer Time Between Sessions</Label>
            <Select
              value={String(form.buffer_time)}
              onValueChange={v => setForm(f => ({ ...f, buffer_time: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Working hours */}
          <div>
            <Label className="text-sm font-semibold text-foreground">Working Hours</Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start</p>
                <Input
                  type="time"
                  value={form.working_hours_start}
                  onChange={e => setForm(f => ({ ...f, working_hours_start: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End</p>
                <Input
                  type="time"
                  value={form.working_hours_end}
                  onChange={e => setForm(f => ({ ...f, working_hours_end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Auto-send invites */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background">
            <div>
              <p className="text-sm font-semibold text-foreground">Auto-send invites to clients</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically add client as attendee when booking</p>
            </div>
            <Switch
              checked={form.auto_send_invites}
              onCheckedChange={v => setForm(f => ({ ...f, auto_send_invites: v }))}
            />
          </div>

          <Button
            className="w-full bg-sidebar hover:bg-sidebar text-white"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}