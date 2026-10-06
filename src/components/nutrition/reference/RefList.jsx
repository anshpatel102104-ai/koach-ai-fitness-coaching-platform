import React, { useState } from 'react';
import { ChevronDown, Bookmark } from 'lucide-react';
import { Panel } from '@/components/kit';
import { cn } from '@/lib/utils';
import RefSearchBar from './RefSearchBar';
import RefFilterChips from './RefFilterChips';

/**
 * Shared frame for the nutrition reference lists (supplements, vitamins,
 * sauces, seasonings): one panel, search + segmented filter on top, hairline
 * rows that expand in place.
 */
export function RefShell({ search, onSearch, placeholder, filters, active, onFilter, count, noun, notice, emptyText, children }) {
  return (
    <Panel className="overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <RefFilterChips options={filters} active={active} onChange={onFilter} />
          <div className="w-full lg:w-72 flex-shrink-0">
            <RefSearchBar value={search} onChange={onSearch} placeholder={placeholder} />
          </div>
        </div>
        {notice && <p className="text-[13px] text-muted-foreground">{notice}</p>}
      </div>
      <div className="border-t border-border">
        <p className="px-4 sm:px-5 pt-3 text-[13px] text-muted-foreground tabular-nums">{count} {noun}</p>
        {count === 0 ? (
          <p className="px-4 sm:px-5 py-8 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul>{children}</ul>
        )}
      </div>
    </Panel>
  );
}

/** One expandable reference row. `meta` is a plain muted line, `right` a short value. */
export function RefRow({ title, meta, right, isPortal, children }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-accent/50 transition-colors">
        <button onClick={() => setOpen(v => !v)} className="flex-1 min-w-0 flex items-center gap-3 text-left" aria-expanded={open}>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-foreground">{title}</span>
            {meta && <span className="block text-[13px] text-muted-foreground mt-0.5">{meta}</span>}
          </span>
          {right && <span className="hidden sm:block text-sm text-foreground/80 text-right max-w-[40%] tabular-nums">{right}</span>}
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
        {isPortal && (
          <button
            onClick={() => setSaved(v => !v)}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark'}
            className={cn('touch-compact p-1.5 rounded-md transition-colors', saved ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      {open && (
        <div className="px-4 sm:px-5 pb-4 -mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {children}
        </div>
      )}
    </li>
  );
}

/** Label + value inside an expanded row. `wide` spans both columns. `tone` for genuine warnings. */
export function RefField({ label, children, wide, tone }) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <p className={cn('text-[13px]', tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')}>{label}</p>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}
