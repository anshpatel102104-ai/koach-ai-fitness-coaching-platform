import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel, PanelHeader } from '@/components/kit';
import { Switch } from '@/components/ui/switch';
import { fieldClass, textareaClass } from '@/components/settings/SettingsLayout';

/**
 * Business settings building blocks. Each section is one white panel; rows are
 * label + help on the left, control on the right, separated by hairlines.
 * `icon` is accepted for compatibility but no longer drawn — the section list
 * on the left already carries it.
 */
// eslint-disable-next-line no-unused-vars
export function BSSection({ icon, title, subtitle, onReset, children }) {
  return (
    <Panel>
      <PanelHeader
        title={title}
        subtitle={subtitle}
        className="pb-1"
        right={onReset && (
          <button
            type="button"
            onClick={onReset}
            className="touch-compact text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Restore defaults
          </button>
        )}
      />
      <div className="px-5 pb-3 sm:px-6">{children}</div>
    </Panel>
  );
}

/** Sentence-case group heading inside a section. Starts a new block. */
export function BSGroup({ children }) {
  return (
    <p className="bs-group border-t border-border pb-0 pt-5 text-[13px] font-semibold text-muted-foreground first:border-t-0 first:pt-2">
      {children}
    </p>
  );
}

export function BSRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border py-4 first:border-t-0 [.bs-group+&]:border-t-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="min-w-0 sm:w-[42%] sm:max-w-[300px] sm:pt-2">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <div className="w-full min-w-0 sm:max-w-[440px] sm:flex-1">{children}</div>
    </div>
  );
}

export function BSToggle({ value, onChange, label }) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5">
      <Switch checked={!!value} onCheckedChange={v => onChange(v)} />
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

export function BSSelect({ value, onChange, options, className = '' }) {
  return (
    <div className="relative">
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className={cn(fieldClass, 'appearance-none pr-9', className)}>
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function BSInput({ value, onChange, placeholder, type = 'text', min, max, className = '' }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder} min={min} max={max}
      className={cn(fieldClass, type === 'number' && 'tabular-nums', className)} />
  );
}

export function BSTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className={textareaClass} />
  );
}

/** Kept for compatibility; groups are now separated by BSGroup. */
export function BSDivider() {
  return null;
}

/** Small secondary action used under lists ("Add stage", "Add session type"). */
export function BSAddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-input text-sm font-semibold text-foreground transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}
