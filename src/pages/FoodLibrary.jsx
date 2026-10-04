import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { CheckCircle2, Utensils, BookOpen, Pill, Plus, Search, ChevronDown, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ApprovedFoodsSection from '@/components/food-library/ApprovedFoodsSection';
import MealTemplatesSection from '@/components/food-library/MealTemplatesSection';
import SupplementsSection from '@/components/food-library/SupplementsSection';
import CustomFoodForm from '@/components/nutrition/CustomFoodForm';
import FoodSearchPanel from '@/components/food-library/FoodSearchPanel';
import FoodDatabaseTab from '@/components/food-library/FoodDatabaseTab';

const TABS = [
  { id: 'approved',    icon: CheckCircle2, label: 'Approved Foods',  color: 'text-success' },
  { id: 'database',    icon: Database,     label: 'Food Database',   color: 'text-primary' },
  { id: 'templates',   icon: BookOpen,     label: 'Meal Templates',  color: 'text-primary' },
  { id: 'supplements', icon: Pill,         label: 'Supplements',     color: 'text-ai' },
  { id: 'custom',      icon: Utensils,     label: 'My Custom Foods', color: 'text-orange-600' },
];

function FoodRow({ food, onEdit, onDelete, onToggleApproved, updateMutation }) {
  return (
    <div className={cn(
      'flex items-center gap-3 bg-card border rounded-xl px-4 py-3',
      food.coach_approved ? 'border-success' : 'border-border'
    )}>
      <button
        onClick={onToggleApproved}
        title={food.coach_approved ? 'Remove approval' : 'Approve for clients'}
        className={cn('shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          food.coach_approved ? 'border-success bg-success' : 'border-muted-foreground/30 hover:border-success'
        )}
      >
        {food.coach_approved && <CheckCircle2 className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
        <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground">
          {food.calories > 0 && <span className="text-orange-600 font-medium">{food.calories} cal</span>}
          {food.protein_g > 0 && <span>P {food.protein_g}g</span>}
          {food.carbs_g > 0 && <span>C {food.carbs_g}g</span>}
          {food.fats_g > 0 && <span>F {food.fats_g}g</span>}
          {food.serving_size && <span>· {food.serving_size}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary">Edit</button>
        <button onClick={onDelete} className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-secondary">Remove</button>
      </div>
    </div>
  );
}

export default function FoodLibrary() {
  const [tab, setTab] = useState('approved');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const qc = useQueryClient();

  const { data: savedFoods = [] } = useQuery({
    queryKey: ['food-items'],
    queryFn: () => db.entities.FoodItem.list('-created_date', 300),
  });

  const customFoods = savedFoods.filter(f => f.source === 'custom');

  const saveMutation = useMutation({
    mutationFn: (food) => db.entities.FoodItem.create(food),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-items'] }); toast.success('Food saved to library!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.FoodItem.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-items'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.FoodItem.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-items'] }); toast.success('Removed'); },
  });

  const handleSaveFromSearch = (food) => {
    const exists = savedFoods.find(f => f.usda_fdc_id === food.usda_fdc_id);
    if (exists) {
      toast.info('Already in your library');
    } else {
      saveMutation.mutate({ ...food, coach_approved: true, source: food.source || 'usda' });
    }
  };

  const isSaved = (food) => !!savedFoods.find(f => f.usda_fdc_id === food.usda_fdc_id);

  const approvedCount = savedFoods.filter(f => f.coach_approved).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="bg-sidebar rounded-xl p-5 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Food Library</h1>
          <p className="text-sm mt-0.5" style={{ color: 'color-mix(in srgb, white 50%, transparent)' }}>Manage foods for meal planning</p>
        </div>
        <button
          onClick={() => { setEditingFood(null); setShowCustomForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--tc-card)', color: 'var(--tc-foreground)' }}
        >
          <Plus className="w-4 h-4" /> Add Food
        </button>
      </div>

      {/* Tabs — simple text tabs, not pill overload */}
      <div className="flex gap-0 border-b border-border mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all',
              tab === t.id
                ? `border-primary ${t.color}`
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.id === 'approved' && approvedCount > 0 && (
              <span className="bg-success/10 text-success text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {approvedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Approved Foods tab */}
      {tab === 'approved' && (
        <div>
          {/* CTA to add foods from database — collapsed by default */}
          <div className="mb-5 space-y-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowSearchPanel(s => !s)}
              >
                <Search className="w-3.5 h-3.5" />
                Search Food Database
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showSearchPanel && 'rotate-180')} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => { setEditingFood(null); setShowCustomForm(true); }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Food
              </Button>
            </div>

            {showSearchPanel && (
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Search 600,000+ foods. Saving a food adds it directly to your Approved list.
                  </p>
                  <FoodSearchPanel
                    onSave={handleSaveFromSearch}
                    isSaved={isSaved}
                  />
                </div>
              </div>
            )}
          </div>

          <ApprovedFoodsSection foods={savedFoods} />
        </div>
      )}

      {/* Food Database */}
      {tab === 'database' && <FoodDatabaseTab />}

      {/* Meal Templates */}
      {tab === 'templates' && <MealTemplatesSection />}

      {/* Supplements */}
      {tab === 'supplements' && <SupplementsSection />}

      {/* Custom Foods */}
      {tab === 'custom' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Foods you created manually that aren't in the database.</p>
            <Button size="sm" onClick={() => { setEditingFood(null); setShowCustomForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Custom Food
            </Button>
          </div>

          {customFoods.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Utensils className="w-9 h-9 mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-foreground text-sm">No custom foods yet</p>
              <p className="text-xs mt-1">Create foods with your own macros and portions</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditingFood(null); setShowCustomForm(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Create First Food
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {customFoods.map(food => (
                <FoodRow
                  key={food.id}
                  food={food}
                  updateMutation={updateMutation}
                  onEdit={() => { setEditingFood(food); setShowCustomForm(true); }}
                  onDelete={() => deleteMutation.mutate(food.id)}
                  onToggleApproved={() => {
                    updateMutation.mutate({ id: food.id, data: { coach_approved: !food.coach_approved, coach_hidden: false } });
                    toast.success(food.coach_approved ? 'Removed from approved' : '✅ Approved!');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom food form */}
      <CustomFoodForm
        open={showCustomForm}
        onOpenChange={setShowCustomForm}
        food={editingFood}
        onSubmit={(data) => {
          if (editingFood) {
            updateMutation.mutate({ id: editingFood.id, data });
            toast.success('Food updated!');
          } else {
            saveMutation.mutate({ ...data, source: 'custom', coach_approved: true });
          }
          setShowCustomForm(false);
        }}
      />
    </div>
  );
}