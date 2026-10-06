import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, MapPin, Link, Phone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format, addMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const SESSION_TYPES = [
  { value: 'check_in', label: 'Check-in call' },
  { value: 'strategy', label: 'Strategy session' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'video_call', label: 'Video call' },
  { value: 'in_person', label: 'In person' },
  { value: 'custom', label: 'Custom' },
];

const LOCATION_TYPES = [
  { value: 'zoom', label: 'Zoom', icon: Video, placeholder: 'https://zoom.us/j/...' },
  { value: 'google_meet', label: 'Google Meet', icon: Video, placeholder: 'https://meet.google.com/...' },
  { value: 'phone', label: 'Phone', icon: Phone, placeholder: 'Phone number or dial-in' },
  { value: 'in_person', label: 'In person', icon: MapPin, placeholder: 'Address or gym name' },
  { value: 'other', label: 'Other', icon: Link, placeholder: 'Meeting link or location' },
];

const EMPTY = {
  client_id: '', client_name: '', title: '', date: '',
  time: '', end_time: '', type: 'check_in', duration_minutes: 60,
  notes: '', meeting_link: '', location_type: 'zoom', status: 'scheduled',
  send_invite: false, google_event_id: '',
  add_zoom: false,
};

export default function SessionFormDialog({
  open, onOpenChange, editing, clients,
  onSave, onDelete, googleConnected, zoomConnected, saving, defaults
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({ ...EMPTY, ...editing });
    } else {
      const base = { ...EMPTY, ...(defaults || {}) };
      // Prefill a title when a client was handed in (e.g. ?clientId=…)
      if (base.client_name && !base.title) base.title = `Check-in call with ${base.client_name}`;
      setForm(base);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const typLabel = SESSION_TYPES.find(t => t.value === form.type)?.label || 'Session';
    setForm(f => ({
      ...f,
      client_id: clientId,
      client_name: client?.name || '',
      title: client ? `${typLabel} with ${client.name}` : f.title,
    }));
  };

  const handleTypeChange = (type) => {
    const label = SESSION_TYPES.find(t => t.value === type)?.label || 'Session';
    setForm(f => ({
      ...f,
      type,
      title: f.client_name ? `${label} with ${f.client_name}` : f.title,
    }));
  };

  const handleTimeChange = (time) => {
    setForm(f => {
      // Auto-set end time = start + duration
      let end_time = f.end_time;
      if (time && f.date) {
        try {
          const start = parseISO(`${f.date}T${time}`);
          const end = addMinutes(start, Number(f.duration_minutes) || 60);
          end_time = format(end, 'HH:mm');
        } catch {}
      }
      return { ...f, time, end_time };
    });
  };

  const handleDurationChange = (duration_minutes) => {
    setForm(f => {
      let end_time = f.end_time;
      if (f.time && f.date) {
        try {
          const start = parseISO(`${f.date}T${f.time}`);
          const end = addMinutes(start, Number(duration_minutes) || 60);
          end_time = format(end, 'HH:mm');
        } catch {}
      }
      return { ...f, duration_minutes, end_time };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const selectedClient = clients.find(c => c.id === form.client_id);

  const chip = (active) => cn(
    'touch-compact inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[13px] font-medium transition-colors',
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-foreground hover:bg-accent'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit session' : 'Book a session'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {editing
              ? `${editing.client_name || editing.title}${editing.date ? `, ${editing.date}` : ''}`
              : 'Pick the client, the time and where it happens.'}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-1">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={form.client_id} onValueChange={handleClientSelect}>
              <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Session type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {SESSION_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)} className={chip(form.type === t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              placeholder="Weekly check-in"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input
                type="time"
                value={form.time}
                onChange={e => handleTimeChange(e.target.value)}
              />
            </div>
          </div>

          {/* Duration + End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Length</Label>
              <Select value={String(form.duration_minutes)} onValueChange={handleDurationChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label>Where</Label>
            <div className="flex gap-1.5 flex-wrap">
              {LOCATION_TYPES.map(lt => {
                const Icon = lt.icon;
                return (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, location_type: lt.value }))}
                    className={chip(form.location_type === lt.value)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {lt.label}
                  </button>
                );
              })}
            </div>
            <Input
              value={form.meeting_link}
              onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
              placeholder={LOCATION_TYPES.find(lt => lt.value === form.location_type)?.placeholder || 'Location details'}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="What you want to cover"
            />
          </div>

          {/* Status (edit only) */}
          {editing && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Integrations */}
          {((zoomConnected && !editing) || googleConnected) && (
            <div className="rounded-lg border border-border divide-y divide-border">
              {zoomConnected && !editing && (
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <Video className="w-4 h-4 flex-shrink-0 text-[var(--kc-2d8cff)]" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground">Create a Zoom meeting</span>
                    <span className="block text-[13px] text-muted-foreground">We message the link to the client.</span>
                  </span>
                  <Switch checked={form.add_zoom} onCheckedChange={v => setForm(f => ({ ...f, add_zoom: v }))} />
                </label>
              )}
              {googleConnected && (
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="var(--kc-4285f4)"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--kc-34a853)"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--kc-fbbc05)"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--kc-ea4335)"/>
                  </svg>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground">Add to Google Calendar</span>
                    <span className="block text-[13px] text-muted-foreground truncate">
                      {selectedClient?.email ? `Sends an invite to ${selectedClient.email}.` : 'Sends an invite to the client.'}
                    </span>
                  </span>
                  <Switch checked={form.send_invite} onCheckedChange={v => setForm(f => ({ ...f, send_invite: v }))} />
                </label>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {editing && (
              <Button type="button" variant="link" className="text-destructive mr-auto" onClick={() => onDelete(editing.id)}>
                Delete session
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Book session'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
