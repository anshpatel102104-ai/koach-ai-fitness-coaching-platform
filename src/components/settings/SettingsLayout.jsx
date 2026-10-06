/**
 * Settings family layout — the shared frame for Settings, Account, Business,
 * Notifications, Coach profile and Team.
 *
 * Desktop: a white list of sections on the left (rows like the sidebar items,
 * but light) and the selected section's form on the right in white panels.
 * Mobile: the section list first; tapping a row opens that section as its own
 * page with a back row.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Page, Panel, PanelHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

/* ── Shell ───────────────────────────────────────────────────────────────── */

/**
 * @param nav     [{ label?, items: [{ id, label, icon?, hint?, to?, count? }] }]
 * @param active  id of the selected section
 * @param onSelect(id)
 * @param aside   optional node under the section list (desktop + mobile list)
 */
export function SettingsShell({
  backTo, backLabel = 'Settings', title, subtitle, actions,
  nav = [], active, onSelect, aside, children, className,
}) {
  // Mobile only: whether the user has opened a section from the list.
  const [mobileOpen, setMobileOpen] = useState(false);
  const allItems = nav.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === active);

  const select = (id) => {
    onSelect?.(id);
    setMobileOpen(true);
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  };

  return (
    <Page className={className}>
      {backTo && (
        <Link
          to={backTo}
          className={cn('mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground', mobileOpen && 'hidden lg:inline-flex')}
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      )}

      <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', mobileOpen && 'hidden lg:flex')}>
        <div className="min-w-0">
          <h1 className="text-[32px] sm:text-[40px] text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground sm:text-base">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">{actions}</div>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start xl:gap-6">
        {/* Section list */}
        <div className={cn('space-y-4 lg:sticky lg:top-6', mobileOpen ? 'hidden lg:block' : 'block')}>
          <Panel as="nav" className="p-2" aria-label="Settings sections">
            {nav.map((group, gi) => (
              <div key={group.label || gi} className={cn(gi > 0 && 'mt-2 border-t border-border pt-2')}>
                {group.label && <p className="px-3 pb-1 pt-2 text-[13px] text-muted-foreground">{group.label}</p>}
                {group.items.map(item => (
                  <SettingsNavItem key={item.id} item={item} active={item.id === active} onSelect={select} />
                ))}
              </div>
            ))}
          </Panel>
          {aside}
        </div>

        {/* Selected section */}
        <div className={cn('min-w-0', mobileOpen ? 'block' : 'hidden lg:block')}>
          <div className="mb-5 space-y-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="touch-compact -ml-1 inline-flex items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {title}
            </button>
            {activeItem && <h1 className="text-[32px] text-foreground">{activeItem.label}</h1>}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          <div className="space-y-5">{children}</div>
        </div>
      </div>
    </Page>
  );
}

function SettingsNavItem({ item, active, onSelect }) {
  const Icon = item.icon;
  const inner = (
    <>
      {Icon && <Icon className={cn('h-[18px] w-[18px] flex-shrink-0 text-muted-foreground', active && 'lg:text-brand')} />}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count ? <span className="text-[13px] tabular-nums text-muted-foreground">{item.count}</span> : null}
      <ChevronRight className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground', item.to ? 'lg:block' : 'lg:hidden')} />
    </>
  );
  const cls = cn(
    'touch-compact flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] transition-colors lg:py-2 lg:text-sm',
    active ? 'lg:bg-accent lg:font-semibold text-foreground' : 'text-foreground/85 hover:bg-accent/70 hover:text-foreground'
  );
  if (item.to) return <Link to={item.to} className={cls}>{inner}</Link>;
  return (
    <button type="button" onClick={() => onSelect(item.id)} className={cls} aria-current={active ? 'page' : undefined}>
      {inner}
    </button>
  );
}

/* ── Panels and rows ─────────────────────────────────────────────────────── */

/** White panel with a condensed title; rows inside get hairline dividers. */
export function SettingsPanel({ title, subtitle, right, children, footer, className, bodyClassName, tone }) {
  return (
    <Panel className={cn(tone === 'danger' && 'shadow-[0_0_0_1px_rgb(var(--destructive)/0.45)]', className)}>
      {(title || right) && <PanelHeader title={title} subtitle={subtitle} right={right} className="pb-2" />}
      <div className={cn('px-5 sm:px-6 divide-y divide-border', !title && 'pt-1', bodyClassName)}>{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</div>}
      {!footer && <div className="h-2" />}
    </Panel>
  );
}

/**
 * Form row: label + one help sentence on the left, control on the right.
 * Stacks on mobile. Pass `inline` for small controls (switches) that should
 * stay on the right at every width.
 */
export function SettingsRow({ label, help, children, inline = false, className, controlClassName, htmlFor }) {
  const Label = htmlFor ? 'label' : 'div';
  return (
    <div
      className={cn(
        'py-4',
        inline
          ? 'flex items-center justify-between gap-4'
          : 'flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-8',
        className
      )}
    >
      <Label htmlFor={htmlFor} className={cn('min-w-0', inline ? 'flex-1' : 'sm:w-[42%] sm:max-w-[320px] sm:pt-2')}>
        <span className="block text-[15px] font-semibold text-foreground">{label}</span>
        {help && <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{help}</span>}
      </Label>
      <div className={cn(inline ? 'flex-shrink-0' : 'w-full min-w-0 sm:max-w-[440px] sm:flex-1', controlClassName)}>
        {children}
      </div>
    </div>
  );
}

/** Switch row — the common case. */
export function SettingsSwitchRow({ label, help, checked, onCheckedChange, disabled, badge }) {
  return (
    <SettingsRow
      inline
      label={<span className="inline-flex flex-wrap items-center gap-2">{label}{badge}</span>}
      help={help}
    >
      <Switch checked={!!checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={typeof label === 'string' ? label : undefined} />
    </SettingsRow>
  );
}

/** Row that opens another settings page. */
export function SettingsLinkRow({ to, label, help, right, onClick }) {
  const Comp = to ? Link : 'button';
  return (
    <Comp
      to={to}
      onClick={onClick}
      type={to ? undefined : 'button'}
      className="group -mx-5 flex w-[calc(100%+2.5rem)] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/60 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground">{label}</span>
        {help && <span className="mt-0.5 block text-sm text-muted-foreground">{help}</span>}
      </span>
      {right}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Comp>
  );
}

/** Small sentence-case group label inside a panel. */
export function SettingsGroupLabel({ children, className }) {
  return <p className={cn('pb-1 pt-5 text-[13px] font-semibold text-muted-foreground', className)}>{children}</p>;
}

/** Stacked field for dense forms (name, email, bio). */
export function SettingsField({ label, hint, children, className, htmlFor }) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Ink Save button with a quiet saved state next to it. */
export function SaveButton({ onClick, saving, saved, dirty, label = 'Save changes', className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {saved && !dirty && !saving && (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-success" /> Saved
        </span>
      )}
      {dirty && !saving && <span className="hidden text-sm text-muted-foreground sm:inline">Unsaved changes</span>}
      <Button onClick={onClick} disabled={saving}>
        {saving && <Loader2 className="animate-spin" />}
        {saving ? 'Saving' : label}
      </Button>
    </div>
  );
}

/** Shared input class for native inputs/selects that don't use the ui primitives. */
export const fieldClass =
  'w-full h-10 rounded-md border border-input bg-card px-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50';
export const textareaClass =
  'w-full rounded-md border border-input bg-card px-3 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none';
