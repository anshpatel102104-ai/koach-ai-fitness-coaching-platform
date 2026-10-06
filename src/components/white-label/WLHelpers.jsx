import React from 'react';
import { Lock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel, PanelHeader } from '@/components/kit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SignedImg } from '@/components/shared/SignedImage';
import { fieldClass } from '@/components/settings/SettingsLayout';

/** True for #rgb / #rrggbb strings — the only values a native colour input accepts. */
export const isHexColor = (c) => typeof c === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(c.trim());

/** Section panel. `emoji` is accepted for compatibility and ignored. */
// eslint-disable-next-line no-unused-vars
export function WLSection({ title, emoji, description, locked, children }) {
  return (
    <Panel className={cn('transition-opacity', locked && 'opacity-60')}>
      <PanelHeader
        title={title}
        subtitle={description}
        className="pb-1"
        right={locked && <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Elite plan</Badge>}
      />
      <div className={cn('px-5 pb-3 sm:px-6', locked && 'pointer-events-none select-none')}
        {...(locked ? { inert: '', 'aria-hidden': true } : {})}>{children}</div>
    </Panel>
  );
}

/** Sentence-case group heading inside a section. */
export function WLGroup({ children, right }) {
  return (
    <div className="wl-group flex items-center justify-between gap-3 border-t border-border pt-5 first:border-t-0 first:pt-2">
      <p className="text-[13px] font-semibold text-muted-foreground">{children}</p>
      {right}
    </div>
  );
}

export function WLRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border py-4 first:border-t-0 [.wl-group+&]:border-t-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:w-[40%] sm:max-w-[260px] sm:pt-2">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <div className="w-full min-w-0 sm:flex-1">{children}</div>
    </div>
  );
}

export function WLToggle({ value, onChange, label, disabled }) {
  return (
    <label className={cn('inline-flex min-h-10 items-center gap-2.5', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <Switch checked={!!value} onCheckedChange={v => !disabled && onChange(v)} disabled={disabled} />
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

export function WLInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={cn(fieldClass, className)} />
  );
}

export function WLColorPicker({ value, onChange, label, fallback = '#0A5CFF' }) {
  const hex = isHexColor(value) ? value : fallback;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-card pl-1.5 pr-1">
        <input type="color" value={hex} onChange={e => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0" aria-label={label || 'Pick a colour'} />
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={fallback}
          className="h-8 w-24 bg-transparent font-mono text-[13px] uppercase text-foreground focus:outline-none" />
      </label>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export function WLSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className={cn(fieldClass, 'appearance-none pr-9')}>
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

/** Kept for compatibility; groups are separated by WLGroup now. */
export function WLDivider() { return null; }

/** Plan note under a gated control. */
export function WLPlanNote({ children }) {
  return <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><Lock className="h-3.5 w-3.5" />{children}</p>;
}

export function WLUploadButton({ label, hint, url, onChange, accept = 'image/*' }) {
  const ref = React.useRef();
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { db } = await import('@/api/supabaseClient');
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
    onChange(file_url);
  };
  return (
    <div className="flex items-center gap-3">
      {url
        ? <SignedImg src={url} alt="preview" className="h-12 w-12 flex-shrink-0 rounded-lg border border-border bg-secondary object-contain p-1" />
        : <span className="h-12 w-12 flex-shrink-0 rounded-lg border border-dashed border-input" />}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
            {url ? 'Change' : 'Upload'} {label?.toLowerCase()}
          </Button>
          {url && <Button type="button" variant="link" size="sm" className="text-destructive" onClick={() => onChange('')}>Remove</Button>}
        </div>
        {hint && <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleUpload} />
    </div>
  );
}
