/**
 * Shared presentational bits for the Business area (Billing, Insights,
 * Schedule): stat strips, status dots, money formatting, chart styling and
 * the section switchers. Built on the kit — see DESIGN.md.
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Panel, Segmented } from '@/components/kit';

/* ── Money ──────────────────────────────────────────────────────────────── */

/** $4,820 or $4,820.50 (cents only when asked). */
export function money(n, { cents = false, compact = false } = {}) {
  const v = Number(n || 0);
  if (compact && Math.abs(v) >= 10000) return `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k`;
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

/** Short axis label: $1.2k, $800. */
export function moneyAxis(v) {
  if (!v) return '';
  return v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`;
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/* ── Stat strip ─────────────────────────────────────────────────────────── */

const LG_COLS = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };

/**
 * One white panel holding a row of label/number pairs separated by hairline
 * vertical rules (the check-in review stat row, on a panel).
 * items: [{ label, value, unit?, sub?, tone? }]
 */
export function StatStrip({ items = [], className }) {
  const n = items.length;
  return (
    <Panel className={cn('grid grid-cols-2 overflow-hidden', LG_COLS[n] || 'lg:grid-cols-4', className)}>
      {items.map((it, i) => {
        const lastOdd = n % 2 === 1 && i === n - 1;
        return (
          <div
            key={it.label}
            className={cn(
              'min-w-0 px-5 py-4 sm:px-6 sm:py-5 border-border',
              i % 2 === 1 && 'border-l',
              i >= 2 && 'border-t lg:border-t-0',
              i > 0 && 'lg:border-l',
              lastOdd && 'col-span-2 lg:col-span-1'
            )}
          >
            <p className="text-[13px] text-muted-foreground truncate">{it.label}</p>
            <p className={cn(
              'num leading-none mt-1.5 text-[26px] sm:text-[30px]',
              it.tone === 'danger' ? 'text-destructive' : it.tone === 'success' ? 'text-success' : it.tone === 'warning' ? 'text-warning' : 'text-foreground'
            )}>
              {it.value}
              {it.unit && <span className="text-[0.55em] ml-1">{it.unit}</span>}
            </p>
            {it.sub && <p className="text-[13px] text-muted-foreground mt-1.5 truncate">{it.sub}</p>}
          </div>
        );
      })}
    </Panel>
  );
}

/* ── Status text ────────────────────────────────────────────────────────── */

const DOT = {
  success: 'bg-success',
  danger: 'bg-destructive',
  warning: 'bg-partial',
  brand: 'bg-brand',
  muted: 'bg-muted-foreground/50',
};
const TEXT = {
  success: 'text-foreground',
  danger: 'text-destructive font-semibold',
  warning: 'text-foreground',
  brand: 'text-foreground',
  muted: 'text-muted-foreground',
};

/** Status as text with a small dot: Paid (green), Due (grey), Overdue (red). */
export function StatusDot({ tone = 'muted', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm whitespace-nowrap', TEXT[tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT[tone])} />
      {children}
    </span>
  );
}

/* ── Thin meter ─────────────────────────────────────────────────────────── */

/** Thin ink bar, like the sidebar "38 of 75 client spots used". */
export function Meter({ value = 0, max = 100, tone = 'ink', className }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === 'danger' ? 'bg-destructive' : tone === 'warning' ? 'bg-partial' : tone === 'brand' ? 'bg-brand' : tone === 'success' ? 'bg-success' : 'bg-foreground';
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-secondary overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-300', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Charts ─────────────────────────────────────────────────────────────── */

/** Recharts styling: ink + brand blue + greys, thin gridlines. */
export const CHART = {
  ink: 'var(--tc-foreground)',
  brand: 'var(--tc-brand)',
  grey: 'var(--tc-muted-foreground)',
  light: 'var(--tc-border)',
  newBar: 'color-mix(in srgb, var(--tc-muted-foreground) 45%, transparent)',
  grid: 'var(--tc-border)',
  success: 'var(--tc-success)',
  danger: 'var(--tc-destructive)',
  tick: { fontSize: 12, fill: 'var(--tc-muted-foreground)' },
};

/** Plain tooltip for recharts: label muted, values as .num. */
export function ChartTooltip({ active, payload, label, format = (v) => v, labelFormat }) {
  if (!active || !payload?.length) return null;
  const shown = payload[0]?.payload?.full ?? label;
  return (
    <div className="rounded-lg bg-popover text-popover-foreground px-3 py-2 text-[13px] shadow-[0_0_0_1px_rgb(var(--border))]">
      {shown !== undefined && <p className="text-muted-foreground mb-1">{labelFormat ? labelFormat(shown) : shown}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2">
          {payload.length > 1 && <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />}
          {payload.length > 1 && <span className="text-muted-foreground">{p.name}</span>}
          <span className="num text-[15px] text-foreground">{format(p.value, p)}</span>
        </p>
      ))}
    </div>
  );
}

/** Small legend chip row for charts. */
export function ChartLegend({ items = [], className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4 text-[13px] text-foreground/80', className)}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {it.dashed
            ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} />
            : <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ── Section switchers ──────────────────────────────────────────────────── */

/** Billing: Invoices / Payments / Packages. */
export function BillingNav({ className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const value = location.pathname.startsWith('/packages')
    ? 'packages'
    : params.get('view') === 'payments' ? 'payments' : 'invoices';
  return (
    <Segmented
      className={className}
      value={value}
      onChange={(v) => navigate(v === 'packages' ? '/packages' : v === 'payments' ? '/invoicing?view=payments' : '/invoicing')}
      options={[
        { value: 'invoices', label: 'Invoices' },
        { value: 'payments', label: 'Payments' },
        { value: 'packages', label: 'Packages' },
      ]}
    />
  );
}

/** Insights: Business / Clients (analytics) / Stripe revenue. */
export function InsightsNav({ className, value: forced, onChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const value = forced || (location.pathname.startsWith('/analytics') ? 'clients' : location.pathname.startsWith('/revenue') ? 'revenue' : 'business');
  return (
    <Segmented
      className={className}
      value={value}
      onChange={(v) => {
        if (onChange) return onChange(v);
        navigate(v === 'clients' ? '/analytics' : v === 'revenue' ? '/revenue' : '/business');
      }}
      options={[
        { value: 'business', label: 'Business' },
        { value: 'clients', label: 'Client results' },
        { value: 'revenue', label: 'Stripe revenue' },
      ]}
    />
  );
}
