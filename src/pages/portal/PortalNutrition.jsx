import React, { useState, useEffect, useMemo } from 'react';
import { portalDb } from '@/api/supabaseClient';
import { format, subDays } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Copy, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';
import { PortalScreen, PortalHeader, IconButton } from '@/components/portal/PortalUI';
import SupplementsTab from '@/components/nutrition/reference/SupplementsTab';
import VitaminsTab from '@/components/nutrition/reference/VitaminsTab';
import SaucesTab from '@/components/nutrition/reference/SaucesTab';
import SeasoningsTab from '@/components/nutrition/reference/SeasoningsTab';
import { toast } from 'sonner';

import DailyMacroHeader from '@/components/portal/nutrition/DailyMacroHeader';
import MealCard from '@/components/portal/nutrition/MealCard';
import FoodSearchSheet from '@/components/portal/nutrition/FoodSearchSheet';
import WaterTracker from '@/components/portal/nutrition/WaterTracker';
import SupplementStack from '@/components/portal/nutrition/SupplementStack';
import HydrationProtocol from '@/components/portal/nutrition/HydrationProtocol';
import SaucesSeasonings from '@/components/portal/nutrition/SaucesSeasonings';
import GroceryList from '@/components/portal/nutrition/GroceryList';
import CoachNote from '@/components/portal/nutrition/CoachNote';
import { MEAL_DEFINITIONS, calcDayTotals } from '@/lib/nutritionUtils';
import { SignedLink, SignedIframe } from '@/components/shared/SignedImage';

const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 250, fats: 65 };

const PORTAL_TABS = [
  { id: 'log',         label: 'Log' },
  { id: 'supplements', label: 'Supplements' },
  { id: 'vitamins',    label: 'Vitamins' },
  { id: 'sauces',      label: 'Sauces' },
  { id: 'seasonings',  label: 'Seasonings' },
];

