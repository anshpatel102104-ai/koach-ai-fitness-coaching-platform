import React from 'react';
import { NToggle } from './NotifsHelpers';

const DAILY_OPTIONS = [
  { value: 'checkins', label: 'Pending check-in reviews' },
  { value: 'messages', label: 'Unread messages' },
  { value: 'sessions', label: "Today's sessions" },
  { value: 'at_risk', label: 'New at-risk clients' },
  { value: 'invoices', label: 'Outstanding invoices' },
];

const WEEKLY_OPTIONS = [
  { value: 'metrics', label: 'Business metrics' },
  { value: 'progress', label: 'Client progress highlights' },
  { value: 'insights', label: 'AI insights' },
  { value: 'pipeline', label: 'Lead pipeline status' },
  { value: 'revenue', label: 'Revenue snapshot' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_DAILY_INCLUDES = ['checkins', 'messages', 'sessions', 'at_risk', 'invoices'];
const DEFAULT_WEEKLY_INCLUDES = ['metrics', 'progress', 'insights', 'pipeline', 'revenue'];

function MultiCheckGrid({ values = [], onChange, options }) {
  const toggle = (v) => {
    const next = values.includes(v) ? values.filter(x => x !== v) : [...values, v];
    onChange(next);
  };
  return (
    <div className="space-y-2 mt-3">
      {options.map(o => (
        <label key={o.value} className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => toggle(o.value)}
            className={`w-4 h-4 rounded-[4px] flex-shrink-0 border flex items-center justify-center transition-colors cursor-pointer ${values.includes(o.value) ? 'bg-primary border-primary' : 'bg-card border-input'}`}>
            {values.includes(o.value) && (
              <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-foreground">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function NotifsDigest({ s, setField }) {
  const dailyIncludes = s.daily_digest_includes?.length ? s.daily_digest_includes : DEFAULT_DAILY_INCLUDES;
  const weeklyIncludes = s.weekly_digest_includes?.length ? s.weekly_digest_includes : DEFAULT_WEEKLY_INCLUDES;

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-border">
        <h2 className="text-[20px] text-foreground">Email digests</h2>
      </div>
      <div className="p-5 sm:p-6 space-y-6">
        {/* Daily Digest */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[15px] font-semibold text-foreground">Daily digest</p>
              <p className="text-sm text-muted-foreground mt-0.5">A short summary in your inbox each morning</p>
            </div>
            <NToggle value={s.daily_digest_enabled !== false} onChange={v => setField('daily_digest_enabled', v)} />
          </div>
          {s.daily_digest_enabled !== false && (
            <div className="ml-0 space-y-3 p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-medium w-20 flex-shrink-0">Delivery time</span>
                <input type="time" value={s.daily_digest_time || '07:00'}
                  onChange={e => setField('daily_digest_time', e.target.value)}
                  className="h-8 px-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium text-foreground" />
              </div>
              <div>
                <p className="text-[13px] text-muted-foreground mb-1">Include</p>
                <MultiCheckGrid values={dailyIncludes} onChange={v => setField('daily_digest_includes', v)} options={DAILY_OPTIONS} />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Weekly Digest */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[15px] font-semibold text-foreground">Weekly digest</p>
              <p className="text-sm text-muted-foreground mt-0.5">Your business and clients, once a week</p>
            </div>
            <NToggle value={s.weekly_digest_enabled !== false} onChange={v => setField('weekly_digest_enabled', v)} />
          </div>
          {s.weekly_digest_enabled !== false && (
            <div className="space-y-3 p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Send on</span>
                <div className="relative">
                  <select value={String(s.weekly_digest_day ?? 1)} onChange={e => setField('weekly_digest_day', Number(e.target.value))}
                    className="pl-2.5 pr-7 py-1.5 rounded-lg border border-border text-sm font-semibold text-foreground focus:outline-none focus:border-primary appearance-none bg-card">
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <span className="text-sm text-muted-foreground font-medium flex-shrink-0">at</span>
                <input type="time" value={s.weekly_digest_time || '08:00'}
                  onChange={e => setField('weekly_digest_time', e.target.value)}
                  className="h-8 px-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium text-foreground" />
              </div>
              <div>
                <p className="text-[13px] text-muted-foreground mb-1">Include</p>
                <MultiCheckGrid values={weeklyIncludes} onChange={v => setField('weekly_digest_includes', v)} options={WEEKLY_OPTIONS} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}