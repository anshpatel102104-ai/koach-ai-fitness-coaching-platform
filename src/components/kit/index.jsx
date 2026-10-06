/**
 * KOACH UI kit — the small set of building blocks every page is composed from.
 * See DESIGN.md for when to use each. Keep these dumb and presentational.
 */
import React from 'react';
import { cn } from '@/lib/utils';

/* ── Page chrome ─────────────────────────────────────────────────────────── */

/** Page wrapper: canvas padding + max width. */
export function Page({ className, children, wide = false }) {
  return (
    <div className={cn('px-4 py-6 sm:px-6 lg:px-8 lg:py-8 mx-auto w-full', wide ? 'max-w-[1600px]' : 'max-w-[1360px]', className)}>
      {children}
    </div>
  );
}

/**
 * Page header: optional eyebrow ("Jordan Reyes, weeks 5 to 8"), a heavy
 * condensed title, one plain-language sentence, and right-aligned actions.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className, children }) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-muted-foreground mb-1">{eyebrow}</p>}
        <h1 className="text-[32px] sm:text-[40px] text-foreground">{title}</h1>
        {subtitle && <p className="text-[15px] sm:text-base text-muted-foreground mt-1.5 max-w-2xl">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">{actions}</div>}
    </header>
  );
}

/* ── Surfaces ────────────────────────────────────────────────────────────── */

/** Flat white panel on the grey canvas. */
export const Panel = React.forwardRef(function Panel({ className, as: Comp = 'section', ...props }, ref) {
  return <Comp ref={ref} className={cn('panel', className)} {...props} />;
});

/** Panel header row: condensed title + optional right slot. */
export function PanelHeader({ title, subtitle, right, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6 sm:pt-6', className)}>
      <div className="min-w-0">
        <h2 className="text-[22px] text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

/**
 * Ink panel — the dark card used for AI output ("Your AI briefing",
 * "What the AI sees") and for single, high-value prompts. No gradients.
 */
export function InkPanel({ title, children, className, footer }) {
  return (
    <section className={cn('rounded-xl bg-ai text-ai-foreground p-5 sm:p-6 flex flex-col', className)}>
      {title && <h2 className="text-[22px] mb-3">{title}</h2>}
      <div className="flex-1 text-[15px] leading-relaxed text-ai-foreground/90">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </section>
  );
}

/* ── Data display ────────────────────────────────────────────────────────── */

/** Label over a big condensed number. */
export function Stat({ label, value, unit, sub, tone, className, size = 'md' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-foreground';
  return (
    <div className={cn('min-w-0', className)}>
      {label && <p className="text-[13px] text-muted-foreground">{label}</p>}
      <p className={cn('num leading-none mt-1', toneClass, size === 'lg' ? 'text-[40px]' : size === 'sm' ? 'text-xl' : 'text-[26px]')}>
        {value}
        {unit && <span className="text-[0.6em] ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

/** Weekly compliance cell states. */
const CELL = {
  on: 'bg-success',
  partial: 'bg-partial',
  missed: 'hatch-missed',
  none: 'border border-dashed border-input bg-transparent',
};

/** Normalise a 0–100 score (or null) to a cell state. */
export function complianceState(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return 'none';
  if (score >= 80) return 'on';
  if (score >= 50) return 'partial';
  return 'missed';
}

/**
 * Row of weekly compliance cells: green = on plan, amber = partial,
 * red hatch = missed, dashed = no data.
 * @param {{ weeks: Array<'on'|'partial'|'missed'|'none'|number|null>, size?: 'sm'|'md' }} props
 */
export function ComplianceStrip({ weeks = [], size = 'md', className, label }) {
  const dim = size === 'sm' ? 'h-4 w-6' : 'h-[22px] w-[26px]';
  return (
    <div className={cn('flex items-center gap-[5px]', className)} role="img" aria-label={label || 'Weekly compliance'}>
      {weeks.map((w, i) => {
        const state = typeof w === 'number' || w === null ? complianceState(w) : (w || 'none');
        return <span key={i} className={cn('rounded-[4px] flex-shrink-0', dim, CELL[state] || CELL.none)} />;
      })}
    </div>
  );
}

/** Legend for the compliance strip. */
export function ComplianceLegend({ className }) {
  return (
    <div className={cn('flex items-center gap-4 text-[13px] text-foreground/80', className)}>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-success" />On plan</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-partial" />Partial</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] hatch-missed" />Missed</span>
    </div>
  );
}

/** Initials avatar. tone="alert" rings it red for clients who need you. */
export function Initials({ name = '', src, size = 36, tone = 'default', className }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';
  const toneClass = tone === 'alert'
    ? 'bg-destructive/[0.06] text-destructive ring-[1.5px] ring-destructive'
    : tone === 'ink'
      ? 'bg-primary text-primary-foreground'
      : 'bg-secondary text-foreground';
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full flex-shrink-0 font-semibold overflow-hidden', toneClass, className)}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

/** Person row: avatar, name, one line of context. */
export function PersonRow({ name, detail, src, tone, right, onClick, className }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 py-3 text-left', onClick && 'hover:bg-accent/60 -mx-2 px-2 rounded-lg transition-colors', className)}
    >
      <Initials name={name} src={src} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground truncate">{name}</span>
        {detail && <span className="block text-sm text-muted-foreground truncate">{detail}</span>}
      </span>
      {right}
    </Comp>
  );
}

/* ── Controls ────────────────────────────────────────────────────────────── */

/**
 * Segmented control: white track, ink active pill. Use for view switches
 * (Week 5–8, Training day / Rest day, Warm / Direct / Detailed).
 * options: [{ value, label, count? }]
 */
export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg bg-card p-1 shadow-[0_0_0_1px_rgb(var(--border)/0.6)] max-w-full overflow-x-auto scrollbar-hide', className)} role="tablist">
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'touch-compact inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors',
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm',
              active ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground hover:bg-accent'
            )}
          >
            {opt.label}
            {opt.count !== undefined && opt.count !== null && (
              <span className={cn('tabular-nums', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined text link, the references' secondary action style. */
export function TextLink({ children, className, ...props }) {
  const Comp = props.href ? 'a' : 'button';
  return (
    <Comp className={cn('text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2', className)} {...props}>
      {children}
    </Comp>
  );
}

/** Count pill for nav + headings. tone="brand" for things waiting on you. */
export function CountBadge({ count, tone = 'brand', className }) {
  if (!count) return null;
  return (
    <span className={cn(
      'inline-flex min-w-[20px] h-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
      tone === 'brand' ? 'bg-brand text-brand-foreground' : tone === 'danger' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-foreground',
      className
    )}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Quiet empty state: one sentence, one action. */
export function EmptyState({ title, body, action, className }) {
  return (
    <div className={cn('flex flex-col items-start gap-2 px-5 py-8 sm:px-6', className)}>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {body && <p className="text-sm text-muted-foreground max-w-md">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Key/value line used in check-in answers, supplements, client facts. */
export function KeyValue({ label, value, className }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2.5 border-b border-border last:border-b-0', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}
