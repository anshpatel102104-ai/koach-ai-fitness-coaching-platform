import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Check, Plus, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Page, PageHeader, Panel, Segmented, EmptyState } from '@/components/kit';
import ApprovedFoodsSection from '@/components/food-library/ApprovedFoodsSection';
import MealTemplatesSection from '@/components/food-library/MealTemplatesSection';
import SupplementsSection from '@/components/food-library/SupplementsSection';
import CustomFoodForm from '@/components/nutrition/CustomFoodForm';
import FoodSearchPanel from '@/components/food-library/FoodSearchPanel';
import FoodDatabaseTab from '@/components/food-library/FoodDatabaseTab';

const TABS = [
  { id: 'approved',    label: 'Approved foods' },
  { id: 'database',    label: 'Food database' },
  { id: 'templates',   label: 'Meal templates' },
  { id: 'supplements', label: 'Supplements' },
  { id: 'custom',      label: 'My custom foods' },
];

function FoodRow({ food, onEdit, onDelete, onToggleApproved, updateMutation }) {
  const macros = [
    food.protein_g > 0 ? `${food.protein_g} g P` : null,
    food.carbs_g > 0 ? `${food.carbs_g} g C` : null,
    food.fats_g > 0 ? `${food.fats_g} g F` : null,
    food.serving_size || null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0">
      <button
        onClick={onToggleApproved}
        title={food.coach_approved ? 'Remove approval' : 'Approve for clients'}
        aria-label={food.coach_approved ? 'Remove approval' : 'Approve for clients'}
        className={cn('touch-compact shrink-0 w-5 h-5 rounded-[5px] border flex items-center justify-center transition-colors',
          food.coach_approved ? 'border-success bg-success' : 'border-input hover:border-foreground'
        )}
      >
        {food.coach_approved && <Check className="w-3 h-3 text-card" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground truncate">{food.name}</p>
        {macros && <p className="text-[13px] text-muted-foreground tabular-nums truncate">{macros}</p>}
      </div>
      {food.calories > 0 && (
        <span className="flex-shrink-0 flex items-baseline gap-1"><span className="num text-lg text-foreground">{food.calories}</span><span className="text-[13px] text-muted-foreground">kcal</span></span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive">Remove</Button>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-items'] }); toast.success('Saved to your library'); },
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
    <Page>
      <PageHeader
        title="Food library"
        subtitle={approvedCount > 0
          ? `${approvedCount} foods approved for clients. Approved foods show first when they search.`
          : 'The foods, templates and supplements you build meal plans from.'}
        actions={
          <Button onClick={() => { setEditingFood(null); setShowCustomForm(true); }}>
            <Plus /> Add food
          </Button>
        }
      />

      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={TABS.map(t => ({ value: t.id, label: t.label, count: t.id === 'approved' && approvedCount > 0 ? approvedCount : undefined }))}
      />

      {/* Approved Foods tab */}
      {tab === 'approved' && (
        <div>
          {/* CTA to add foods from database — collapsed by default */}
          <div className="mb-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowSearchPanel(s => !s)}
              >
                <Search className="w-3.5 h-3.5" />
                Search the food database
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showSearchPanel && 'rotate-180')} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => { setEditingFood(null); setShowCustomForm(true); }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add a custom food
              </Button>
            </div>

            {showSearchPanel && (
              <Panel className="overflow-hidden">
                <div className="p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground mb-3">
                    Search the USDA database. Saving a food approves it for your clients.
                  </p>
                  <FoodSearchPanel
                    onSave={handleSaveFromSearch}
                    isSaved={isSaved}
                  />
                </div>
              </Panel>
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
        <Panel className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-5 pb-3">
            <p className="text-sm text-muted-foreground">Foods you entered yourself, with your own macros and portions.</p>
            <Button size="sm" variant="outline" onClick={() => { setEditingFood(null); setShowCustomForm(true); }}>
              <Plus /> Add custom food
            </Button>
          </div>

          {customFoods.length === 0 ? (
            <EmptyState
              className="border-t border-border"
              title="No custom foods yet."
              body="Add a food that isn't in the database, like a client's homemade protein bar."
              action={<Button size="sm" onClick={() => { setEditingFood(null); setShowCustomForm(true); }}><Plus /> Add custom food</Button>}
            />
          ) : (
            <div className="border-t border-border">
              {customFoods.map(food => (
                <FoodRow
                  key={food.id}
                  food={food}
                  updateMutation={updateMutation}
                  onEdit={() => { setEditingFood(food); setShowCustomForm(true); }}
                  onDelete={() => deleteMutation.mutate(food.id)}
                  onToggleApproved={() => {
                    updateMutation.mutate({ id: food.id, data: { coach_approved: !food.coach_approved, coach_hidden: false } });
                    toast.success(food.coach_approved ? 'Removed from approved' : 'Approved for clients');
                  }}
                />
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Custom food form */}
      <CustomFoodForm
        open={showCustomForm}
        onOpenChange={setShowCustomForm}
        food={editingFood}
        onSubmit={(data) => {
          if (editingFood) {
            updateMutation.mutate({ id: editingFood.id, data });
            toast.success('Food updated');
          } else {
            saveMutation.mutate({ ...data, source: 'custom', coach_approved: true });
          }
          setShowCustomForm(false);
        }}
      />
    </Page>
  );
}
