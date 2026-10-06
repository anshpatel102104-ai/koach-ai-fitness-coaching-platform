import React from 'react';
import { cn } from '@/lib/utils';

/** Settings section: flat white panel, condensed title, text actions on the right. */
export function NSection({ title, onReset, onTest, children }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 sm:px-6 pt-5 pb-3">
        <h2 className="text-[20px] text-foreground">{title}</h2>
        <div className="flex items-center gap-3">
          {onTest && (
            <button
              onClick={onTest}
              className="touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              Send a test
            </button>
          )}
          <button
            onClick={onReset}
            className="touch-compact text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="divide-y divide-border border-t border-border">{children}</div>
    </section>
  );
}

/** On/off switch: ink when on, hairline grey when off. */
export function NToggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      role="switch"
      aria-checked={!!value}
      className={cn(
        'touch-compact relative flex-shrink-0 rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-input',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      )}
      style={{ width: 40, height: 22 }}
      type="button"
    >
      <span
        className="absolute top-0.5 rounded-full bg-card"
        style={{ width: 18, height: 18, left: value ? 20 : 2, transition: 'left 0.15s' }}
      />
    </button>
  );
}

const SEG_TRACK = 'inline-flex items-center gap-0.5 rounded-lg bg-card p-0.5 shadow-[0_0_0_1px_rgb(var(--border)/0.9)]';
const SEG_BTN = 'touch-compact h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors';

export function NDelivery({ value = 'push_email', onChange, options = ['off', 'push', 'email', 'push_email'] }) {
  const LABELS = { off: 'Off', push: 'Push', email: 'Email', push_email: 'Push and email' };
  return (
    <div className={SEG_TRACK}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(SEG_BTN, value === o ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent')}
        >
          {LABELS[o]}
        </button>
      ))}
    </div>
  );
}

export function NSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="h-8 pl-2.5 pr-7 rounded-lg border border-input text-[13px] text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-card"
      >
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}

export function NMultiCheck({ values = [], onChange, options }) {
  const toggle = (v) => {
    const next = values.includes(v) ? values.filter(x => x !== v) : [...values, v];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const active = values.includes(val);
        return (
          <button
            key={val}
            type="button"
            onClick={() => toggle(val)}
            className={cn(
              'touch-compact h-7 px-2.5 rounded-md text-[12px] font-medium border transition-colors',
              active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground/80 border-input hover:bg-accent'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function NRow({ enabled, title, description, locked, children, onToggle }) {
  return (
    <div className="px-5 sm:px-6 py-4">
      <div className="flex items-start gap-4">
        <NToggle value={enabled} onChange={onToggle} disabled={locked} />
        <div className={cn('flex-1 min-w-0', !enabled && !locked && 'opacity-60')}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-foreground">{title}</p>
            {locked && <span className="text-[12px] font-medium text-muted-foreground">Always on</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          {enabled && <div className="mt-3 flex flex-wrap gap-3 items-center">{children}</div>}
        </div>
      </div>
    </div>
  );
}
