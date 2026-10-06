import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Users, Copy, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Initials } from '@/components/kit';
import NutritionPlanDetailModal from './NutritionPlanDetailModal';
import { fmtInt, planStatus, goalLabel } from './planUtils';

// Desktop column template, shared by the head row and every plan row.
const COLS = 'lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.5fr)_88px_minmax(0,1.2fr)_96px_104px_40px] lg:items-center lg:gap-4';

export function PlanTableHead() {
  return (
    <div className={`hidden ${COLS} border-y border-border px-5 py-2.5 text-[13px] text-muted-foreground`} role="row">
      <span role="columnheader">Client</span>
      <span role="columnheader">Plan</span>
      <span role="columnheader" className="text-right">Calories</span>
      <span role="columnheader">Macros</span>
      <span role="columnheader">Status</span>
      <span role="columnheader">Updated</span>
      <span role="columnheader" className="sr-only">Actions</span>
    </div>
  );
}

function macroText(plan) {
  if (plan.tracking_mode === 'habits') return 'No macro targets';
  const parts = [
    plan.protein_g ? `${fmtInt(plan.protein_g)} g P` : null,
    plan.carbs_g ? `${fmtInt(plan.carbs_g)} g C` : null,
    plan.fats_g ? `${fmtInt(plan.fats_g)} g F` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No macro targets set';
}

function updatedText(plan) {
  const d = plan.updated_date || plan.created_date;
  if (!d) return '—';
  try { return `${formatDistanceToNowStrict(new Date(d))} ago`; } catch { return '—'; }
}

function RowMenu({ onOpen, onEdit, onAssign, onDuplicate, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="touch-compact inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Plan actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onClick={onOpen}><Eye className="w-4 h-4" /> Open plan</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Pencil className="w-4 h-4" /> Edit plan</DropdownMenuItem>
        <DropdownMenuItem onClick={onAssign}><Users className="w-4 h-4" /> Assign clients</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}><Copy className="w-4 h-4" /> Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * One meal plan as a table row (Clients-list pattern). Clicking the row opens
 * the full plan view. Kept the historical name so callers don't change.
 */
export default function NutritionPlanCard({ plan, clients = [], autoOpen = false, onEdit, onDuplicate, onDelete, onAssign }) {
  const [detailOpen, setDetailOpen] = useState(!!autoOpen);
  const status = planStatus(plan);
  const primary = clients[0];
  const extra = clients.length - 1;
  const goal = goalLabel(plan, primary);
  const mealCount = (plan.meals || []).length;

  const clientName = primary ? primary.name : plan.is_template ? 'Template' : 'Unassigned';
  const clientLine = primary
    ? [extra > 0 ? `+${extra} more` : null, goal].filter(Boolean).join(', ') || 'Assigned'
    : plan.is_template ? 'Reusable for any client' : 'Not sent to anyone yet';

  const planLine = plan.tracking_mode === 'habits'
    ? 'Habit mode'
    : `${mealCount} meal${mealCount === 1 ? '' : 's'} a day${(plan.rest_day_meals || []).length ? ', training and rest days' : ''}`;

  return (
    <>
      <div
        role="row"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter') setDetailOpen(true); }}
        className={`group relative flex flex-col gap-2 border-b border-border px-4 py-3.5 last:border-b-0 sm:px-5 cursor-pointer hover:bg-accent/60 focus-visible:bg-accent/60 outline-none transition-colors ${COLS}`}
      >
        {/* Client */}
        <div className="flex items-center gap-3 min-w-0 pr-10 lg:pr-0" role="cell">
          {primary
            ? <Initials name={primary.name} src={primary.avatar_url} size={36} tone={primary.lifecycle_status === 'at_risk' ? 'alert' : 'default'} />
            : <span className="h-9 w-9 flex-shrink-0 rounded-full border border-dashed border-input" aria-hidden />}
          <div className="min-w-0">
            <p className={`text-[15px] font-semibold truncate ${primary ? 'text-foreground' : 'text-muted-foreground'}`}>{clientName}</p>
            <p className="text-[13px] text-muted-foreground truncate">{clientLine}</p>
          </div>
        </div>

        {/* Plan */}
        <div className="min-w-0 pl-12 lg:pl-0" role="cell">
          <p className="text-[15px] text-foreground truncate">{plan.title || 'Untitled plan'}</p>
          <p className="text-[13px] text-muted-foreground truncate">{planLine}</p>
        </div>

        {/* Calories */}
        <div className="hidden lg:block text-right" role="cell">
          {plan.tracking_mode !== 'habits' && plan.calories
            ? <span className="num text-xl text-foreground">{fmtInt(plan.calories)}</span>
            : <span className="text-muted-foreground">—</span>}
        </div>

        {/* Macros */}
        <div className={`pl-12 lg:pl-0 text-[13px] text-muted-foreground tabular-nums truncate ${plan.tracking_mode === 'habits' ? 'hidden lg:block' : ''}`} role="cell">
          <span className="lg:hidden">
            {plan.tracking_mode !== 'habits' && plan.calories ? <span className="font-semibold text-foreground">{fmtInt(plan.calories)} kcal · </span> : null}
          </span>
          {macroText(plan)}
        </div>

        {/* Status */}
        <div className="pl-12 lg:pl-0 flex items-center gap-2" role="cell">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="lg:hidden text-[13px] text-muted-foreground">Updated {updatedText(plan)}</span>
        </div>

        {/* Updated */}
        <div className="hidden lg:block text-[13px] text-muted-foreground" role="cell">{updatedText(plan)}</div>

        {/* Menu */}
        <div className="absolute right-3 top-3 lg:static lg:flex lg:justify-end" role="cell">
          <RowMenu
            onOpen={() => setDetailOpen(true)}
            onEdit={onEdit}
            onAssign={onAssign}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </div>

      <NutritionPlanDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        plan={plan}
        onEdit={() => { setDetailOpen(false); onEdit?.(); }}
        onAssign={() => { setDetailOpen(false); onAssign?.(); }}
      />
    </>
  );
}
