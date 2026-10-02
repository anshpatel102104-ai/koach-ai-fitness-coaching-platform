import React, { useState, useEffect, useMemo } from 'react';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { format, subDays } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Copy, Loader2, Salad, Pill, FlaskConical, Droplets, Leaf, Download } from 'lucide-react';
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

const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 250, fats: 65 };

const PORTAL_TABS = [
  { id: 'log',         label: 'Meal Log',    icon: Salad },
  { id: 'supplements', label: 'Supplements', icon: Pill },
  { id: 'vitamins',    label: 'Vitamins',    icon: FlaskConical },
  { id: 'sauces',      label: 'Sauces',      icon: Droplets },
  { id: 'seasonings',  label: 'Seasonings',  icon: Leaf },
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
    base44.entities.Client.filter({ email: user.email }, '-created_date', 1).then(clients => {
      const client = clients[0];
      setMyClient(client || null);
      if (client?.assigned_nutrition_id) {
        base44.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id }).then(plans => {
          if (plans[0]) setNutritionPlan(plans[0]);
        }).catch(() => {});
        // Fetch coach name
        base44.entities.User.list().then(users => {
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
    base44.entities.FoodLog.filter({ client_id: clientId, logged_date: dateStr }, '-created_date', 100)
      .then(logs => setFoodLogs(logs.filter(l => l.food_name))) // filter out sentinel entries
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId, dateStr]);

  // Real-time subscription
  useEffect(() => {
    if (!clientId) return;
    const unsub = base44.entities.FoodLog.subscribe(() => {
      base44.entities.FoodLog.filter({ client_id: clientId, logged_date: dateStr }, '-created_date', 100)
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
      const created = await base44.entities.FoodLog.create(entry);
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
      await base44.entities.FoodLog.delete(log.id);
      setFoodLogs(prev => prev.filter(l => l.id !== log.id));
    } catch {
      toast.error('Failed to remove food');
    }
  };

  const handleCopyYesterday = async () => {
    const yesterdayStr = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    setCopyingYesterday(true);
    try {
      const yesterdayLogs = await base44.entities.FoodLog.filter(
        { client_id: clientId, logged_date: yesterdayStr }, '-created_date', 100
      );
      const toLog = yesterdayLogs.filter(l => l.food_name);
      if (toLog.length === 0) {
        toast.info('No foods logged yesterday to copy');
        return;
      }
      const created = await Promise.all(
        toLog.map(l => base44.entities.FoodLog.create({
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
    <div className="pb-32 bg-gradient-to-b from-card to-muted min-h-screen">

      {/* Header */}
      <div className="bg-card px-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <h1 className="text-foreground font-black text-[24px]">Nutrition</h1>
        <div className="flex items-center gap-2">
          {/* Copy yesterday */}
          <button
            onClick={handleCopyYesterday}
            disabled={copyingYesterday || !isToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground bg-muted disabled:opacity-40 active:opacity-70 transition-opacity"
            title="Copy yesterday's foods">
            {copyingYesterday ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            Yesterday
          </button>
          {/* Date nav */}
          <button onClick={() => handleDateChange(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <p className="text-muted-foreground text-xs font-bold min-w-[72px] text-center">
            {isToday ? 'Today' : format(selectedDate, 'MMM d')}
          </p>
          <button onClick={() => handleDateChange(1)}
            disabled={isToday}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted disabled:opacity-40">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* PDF Plan Toggle (only for PDF plans) */}
      {isPdfPlan && (
        <div className="px-4 mt-3 flex gap-2">
          {['plan', 'log'].map(view => (
            <button
              key={view}
              onClick={() => setPdfView(view)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                pdfView === view
                  ? 'bg-sidebar text-white'
                  : 'bg-card text-muted-foreground border border-border'
              }`}
            >
              {view === 'plan' ? '📄 My Plan' : '📝 Log'}
            </button>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="px-4 mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {PORTAL_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setPortalTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${
                portalTab === tab.id
                  ? 'bg-sidebar text-white border-border'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Reference tabs */}
      {portalTab === 'supplements' && <div className="px-4 mt-3"><SupplementsTab isPortal /></div>}
      {portalTab === 'vitamins'    && <div className="px-4 mt-3"><VitaminsTab isPortal /></div>}
      {portalTab === 'sauces'      && <div className="px-4 mt-3"><SaucesTab isPortal /></div>}
      {portalTab === 'seasonings'  && <div className="px-4 mt-3"><SeasoningsTab isPortal /></div>}

      {/* PDF Plan Viewer (for PDF plans on "My Plan" view) */}
      {isPdfPlan && pdfView === 'plan' && nutritionPlan?.pdf_file_url && (
        <div className="px-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground">{nutritionPlan.title}</h2>
            <a
              href={nutritionPlan.pdf_file_url}
              download={`${nutritionPlan.title}.pdf`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card" style={{ height: '600px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <iframe
              src={nutritionPlan.pdf_file_url}
              title="Nutrition Plan PDF"
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      )}

      {portalTab !== 'log' || (isPdfPlan && pdfView === 'plan') ? null : <>

      {/* Daily macro summary */}
      <div className="mt-3">
        <DailyMacroHeader totals={totals} targets={targets} />
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3 mx-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 rounded-[18px] bg-card animate-pulse"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }} />
          ))}
        </div>
      ) : (
        /* Meal cards */
        <div className="space-y-1 mt-2">
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

      {/* Water tracker */}
      <div className="mt-2">
        <WaterTracker glasses={waterIntake} goal={8} onUpdate={setWaterIntake} />
      </div>

      {/* Coach note */}
      {nutritionPlan?.notes && (
        <div className="mt-2">
          <CoachNote note={nutritionPlan.notes} coachName={coachName} />
        </div>
      )}

      {/* Supplement stack */}
      <div className="mt-2">
        <SupplementStack customSupplements={nutritionPlan?.supplements} />
      </div>

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
  );
}