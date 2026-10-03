import React from 'react';
import { Users, UserPlus, BarChart2, Scale, UtensilsCrossed, Pill, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format } from 'date-fns';

const LIFECYCLE_COLORS = {
  active:    'bg-success/10 text-success',
  lead:      'bg-accent text-primary',
  at_risk:   'bg-destructive/10 text-destructive',
  completed: 'bg-muted text-muted-foreground',
  alumni:    'bg-ai/10 text-ai',
};

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  const colors = ['bg-primary text-primary', 'bg-ai text-ai', 'bg-success text-success', 'bg-warning text-warning', 'bg-destructive text-destructive'];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function PlanDetailSidebar({ plan, onAssign }) {
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-sidebar'],
    queryFn: () => db.entities.Client.list(),
    enabled: !!plan?.id,
  });

  // Clients are assigned via their assigned_nutrition_id field
  const assignedClients = allClients.filter(c => c.assigned_nutrition_id === plan?.id);
  const supplements = plan?.supplements || [];

  const COMPLEXITY_LABELS = {
    very_basic: 'Very Basic',
    simple: 'Simple',
    moderate: 'Moderate',
    upscale: 'Upscale',
    gourmet: 'Gourmet',
  };

  return (
    <div className="space-y-5">

      {/* ── Assigned Clients ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Assigned Clients
          </h4>
          {assignedClients.length > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{assignedClients.length}</span>
          )}
        </div>

        {assignedClients.length === 0 ? (
          <div className="text-center py-6 bg-secondary/30 rounded-xl">
            <Users className="w-7 h-7 text-muted-foreground/40 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">No clients assigned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedClients.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                  {c.lifecycle_status && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${LIFECYCLE_COLORS[c.lifecycle_status] || 'bg-muted text-muted-foreground'}`}>
                      {c.lifecycle_status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full mt-3 gap-1.5 text-xs h-8 bg-gradient-to-r from-primary to-primary text-white border-0"
          onClick={onAssign}
        >
          <UserPlus className="w-3.5 h-3.5" /> Assign to New Client
        </Button>
      </div>

      {/* ── Plan Stats ─────────────────────────────── */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
          <BarChart2 className="w-3.5 h-3.5" /> Plan Stats
        </h4>
        <div className="space-y-0">
          {[
            { label: 'Total assigned',    value: `${assignedClients.length} client${assignedClients.length !== 1 ? 's' : ''}`,     icon: Users },
            { label: 'Meals configured',  value: `${(plan.meals || []).length}`,                                            icon: UtensilsCrossed },
            { label: 'Supplements',       value: `${supplements.length}`,                                                   icon: Pill },
            plan.weekly_loss_rate ? { label: 'Weekly loss target', value: `${plan.weekly_loss_rate} lb/week`,               icon: Scale } : null,
            plan.meal_complexity   ? { label: 'Meal complexity',   value: COMPLEXITY_LABELS[plan.meal_complexity] || plan.meal_complexity, icon: UtensilsCrossed } : null,
          ].filter(Boolean).map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-bold text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Created Date ───────────────────────────── */}
      {plan.created_date && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Created {format(new Date(plan.created_date), 'MMM d, yyyy')}</span>
        </div>
      )}

      {/* ── Supplements Chips ──────────────────────── */}
      {supplements.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Pill className="w-3.5 h-3.5" /> Supplements
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {supplements.map((s, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-ai/10 border border-ai text-xs font-semibold text-ai">
                {s.name || s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}