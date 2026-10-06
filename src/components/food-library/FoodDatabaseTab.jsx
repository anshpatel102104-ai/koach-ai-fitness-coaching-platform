import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, Database } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel, Segmented, EmptyState } from '@/components/kit';
import { toast } from 'sonner';
import FoodItemFormModal from './FoodItemFormModal';

const CATEGORY_TABS = ['All', 'Protein', 'Carbs', 'Fats', 'Vegetables', 'Dairy', 'Fruits'];

const DEFAULT_FOODS = [
  { name: "Chicken Breast", brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 165, protein: 31,  carbs: 0,   fats: 3.6, category: "Protein",    is_custom: false },
  { name: "Oats",           brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 389, protein: 17,  carbs: 66,  fats: 7,   category: "Carbs",      is_custom: false },
  { name: "White Rice",     brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 130, protein: 2.7, carbs: 28,  fats: 0.3, category: "Carbs",      is_custom: false },
  { name: "Whole Eggs",     brand: "Generic", serving_size: 1,   serving_unit: "egg",    calories: 78,  protein: 6,   carbs: 0.6, fats: 5,   category: "Protein",    is_custom: false },
  { name: "Salmon",         brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 208, protein: 20,  carbs: 0,   fats: 13,  category: "Protein",    is_custom: false },
  { name: "Broccoli",       brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 34,  protein: 2.8, carbs: 7,   fats: 0.4, category: "Vegetables", is_custom: false },
  { name: "Sweet Potato",   brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 86,  protein: 1.6, carbs: 20,  fats: 0.1, category: "Carbs",      is_custom: false },
  { name: "Greek Yogurt",   brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 59,  protein: 10,  carbs: 3.6, fats: 0.4, category: "Dairy",      is_custom: false },
  { name: "Almonds",        brand: "Generic", serving_size: 30,  serving_unit: "g",      calories: 174, protein: 6,   carbs: 6,   fats: 15,  category: "Fats",       is_custom: false },
  { name: "Banana",         brand: "Generic", serving_size: 1,   serving_unit: "medium", calories: 105, protein: 1.3, carbs: 27,  fats: 0.4, category: "Fruits",     is_custom: false },
  { name: "Olive Oil",      brand: "Generic", serving_size: 1,   serving_unit: "tbsp",   calories: 119, protein: 0,   carbs: 0,   fats: 13.5,category: "Fats",       is_custom: false },
  { name: "Beef Mince 95%", brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 152, protein: 26,  carbs: 0,   fats: 5,   category: "Protein",    is_custom: false },
  { name: "Cottage Cheese", brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 98,  protein: 11,  carbs: 3.4, fats: 4.3, category: "Dairy",      is_custom: false },
  { name: "Whey Protein",   brand: "Generic", serving_size: 30,  serving_unit: "g",      calories: 120, protein: 24,  carbs: 3,   fats: 1.5, category: "Protein",    is_custom: false },
  { name: "Spinach",        brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 23,  protein: 2.9, carbs: 3.6, fats: 0.4, category: "Vegetables", is_custom: false },
  { name: "Avocado",        brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 160, protein: 2,   carbs: 9,   fats: 15,  category: "Fats",       is_custom: false },
  { name: "Quinoa",         brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 120, protein: 4.4, carbs: 22,  fats: 1.9, category: "Carbs",      is_custom: false },
  { name: "Tuna",           brand: "Generic", serving_size: 100, serving_unit: "g",      calories: 116, protein: 26,  carbs: 0,   fats: 1,   category: "Protein",    is_custom: false },
  { name: "Whole Milk",     brand: "Generic", serving_size: 240, serving_unit: "ml",     calories: 149, protein: 8,   carbs: 12,  fats: 8,   category: "Dairy",      is_custom: false },
  { name: "Peanut Butter",  brand: "Generic", serving_size: 2,   serving_unit: "tbsp",   calories: 190, protein: 8,   carbs: 6,   fats: 16,  category: "Fats",       is_custom: false },
];

