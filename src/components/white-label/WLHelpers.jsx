import React from 'react';
import { Lock } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';

export function WLSection({ title, emoji, description, locked, children }) {
  return (
    <div className={`bg-card rounded-2xl border overflow-hidden transition-opacity ${locked ? 'border-border opacity-60' : 'border-border'}`}
      style={{ boxShadow: '0 1px 8px color-mix(in srgb, black 5%, transparent)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/60">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <div>
            <h2 className="font-bold text-foreground text-sm">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={`p-6 space-y-5 ${locked ? 'pointer-events-none select-none' : ''}`}
        {...(locked ? { inert: '', 'aria-hidden': true } : {})}>{children}</div>
    </div>
  );
}

export function WLRow({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <div className="sm:w-48 flex-shrink-0 pt-0.5">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function WLToggle({ value, onChange, label, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled} type="button"
      className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative rounded-full transition-all flex-shrink-0"
        style={{ width: 40, height: 22, background: value ? 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' : 'var(--tc-border)' }}>
        <div className="absolute top-0.5 rounded-full bg-card shadow transition-all"
          style={{ width: 18, height: 18, left: value ? 20 : 2, transition: 'left 0.15s' }} />
      </div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </button>
  );
}

export function WLInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-xl border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors ${className}`} />
  );
}

export function WLColorPicker({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-xl border-2 border-border overflow-hidden flex-shrink-0 cursor-pointer">
        <input type="color" value={value || 'var(--tc-primary)'} onChange={e => onChange(e.target.value)}
          className="absolute -inset-2 w-16 h-16 cursor-pointer border-none outline-none opacity-100" />
      </div>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="var(--tc-primary)"
        className="w-28 px-3 py-2 rounded-xl border border-border text-foreground text-sm font-mono focus:outline-none focus:border-primary" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export function WLSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-8 py-2 rounded-xl border border-border text-foreground text-sm focus:outline-none focus:border-primary appearance-none bg-card">
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}

export function WLDivider() { return <div className="border-t border-border" />; }

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
    <div className="flex items-center gap-4">
      {url && <SignedImg src={url} alt="preview" className="h-12 w-12 rounded-xl object-contain border border-border bg-muted p-1 flex-shrink-0" />}
      <div>
        <button onClick={() => ref.current?.click()} type="button"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
          {url ? 'Change' : 'Upload'} {label}
        </button>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        {url && <button onClick={() => onChange('')} type="button" className="block text-xs text-destructive hover:text-destructive mt-0.5 font-medium">Remove</button>}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleUpload} />
    </div>
  );
}