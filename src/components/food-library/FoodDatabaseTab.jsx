import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Loader2, Database } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import FoodItemFormModal from './FoodItemFormModal';

const CATEGORY_TABS = ['All', 'Protein', 'Carbs', 'Fats', 'Vegetables', 'Dairy', 'Fruits'];

const CATEGORY_COLORS = {
  Protein:    'bg-accent text-primary',
  Carbs:      'bg-warning/10 text-warning',
  Fats:       'bg-orange-100 text-orange-700',
  Vegetables: 'bg-success/10 text-success',
  Dairy:      'bg-accent text-primary',
  Fruits:     'bg-pink-100 text-pink-700',
  Other:      'bg-secondary text-muted-foreground',
};

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-database'] }); toast.success('Food added!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.FoodItem.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-database'] }); toast.success('Food updated!'); },
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
      toast.success(`${toCreate.length} default food${toCreate.length !== 1 ? 's' : ''} loaded!`);
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

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={seedDefaults}
            disabled={seeding}
            className="gap-1.5 text-xs"
          >
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            Load Default Foods
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditingFood(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4" /> Add Food
          </Button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORY_TABS.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food list */}
      {isLoading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="h-14 bg-secondary/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="font-semibold text-foreground text-sm">No foods yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Add your first food or load a starter set of 20 common foods
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Load Defaults
            </Button>
            <Button size="sm" onClick={() => { setEditingFood(null); setShowForm(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Food
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_repeat(4,_1fr)_auto] gap-2 px-4 py-2.5 border-b border-border bg-secondary/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            <span>Name</span>
            <span>Serving</span>
            <span className="text-center">Calories</span>
            <span className="text-center">Protein</span>
            <span className="text-center">Carbs</span>
            <span className="text-center">Fats</span>
            <span />
          </div>

          <AnimatePresence initial={false}>
            {filtered.map((food, i) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.2) }}
                className="grid grid-cols-[2fr_1fr_repeat(4,_1fr)_auto] gap-2 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
              >
                {/* Name + category */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {food.brand && <span className="text-[10px] text-muted-foreground">{food.brand}</span>}
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CATEGORY_COLORS[food.category] ?? CATEGORY_COLORS.Other)}>
                      {food.category ?? 'Other'}
                    </span>
                  </div>
                </div>

                {/* Serving */}
                <span className="text-xs text-muted-foreground">
                  {food.serving_size}{food.serving_unit ?? 'g'}
                </span>

                {/* Macros */}
                <span className="text-xs font-bold text-orange-600 text-center">{food.calories ?? '—'}</span>
                <span className="text-xs text-primary font-semibold text-center">{food.protein ?? '—'}g</span>
                <span className="text-xs text-warning font-semibold text-center">{food.carbs ?? '—'}g</span>
                <span className="text-xs text-destructive font-semibold text-center">{food.fats ?? '—'}g</span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingFood(food); setShowForm(true); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(food.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Count */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">{filtered.length} food{filtered.length !== 1 ? 's' : ''}</p>
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