import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { money } from '@/components/business/ui';

const PER = { monthly: 'month', quarterly: 'quarter', annual: 'year', custom: 'custom term' };

const INCLUSION_LABELS = {
  custom_program: 'Custom workout program',
  weekly_updates: 'Weekly program updates',
  meal_plan: 'Personalized meal plan',
  weekly_checkins: 'Weekly check-ins',
  unlimited_messaging: 'Unlimited messaging',
  progress_tracking: 'Progress tracking',
  nutrition_coaching: 'Nutrition coaching',
  app_access: 'App access',
};

/** Shared column template for the package table. */
export const PACKAGE_GRID = 'md:grid md:grid-cols-[minmax(0,2fr)_140px_minmax(0,1.3fr)_90px_110px_40px] md:items-center md:gap-4';

export function PackageListHeader() {
  return (
    <div className={`hidden ${PACKAGE_GRID} px-5 sm:px-6 py-2.5 border-b border-border text-[13px] text-muted-foreground`}>
      <div>Package</div>
      <div className="text-right">Price</div>
      <div>Includes</div>
      <div className="text-right">Clients</div>
      <div>Selling</div>
      <div />
    </div>
  );
}

/** One package as a table row (name, price, inclusions, enrolled, on/off, menu). */
export default function PackageCard({ pkg, onEdit, onDuplicate, onArchive, onDelete, onToggleActive, onShare }) {
  const allInclusions = [
    ...Object.entries(pkg.inclusions || {})
      .filter(([k, v]) => v === true || (k === 'video_calls' && v && v !== 'none'))
      .map(([k, v]) => {
        if (k === 'video_calls') return `Video calls (${v.replace(/_/g, ' ')})`;
        return INCLUSION_LABELS[k] || k;
      }),
    ...(pkg.custom_inclusions || []),
  ];
  const per = pkg.billing_type && pkg.billing_type !== 'one_time' ? PER[pkg.billing_type] : null;
  const includes = allInclusions.length
    ? `${allInclusions.slice(0, 2).join(', ')}${allInclusions.length > 2 ? `, and ${allInclusions.length - 2} more` : ''}`
    : '—';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === 'Enter') onEdit?.(); }}
      className={cn('relative flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 sm:px-6 py-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/60 transition-colors', PACKAGE_GRID)}
    >
      <div className="min-w-0 w-full md:w-auto pr-10 md:pr-0">
        <p className="text-[15px] font-semibold text-foreground truncate">{pkg.name}</p>
        <p className="text-[13px] text-muted-foreground truncate">
          {[pkg.duration_weeks > 0 ? `${pkg.duration_weeks} weeks` : null, pkg.description].filter(Boolean).join(' · ') || 'No description'}
        </p>
      </div>

      <p className="md:text-right whitespace-nowrap">
        {pkg.original_price ? <span className="text-sm text-muted-foreground line-through mr-1.5">{money(pkg.original_price)}</span> : null}
        <span className="num text-[18px] text-foreground">{money(pkg.price)}</span>
        <span className="text-[13px] text-muted-foreground">{per ? ` / ${per}` : ' once'}</span>
      </p>

      <p className="hidden md:block text-sm text-foreground/80 truncate" title={allInclusions.join(', ')}>{includes}</p>

      <p className="text-sm text-muted-foreground md:text-right md:text-foreground">
        <span className="num text-[18px] text-foreground">{pkg.enrolled_count || 0}</span>
        <span className="md:hidden"> enrolled</span>
      </p>

      <div className="flex items-center gap-2 ml-auto md:ml-0" onClick={(e) => e.stopPropagation()}>
        <Switch checked={!!pkg.is_active} onCheckedChange={onToggleActive} aria-label={pkg.is_active ? 'Stop selling' : 'Start selling'} />
        <span className={cn('text-sm', pkg.is_active ? 'text-foreground' : 'text-muted-foreground')}>{pkg.is_active ? 'On' : 'Off'}</span>
      </div>

      <div className="absolute right-3 top-3 md:static" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="touch-compact h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Package actions">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>Share link</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>{pkg.is_archived ? 'Restore' : 'Archive'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
