import React from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { BSSection, BSRow, BSToggle, BSSelect, BSInput, BSTextarea, BSGroup, BSAddButton } from './BSSection';
import { cn } from '@/lib/utils';
import { fieldClass } from '@/components/settings/SettingsLayout';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const RESPONSE_TIMES = [
  { value: '1h', label: 'Within 1 hour' }, { value: '4h', label: 'Within 4 hours' },
  { value: '24h', label: 'Within 24 hours' }, { value: '48h', label: 'Within 48 hours' },
  { value: 'best_effort', label: 'Best effort' },
];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30].map(m => ({ value: m, label: m === 0 ? 'No buffer' : `${m} min` }));
const DEFAULT_HOURS = { start: '09:00', end: '18:00', enabled: true };
const DEFAULT_WORKING_HOURS = Object.fromEntries(DAYS.map((d, i) => [d, i < 5 ? { ...DEFAULT_HOURS } : { ...DEFAULT_HOURS, enabled: false }]));
const DEFAULT_SESSION_TYPES = [
  { id: '1', name: 'Check-in Call', duration: 30 },
  { id: '2', name: 'Program Review', duration: 45 },
  { id: '3', name: 'Onboarding Call', duration: 60 },
];

const DEFAULTS = {
  working_hours: DEFAULT_WORKING_HOURS, response_time: '24h',
  auto_reply_enabled: false, auto_reply_message: '',
  allow_session_requests: true, session_types: DEFAULT_SESSION_TYPES,
  booking_notice_hours: 24, max_sessions_per_month: 0, session_buffer_minutes: 0,
};

export default function BSScheduling({ s, set }) {
  const hours = s.working_hours || DEFAULT_WORKING_HOURS;
  const sessionTypes = s.session_types || DEFAULT_SESSION_TYPES;

  const updateDay = (day, field, val) => set('working_hours', { ...hours, [day]: { ...(hours[day] || DEFAULT_HOURS), [field]: val } });
  const copyMonToWeekdays = () => {
    const mon = hours['Monday'] || DEFAULT_HOURS;
    const next = { ...hours };
    ['Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => { next[d] = { ...mon }; });
    set('working_hours', next);
  };

  const addSessionType = () => set('session_types', [...sessionTypes, { id: Date.now().toString(), name: 'Custom Session', duration: 60 }]);
  const updateSession = (id, field, val) => set('session_types', sessionTypes.map(st => st.id === id ? { ...st, [field]: val } : st));
  const removeSession = (id) => set('session_types', sessionTypes.filter(st => st.id !== id));

  return (
    <BSSection icon={Calendar} title="Scheduling" subtitle="When you work, how fast you reply, and how clients book calls." onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      <BSGroup>Working hours</BSGroup>
      <BSRow label="Day availability" hint="Clients see when you are around.">
        <div className="space-y-2">
          {DAYS.map(day => {
            const d = hours[day] || DEFAULT_HOURS;
            return (
              <div key={day} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <BSToggle value={d.enabled} onChange={v => updateDay(day, 'enabled', v)} />
                <span className="text-sm font-medium text-foreground w-10 flex-shrink-0">{day.slice(0, 3)}</span>
                {d.enabled && (
                  <>
                    <input type="time" value={d.start || '09:00'} onChange={e => updateDay(day, 'start', e.target.value)}
                      className={cn(fieldClass, 'w-auto px-2 tabular-nums')} />
                    <span className="text-muted-foreground text-sm">to</span>
                    <input type="time" value={d.end || '18:00'} onChange={e => updateDay(day, 'end', e.target.value)}
                      className={cn(fieldClass, 'w-auto px-2 tabular-nums')} />
                  </>
                )}
                {!d.enabled && <span className="text-muted-foreground text-sm">Off</span>}
              </div>
            );
          })}
          <button onClick={copyMonToWeekdays} className="touch-compact mt-1 text-sm font-semibold text-foreground underline underline-offset-4">
            Copy Monday to all weekdays
          </button>
        </div>
      </BSRow>
      <BSGroup>Response time</BSGroup>
      <BSRow label="Expected response time" hint="Shown to clients in their app.">
        <BSSelect value={s.response_time} onChange={v => set('response_time', v)} options={RESPONSE_TIMES} />
      </BSRow>
      <BSRow label="Auto-reply outside hours" hint="Sent when a client messages outside your hours.">
        <div className="space-y-2">
          <BSToggle value={s.auto_reply_enabled} onChange={v => set('auto_reply_enabled', v)} />
          {s.auto_reply_enabled && (
            <BSTextarea value={s.auto_reply_message} onChange={v => set('auto_reply_message', v)}
              placeholder="Thanks for your message. I'll reply within [response time]. Coach [Name]" rows={2} />
          )}
        </div>
      </BSRow>
      <BSGroup>Session booking</BSGroup>
      <BSRow label="Allow session requests">
        <BSToggle value={s.allow_session_requests} onChange={v => set('allow_session_requests', v)} />
      </BSRow>
      {s.allow_session_requests && <>
        <BSRow label="Session types">
          <div className="space-y-2">
            {sessionTypes.map(st => (
              <div key={st.id} className="flex items-center gap-2">
                <input value={st.name} onChange={e => updateSession(st.id, 'name', e.target.value)}
                  className={cn(fieldClass, 'flex-1')} />
                <BSInput type="number" value={st.duration} onChange={v => updateSession(st.id, 'duration', v)} min={15} className="w-20" />
                <span className="text-sm text-muted-foreground flex-shrink-0">min</span>
                <button onClick={() => removeSession(st.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <BSAddButton onClick={addSessionType}><Plus className="w-4 h-4" /> Add session type</BSAddButton>
          </div>
        </BSRow>
        <BSRow label="Booking notice required">
          <div className="flex items-center gap-2">
            <BSInput type="number" value={s.booking_notice_hours} onChange={v => set('booking_notice_hours', v)} min={0} className="w-24" />
            <span className="text-sm text-muted-foreground">hours in advance</span>
          </div>
        </BSRow>
        <BSRow label="Sessions per client each month" hint="Set 0 for no limit.">
          <BSInput type="number" value={s.max_sessions_per_month} onChange={v => set('max_sessions_per_month', v)} min={0} className="w-24" />
        </BSRow>
        <BSRow label="Buffer between sessions">
          <BSSelect value={String(s.session_buffer_minutes)} onChange={v => set('session_buffer_minutes', Number(v))}
            options={BUFFER_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))} />
        </BSRow>
      </>}
    </BSSection>
  );
}