export default function FoodDatabaseTab() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const qc = useQueryClient();

  const { data: foods = [], isLoading } = useQuery({
    queryKey: ['food-database'],
    queryFn: () => db.entities.FoodItem.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.FoodItem.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-database'] }); toast.success('Food added'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.FoodItem.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-database'] }); toast.success('Food updated'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.FoodItem.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-database'] }); toast.success('Removed'); },
  });

  async function seedDefaults() {
    setSeeding(true);
    const existing = await db.entities.FoodItem.list('-created_date', 500);
    const existingNames = new Set(existing.map(f => f.name?.toLowerCase()));
    const toCreate = DEFAULT_FOODS.filter(f => !existingNames.has(f.name.toLowerCase()));
    for (const food of toCreate) {
      await db.entities.FoodItem.create(food);
    }
    qc.invalidateQueries({ queryKey: ['food-database'] });
    if (toCreate.length === 0) {
      toast.info('All default foods are already in your library.');
    } else {
      toast.success(`${toCreate.length} starter food${toCreate.length !== 1 ? 's' : ''} added`);
    }
    setSeeding(false);
  }

  function handleSubmit(data) {
    if (editingFood) {
      updateMutation.mutate({ id: editingFood.id, data });
    } else {
      createMutation.mutate({ ...data, is_custom: true });
    }
    setShowForm(false);
    setEditingFood(null);
  }

  const filtered = foods.filter(f => {
    const matchSearch = !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.brand?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || f.category === activeCategory;
    return matchSearch && matchCat;
  });

  const COLS = 'sm:grid sm:grid-cols-[minmax(0,2.2fr)_90px_80px_70px_70px_70px_72px] sm:gap-3 sm:items-center';

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        {/* Header row */}
        <div className="flex flex-col gap-3 px-4 sm:px-5 pt-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or brand"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="animate-spin" /> : <Database />}
                Add 20 starter foods
              </Button>
              <Button size="sm" onClick={() => { setEditingFood(null); setShowForm(true); }}>
                <Plus /> Add food
              </Button>
            </div>
          </div>
          <Segmented
            size="sm"
            value={activeCategory}
            onChange={setActiveCategory}
            options={CATEGORY_TABS.map(cat => ({ value: cat, label: cat }))}
          />
        </div>

        {/* Food list */}
        {isLoading ? (
          <div className="border-t border-border">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="px-5 py-4 border-b border-border last:border-b-0"><div className="h-3 w-1/3 rounded bg-secondary" /></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="border-t border-border"
            title={search || activeCategory !== 'All' ? 'No foods match.' : 'No foods yet.'}
            body={search || activeCategory !== 'All' ? 'Try another search or category.' : 'Add your own, or start with 20 common foods like chicken breast, oats and rice.'}
            action={!(search || activeCategory !== 'All') && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setEditingFood(null); setShowForm(true); }}><Plus /> Add food</Button>
                <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
                  {seeding ? <Loader2 className="animate-spin" /> : <Database />} Add starter foods
                </Button>
              </div>
            )}
          />
        ) : (
          <div role="table" aria-label="Food database">
            <div className={`hidden ${COLS} px-5 py-2.5 border-y border-border text-[13px] text-muted-foreground`} role="row">
              <span>Food</span>
              <span>Serving</span>
              <span className="text-right">kcal</span>
              <span className="text-right">Protein</span>
              <span className="text-right">Carbs</span>
              <span className="text-right">Fat</span>
              <span />
            </div>

            {filtered.map(food => (
              <div
                key={food.id}
                role="row"
                className={`flex items-center gap-3 ${COLS} px-4 sm:px-5 py-3 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground truncate">{food.name}</p>
                  <p className="text-[13px] text-muted-foreground truncate">
                    {[food.brand, food.category ?? 'Other'].filter(Boolean).join(' · ')}
                    <span className="sm:hidden tabular-nums"> · {food.serving_size}{food.serving_unit ?? 'g'} · {food.calories ?? '—'} kcal · {food.protein ?? '—'} g P · {food.carbs ?? '—'} g C · {food.fats ?? '—'} g F</span>
                  </p>
                </div>
                <span className="hidden sm:block text-sm text-muted-foreground tabular-nums">{food.serving_size}{food.serving_unit ?? 'g'}</span>
                <span className="hidden sm:block num text-lg text-foreground text-right">{food.calories ?? '—'}</span>
                <span className="hidden sm:block text-sm text-foreground text-right tabular-nums">{food.protein ?? '—'} g</span>
                <span className="hidden sm:block text-sm text-foreground text-right tabular-nums">{food.carbs ?? '—'} g</span>
                <span className="hidden sm:block text-sm text-foreground text-right tabular-nums">{food.fats ?? '—'} g</span>
                <div className="flex items-center justify-end gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => { setEditingFood(food); setShowForm(true); }}
                    aria-label={`Edit ${food.name}`}
                    className="touch-compact p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(food.id)}
                    aria-label={`Delete ${food.name}`}
                    className="touch-compact p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {filtered.length > 0 && (
        <p className="text-[13px] text-muted-foreground tabular-nums">{filtered.length} food{filtered.length !== 1 ? 's' : ''}</p>
      )}

      {/* Form modal */}
      <FoodItemFormModal
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingFood(null); }}
        food={editingFood}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