export default function PortalNutrition({ user }) {
  const [portalTab, setPortalTab]         = useState('log');
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [selectedMeal, setSelectedMeal]   = useState(null);
  const [showSearch, setShowSearch]       = useState(false);
  const [detailFood, setDetailFood]       = useState(null);
  const [foodLogs, setFoodLogs]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const [waterIntake, setWaterIntake]     = useState(5);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [coachName, setCoachName]         = useState(null);
  const [pdfView, setPdfView]             = useState('plan'); // 'plan' or 'log'
  const [myClient, setMyClient]           = useState(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const clientId = myClient?.id;

  // Resolve this client's row (by email) + nutrition plan for targets
  useEffect(() => {
    if (!user?.email) return;
    portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1).then(clients => {
      const client = clients[0];
      setMyClient(client || null);
      if (client?.assigned_nutrition_id) {
        portalDb.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id }).then(plans => {
          if (plans[0]) setNutritionPlan(plans[0]);
        }).catch(() => {});
        // Fetch coach name
        portalDb.entities.User.list().then(users => {
          const coach = users.find(u => u.role === 'admin');
          if (coach) setCoachName(coach.full_name);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [user?.email]);

  const targets = useMemo(() => ({
    calories: nutritionPlan?.calories || DEFAULT_TARGETS.calories,
    protein:  nutritionPlan?.protein_g || DEFAULT_TARGETS.protein,
    carbs:    nutritionPlan?.carbs_g   || DEFAULT_TARGETS.carbs,
    fats:     nutritionPlan?.fats_g    || DEFAULT_TARGETS.fats,
  }), [nutritionPlan]);

  // Load food logs for selected date
  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    portalDb.entities.FoodLog.filter({ client_id: clientId, logged_date: dateStr }, '-created_date', 100)
      .then(logs => setFoodLogs(logs.filter(l => l.food_name))) // filter out sentinel entries
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId, dateStr]);

  // Real-time subscription
  useEffect(() => {
    if (!clientId) return;
    const unsub = portalDb.entities.FoodLog.subscribe(() => {
      portalDb.entities.FoodLog.filter({ client_id: clientId, logged_date: dateStr }, '-created_date', 100)
        .then(logs => setFoodLogs(logs.filter(l => l.food_name)))
        .catch(() => {});
    });
    return unsub;
  }, [clientId, dateStr]);

  const totals = useMemo(() => calcDayTotals(foodLogs), [foodLogs]);

  const logsForMeal = (mealId) =>
    foodLogs.filter(l => l.meal_name === mealId);

  const handleAddFood = async (food) => {
    if (!clientId || !selectedMeal) return;
    const entry = {
      client_id:        clientId,
      logged_date:      dateStr,
      meal_name:        selectedMeal,
      food_name:        food.food_name || food.name,
      calories:         food.calories  || 0,
      protein:          food.protein   || 0,
      carbs:            food.carbs     || 0,
      fats:             food.fats      || 0,
      fiber:            food.fiber     || 0,
      serving_quantity: food.serving_quantity || 100,
      serving_unit:     food.serving_unit || 'g',
      logged_by:        'client',
    };
    try {
      const created = await portalDb.entities.FoodLog.create(entry);
      setFoodLogs(prev => [...prev, created]);
    } catch {
      toast.error('Failed to log food');
    }
    setShowSearch(false);
  };

  const handleRemoveFood = async (mealId, index) => {
    const mealLogs = logsForMeal(mealId);
    const log = mealLogs[index];
    if (!log) return;
    try {
      await portalDb.entities.FoodLog.delete(log.id);
      setFoodLogs(prev => prev.filter(l => l.id !== log.id));
    } catch {
      toast.error('Failed to remove food');
    }
  };

  const handleCopyYesterday = async () => {
    const yesterdayStr = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    setCopyingYesterday(true);
    try {
      const yesterdayLogs = await portalDb.entities.FoodLog.filter(
        { client_id: clientId, logged_date: yesterdayStr }, '-created_date', 100
      );
      const toLog = yesterdayLogs.filter(l => l.food_name);
      if (toLog.length === 0) {
        toast.info('No foods logged yesterday to copy');
        return;
      }
      const created = await Promise.all(
        toLog.map(l => portalDb.entities.FoodLog.create({
          client_id: clientId, logged_date: dateStr,
          meal_name: l.meal_name, food_name: l.food_name,
          calories: l.calories, protein: l.protein, carbs: l.carbs, fats: l.fats,
          fiber: l.fiber || 0, serving_quantity: l.serving_quantity, serving_unit: l.serving_unit,
          logged_by: 'client',
        }))
      );
      setFoodLogs(prev => [...prev, ...created]);
      toast.success(`Copied ${created.length} foods from yesterday`);
    } catch {
      toast.error('Failed to copy yesterday');
    } finally {
      setCopyingYesterday(false);
    }
  };

  const handleDateChange = (days) => {
    setSelectedDate(d => new Date(d.getTime() + days * 86400000));
  };

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
  const isPdfPlan = nutritionPlan?.plan_type === 'pdf';

  return (
    <PortalScreen>
      <PortalHeader
        title="Food"
        eyebrow={format(selectedDate, 'EEEE, MMMM d')}
        right={(
          <div className="flex items-center gap-1">
            <IconButton label="Previous day" onClick={() => handleDateChange(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <span className="min-w-[56px] text-center text-[13px] font-semibold text-foreground">
              {isToday ? 'Today' : format(selectedDate, 'MMM d')}
            </span>
            <IconButton label="Next day" onClick={() => handleDateChange(1)} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        )}
      />

      <div className="space-y-3">
        {/* PDF Plan Toggle (only for PDF plans) */}
        {isPdfPlan && (
          <Segmented
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            value={pdfView}
            onChange={setPdfView}
            options={[{ value: 'plan', label: 'My plan' }, { value: 'log', label: 'Log' }]}
          />
        )}

        {/* Tab switcher */}
        <Segmented
          size="sm"
          className="w-full"
          value={portalTab}
          onChange={setPortalTab}
          options={PORTAL_TABS.map(t => ({ value: t.id, label: t.label }))}
        />

        {/* Reference tabs */}
        {portalTab === 'supplements' && <SupplementsTab isPortal />}
        {portalTab === 'vitamins'    && <VitaminsTab isPortal />}
        {portalTab === 'sauces'      && <SaucesTab isPortal />}
        {portalTab === 'seasonings'  && <SeasoningsTab isPortal />}

        {/* PDF Plan Viewer (for PDF plans on "My Plan" view) */}
        {isPdfPlan && pdfView === 'plan' && nutritionPlan?.pdf_file_url && (
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <h2 className="truncate text-lg text-foreground">{nutritionPlan.title}</h2>
              <Button variant="outline" size="sm" asChild>
                <SignedLink href={nutritionPlan.pdf_file_url} download={`${nutritionPlan.title}.pdf`}>
                  <Download /> Download
                </SignedLink>
              </Button>
            </div>
            <div className="border-t border-border" style={{ height: '600px' }}>
              <SignedIframe
                src={nutritionPlan.pdf_file_url}
                title="Nutrition plan PDF"
                className="h-full w-full"
                style={{ border: 'none' }}
              />
            </div>
          </section>
        )}

        {portalTab !== 'log' || (isPdfPlan && pdfView === 'plan') ? null : <>

        {/* Daily macro summary */}
        <DailyMacroHeader totals={totals} targets={targets} />

        {/* Meals */}
        <section className="panel px-4 pt-4 pb-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl text-foreground">Meals</h2>
            <Button
              variant="outline" size="sm"
              onClick={handleCopyYesterday}
              disabled={copyingYesterday || !isToday}
              title="Copy yesterday's foods"
            >
              {copyingYesterday ? <Loader2 className="animate-spin" /> : <Copy />}
              Copy yesterday
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2 py-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : (
            <div className="mt-1 divide-y divide-border">
              {MEAL_DEFINITIONS.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  loggedFoods={logsForMeal(meal.id)}
                  mealTarget={meal.targetCal}
                  onAddFood={() => { setSelectedMeal(meal.id); setShowSearch(true); }}
                  onRemoveFood={(idx) => handleRemoveFood(meal.id, idx)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Water tracker */}
        <WaterTracker glasses={waterIntake} goal={8} onUpdate={setWaterIntake} />

        {/* Coach note */}
        {nutritionPlan?.notes && (
          <CoachNote note={nutritionPlan.notes} coachName={coachName} />
        )}

        {/* Supplement stack */}
        <SupplementStack customSupplements={nutritionPlan?.supplements} />

        {/* Hydration protocol */}
        <HydrationProtocol weightLbs={null} />

        {/* Sauces & seasonings */}
        <SaucesSeasonings />

        {/* Grocery list */}
        <GroceryList nutritionPlan={nutritionPlan} />

        {/* Food search sheet */}
        <AnimatePresence>
          {showSearch && (
            <FoodSearchSheet
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              onSelectFood={handleAddFood}
              mealName={MEAL_DEFINITIONS.find(m => m.id === selectedMeal)?.name}
              dailyTargets={targets}
            />
          )}
        </AnimatePresence>
        </> /* end log tab */ }
      </div>
    </PortalScreen>
  );
}
