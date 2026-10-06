import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'proteins', label: 'Meat, fish and eggs' },
  { key: 'produce', label: 'Produce' },
  { key: 'grains', label: 'Grains and bread' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'fats', label: 'Oils, nuts and seeds' },
  { key: 'condiments', label: 'Sauces and seasoning' },
  { key: 'other', label: 'Everything else' },
];

const PROTEIN_KEYWORDS = ['chicken', 'beef', 'steak', 'salmon', 'tuna', 'shrimp', 'turkey', 'pork', 'fish', 'egg', 'protein', 'whey', 'casein', 'tofu', 'tempeh', 'tilapia', 'cod', 'ground'];
const PRODUCE_KEYWORDS = ['broccoli', 'spinach', 'kale', 'lettuce', 'tomato', 'pepper', 'onion', 'garlic', 'zucchini', 'asparagus', 'carrot', 'celery', 'cucumber', 'avocado', 'banana', 'apple', 'berry', 'blueberry', 'strawberry', 'orange', 'lemon', 'mushroom', 'cabbage', 'cauliflower', 'sweet potato', 'potato'];
const GRAIN_KEYWORDS = ['rice', 'oat', 'pasta', 'bread', 'tortilla', 'quinoa', 'barley', 'cereal', 'granola', 'wrap', 'bagel', 'flour', 'corn'];
const DAIRY_KEYWORDS = ['milk', 'yogurt', 'cheese', 'cottage', 'cream', 'butter', 'ghee', 'dairy'];
const FAT_KEYWORDS = ['oil', 'olive', 'coconut', 'almond', 'peanut', 'cashew', 'walnut', 'nut', 'seed', 'flax', 'chia', 'avocado oil'];
const CONDIMENT_KEYWORDS = ['sauce', 'ketchup', 'mustard', 'mayo', 'dressing', 'vinegar', 'soy', 'hot sauce', 'sriracha', 'seasoning', 'spice', 'salt', 'pepper', 'cumin', 'paprika', 'herbs'];

function categorize(foodName) {
  const lower = foodName.toLowerCase();
  if (PROTEIN_KEYWORDS.some(k => lower.includes(k))) return 'proteins';
  if (PRODUCE_KEYWORDS.some(k => lower.includes(k))) return 'produce';
  if (GRAIN_KEYWORDS.some(k => lower.includes(k))) return 'grains';
  if (DAIRY_KEYWORDS.some(k => lower.includes(k))) return 'dairy';
  if (FAT_KEYWORDS.some(k => lower.includes(k))) return 'fats';
  if (CONDIMENT_KEYWORDS.some(k => lower.includes(k))) return 'condiments';
  return 'other';
}

export function buildGroceryList(meals) {
  const map = {};
  (meals || []).forEach(meal => {
    (meal.foods || []).forEach(food => {
      const name = food.food_name || food.name;
      if (!name) return;
      const key = name.toLowerCase().trim();
      const cat = categorize(key);
      if (!map[cat]) map[cat] = {};
      if (!map[cat][key]) map[cat][key] = { name, portions: [] };
      const portion = food.portion || food.amount_household;
      if (portion) map[cat][key].portions.push(portion);
    });
  });
  // Convert to arrays
  const result = {};
  Object.entries(map).forEach(([cat, items]) => {
    result[cat] = Object.values(items).map(item => ({
      name: item.name,
      detail: [...new Set(item.portions)].join(', '),
    }));
  });
  return result;
}

export function groceryCount(meals) {
  return Object.values(buildGroceryList(meals)).reduce((s, arr) => s + arr.length, 0);
}

export default function GroceryListModal({ open, onOpenChange, plan, meals }) {
  const groceries = buildGroceryList(meals || [...(plan?.meals || []), ...(plan?.rest_day_meals || [])]);
  const [checked, setChecked] = useState({});

  const toggle = (cat, i) => setChecked(prev => ({ ...prev, [`${cat}-${i}`]: !prev[`${cat}-${i}`] }));
  const totalItems = Object.values(groceries).reduce((s, arr) => s + arr.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const copyList = () => {
    const text = CATEGORIES
      .filter(c => groceries[c.key]?.length)
      .map(c => `${c.label}\n${groceries[c.key].map(i => `- ${i.name}${i.detail ? ` (${i.detail})` : ''}`).join('\n')}`)
      .join('\n\n');
    navigator.clipboard?.writeText(text);
    toast.success('Grocery list copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0 pr-12">
          <DialogTitle>Grocery list</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {totalItems > 0
              ? `${totalItems} items for the week, grouped by store aisle. ${checkedCount} ticked off.`
              : 'Nothing to buy yet.'}
          </DialogDescription>
          {totalItems > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={copyList}><Copy /> Copy list</Button>
              <Button size="sm" variant="ghost" onClick={() => setChecked({})} disabled={checkedCount === 0}>Clear ticks</Button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {CATEGORIES.map(cat => {
            const items = groceries[cat.key];
            if (!items?.length) return null;
            return (
              <div key={cat.key}>
                <p className="text-[13px] text-muted-foreground mb-1">{cat.label}</p>
                <div>
                  {items.map((item, i) => {
                    const id = `${cat.key}-${i}`;
                    const done = !!checked[id];
                    return (
                      <button
                        key={i}
                        onClick={() => toggle(cat.key, i)}
                        className="w-full flex items-center gap-3 py-2.5 text-left border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                      >
                        <span className={cn('w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center flex-shrink-0', done ? 'bg-primary border-primary' : 'bg-card border-input')}>
                          {done && <Check className="w-3 h-3 text-primary-foreground" />}
                        </span>
                        <span className={cn('text-sm flex-1', done ? 'line-through text-muted-foreground' : 'text-foreground')}>{item.name}</span>
                        {item.detail && <span className="text-[13px] text-muted-foreground flex-shrink-0 max-w-[45%] truncate">{item.detail}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {totalItems === 0 && (
            <p className="text-sm text-muted-foreground py-6">This plan has no foods yet. Add foods to its meals and the list fills in.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
