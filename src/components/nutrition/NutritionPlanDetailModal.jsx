import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Segmented } from '@/components/kit';
import OverviewTab from './detail/OverviewTab';
import MealPlanTab, { CalorieSummary } from './detail/MealPlanTab';
import AlternativesTab from './detail/AlternativesTab';
import ShoppingListTab from './detail/ShoppingListTab';
import PlanDetailSidebar from './detail/PlanDetailSidebar';
import GroceryListModal, { groceryCount } from './GroceryListModal';
import { planClients, goalLabel } from './planUtils';

const TABS = [
  { value: 'meals',        label: 'Meals' },
  { value: 'overview',     label: 'Guidance' },
  { value: 'alternatives', label: 'Swaps' },
  { value: 'shopping',     label: 'Shopping list' },
];

/**
 * Full-screen plan view (reference: Meal plan). Calorie headline and macro
 * bar, the day's meals as a timeline, and a right column with the allergy
 * check, supplements and grocery list. Sits over the content area and leaves
 * the sidebar visible on desktop.
 */
export default function NutritionPlanDetailModal({ open, onOpenChange, plan, onEdit, onAssign }) {
  const [tab, setTab] = useState('meals');
  const [dayType, setDayType] = useState('training');
  const [groceryOpen, setGroceryOpen] = useState(false);

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-sidebar'],
    queryFn: () => db.entities.Client.list(),
    enabled: !!plan?.id && open,
  });

  const close = () => onOpenChange(false);

  // Escape closes; lock page scroll behind the sheet.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !groceryOpen) onOpenChange(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, groceryOpen, onOpenChange]);

  const assignedClients = useMemo(() => planClients(plan, allClients), [plan, allClients]);
  const hasRestDay = (plan?.rest_day_meals || []).length > 0;
  const allMeals = useMemo(() => [...(plan?.meals || []), ...(plan?.rest_day_meals || [])], [plan]);

  if (!plan || !open) return null;

  const meals = hasRestDay && dayType === 'rest' ? plan.rest_day_meals : (plan.meals || []);
  const client = assignedClients[0];
  const goal = goalLabel(plan, client);
  const eyebrow = [client?.name || (plan.is_template ? 'Template' : 'Not assigned'), goal].filter(Boolean).join(', ');
  const count = groceryCount(allMeals);

  return (
    <div
      className="fixed inset-0 lg:left-[248px] z-40 bg-background overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={plan.title || 'Meal plan'}
    >
      <Page>
        <button
          onClick={close}
          className="touch-compact mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> All meal plans
        </button>

        <PageHeader
          eyebrow={eyebrow}
          title={plan.title || 'Meal plan'}
          subtitle={plan.tracking_mode === 'habits' ? 'Habit mode. Clients check off habits instead of logging macros.' : null}
          actions={
            <>
              {hasRestDay && (
                <Segmented
                  value={dayType}
                  onChange={setDayType}
                  options={[{ value: 'training', label: 'Training day' }, { value: 'rest', label: 'Rest day' }]}
                />
              )}
              <Button variant="outline" onClick={onEdit}>Edit plan</Button>
              <Button onClick={onAssign}>{client ? 'Assign clients' : 'Assign to client'}</Button>
              <Button variant="ghost" size="icon" onClick={close} aria-label="Close plan" className="hidden sm:inline-flex">
                <X />
              </Button>
            </>
          }
        />

        <div className="space-y-5">
          <CalorieSummary plan={plan} meals={meals} />

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_344px] gap-5 items-start">
            <div className="space-y-4 min-w-0">
              <Segmented size="sm" value={tab} onChange={setTab} options={TABS} />
              {tab === 'meals'        && <MealPlanTab plan={plan} meals={meals} />}
              {tab === 'overview'     && <OverviewTab plan={plan} />}
              {tab === 'alternatives' && <AlternativesTab plan={plan} />}
              {tab === 'shopping'     && <ShoppingListTab plan={plan} meals={meals} />}
            </div>

            <PlanDetailSidebar
              plan={plan}
              meals={allMeals}
              assignedClients={assignedClients}
              groceryCount={count}
              onAssign={onAssign}
              onOpenGrocery={() => setGroceryOpen(true)}
            />
          </div>
        </div>
      </Page>

      <GroceryListModal open={groceryOpen} onOpenChange={setGroceryOpen} plan={plan} meals={allMeals} />
    </div>
  );
}
