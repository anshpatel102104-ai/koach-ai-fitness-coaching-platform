import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible settings section. `icon` may be a lucide component or a node;
 * strings (old emoji icons) are ignored so no emoji reaches the UI.
 */
export default function ProfileSectionCard({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof && !React.isValidElement(icon)) ? icon : null;

  return (
    <section className="panel overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50">
        {Icon ? <Icon className="h-[18px] w-[18px] text-muted-foreground" /> : React.isValidElement(icon) ? icon : null}
        <span className="flex-1 text-[15px] font-semibold text-foreground">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-1">{children}</div>}
    </section>
  );
}
