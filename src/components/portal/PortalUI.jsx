/**
 * Client portal building blocks. The portal is a mobile-first app: grey
 * canvas, white cards, condensed headings, ink primary buttons and the brand
 * blue only for the single main action on a screen. On desktop every screen
 * sits in a centred 480px column (see ClientPortal.jsx).
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Page body: canvas, side gutter, room for the bottom tab bar. */
export function PortalScreen({ className, children, flush = false }) {
  return (
    <div className={cn('min-h-full bg-background pb-28', !flush && 'px-4', className)}>
      {children}
    </div>
  );
}

/** Square icon button used in portal top bars (back, close, settings). */
export function IconButton({ className, children, label, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'touch-compact inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-card text-foreground',
        'shadow-[0_0_0_1px_rgb(var(--border))] hover:bg-accent transition-colors disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Screen header: optional back button, condensed title, one plain sentence and
 * a right-hand slot. Sits on the canvas, no bar or shadow.
 */
export function PortalHeader({ title, subtitle, eyebrow, onBack, backLabel = 'Back', right, className, children }) {
  return (
    <header
      className={cn('flex items-start gap-3 pb-4', className)}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}
    >
      {onBack && (
        <IconButton onClick={onBack} label={backLabel} className="mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[13px] font-medium text-muted-foreground mb-0.5">{eyebrow}</p>}
        <h1 className="text-[32px] text-foreground">{title}</h1>
        {subtitle && <p className="text-[15px] text-muted-foreground mt-1">{subtitle}</p>}
        {children}
      </div>
      {right && <div className="flex flex-shrink-0 items-center gap-2 mt-0.5">{right}</div>}
    </header>
  );
}

/** White card on the canvas. */
export function Card({ className, as: Comp = 'section', ...props }) {
  return <Comp className={cn('panel', className)} {...props} />;
}

/** Card title row: condensed 20px title, optional right slot. */
export function CardTitle({ title, sub, right, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-xl text-foreground">{title}</h2>
        {sub && <p className="text-[13px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

/** Progress ring (ink on a light grey track) used for calories and goals. */
export function Ring({ pct = 0, size = 72, stroke = 8, className, trackClass = 'text-secondary', barClass = 'text-foreground', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className={cn('relative flex-shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className={trackClass} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - clamped / 100)}
          className={cn(barClass, 'transition-[stroke-dashoffset] duration-500')}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

/** Thin horizontal progress bar. */
export function Bar({ pct = 0, className, barClass = 'bg-foreground' }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', barClass)} style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%` }} />
    </div>
  );
}

/**
 * Bottom sheet. Slides up (functional motion only), white surface, kept in
 * the 480px portal column on desktop.
 */
export function Sheet({ open, onClose, title, children, footer, className, maxHeight = '88vh' }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className={cn('fixed bottom-0 left-0 right-0 z-[61] mx-auto flex w-full max-w-[480px] flex-col rounded-t-xl bg-card', className)}
            style={{ maxHeight }}
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              {title ? <h2 className="text-[22px] text-foreground">{title}</h2> : <span />}
              <IconButton onClick={onClose} label="Close" className="h-9 w-9">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && (
              <div className="border-t border-border px-5 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Full-screen focus view (logger, check-in flow). White surface, centred column on desktop. */
export function FocusScreen({ children, className, z = 'z-50' }) {
  return (
    <div className={cn('fixed inset-0 bg-background', z)}>
      <div className={cn('mx-auto flex h-full w-full max-w-[480px] flex-col bg-card md:shadow-[0_0_0_1px_rgb(var(--border))]', className)}>
        {children}
      </div>
    </div>
  );
}

/** Sticky footer for focus screens. */
export function FocusFooter({ children, className }) {
  return (
    <div
      className={cn('flex-shrink-0 border-t border-border bg-card px-4 pt-3', className)}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      {children}
    </div>
  );
}

/** Small status pill. tone: neutral | success | warning | danger | brand */
export function Pill({ tone = 'neutral', className, children }) {
  const tones = {
    neutral: 'bg-secondary text-foreground',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-destructive/10 text-destructive',
    brand: 'bg-brand-soft text-brand',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Card with a tappable header that opens a body below a hairline.
 * Used for reference sections (supplements, hydration, grocery list).
 */
export function DisclosureCard({ title, sub, right, defaultOpen = false, children, className }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={cn('panel overflow-hidden', className)}>
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50 transition-colors">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{title}</span>
          {sub && <span className="block text-[13px] text-muted-foreground">{sub}</span>}
        </span>
        {right}
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}
