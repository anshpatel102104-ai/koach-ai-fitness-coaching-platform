import React, { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisclosureCard } from '@/components/portal/PortalUI';
import { toast } from 'sonner';

const PROTEIN_KEYWORDS = ['chicken', 'beef', 'steak', 'salmon', 'tuna', 'turkey', 'egg', 'shrimp', 'pork', 'tilapia', 'cod', 'protein', 'whey', 'greek yogurt', 'cottage cheese', 'tofu', 'tempeh', 'bison'];
const CARB_KEYWORDS = ['rice', 'oat', 'potato', 'bread', 'pasta', 'quinoa', 'wrap', 'tortilla', 'bagel', 'cereal', 'fruit', 'banana', 'apple', 'berry', 'blueberry', 'strawberry', 'mango'];
const PRODUCE_KEYWORDS = ['spinach', 'broccoli', 'lettuce', 'kale', 'pepper', 'tomato', 'cucumber', 'zucchini', 'onion', 'garlic', 'mushroom', 'carrot', 'celery', 'arugula', 'asparagus', 'green bean', 'avocado', 'lemon', 'lime'];
const SAUCE_KEYWORDS = ['sauce', 'salsa', 'mustard', 'ketchup', 'soy', 'aminos', 'oil', 'vinegar', 'dressing'];
const SUPPLEMENT_KEYWORDS = ['creatine', 'protein powder', 'fish oil', 'vitamin', 'magnesium', 'zinc', 'ashwagandha', 'supplement'];

function categorize(name) {
  const n = name.toLowerCase();
  if (SUPPLEMENT_KEYWORDS.some(k => n.includes(k))) return 'Supplements';
  if (SAUCE_KEYWORDS.some(k => n.includes(k))) return 'Sauces & Condiments';
  if (PROTEIN_KEYWORDS.some(k => n.includes(k))) return 'Proteins';
  if (CARB_KEYWORDS.some(k => n.includes(k))) return 'Carbs';
  if (PRODUCE_KEYWORDS.some(k => n.includes(k))) return 'Produce & Vegetables';
  return 'Other';
}

const CATEGORY_ORDER = ['Proteins', 'Carbs', 'Produce & Vegetables', 'Sauces & Condiments', 'Supplements', 'Other'];

export default function GroceryList({ nutritionPlan }) {
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    const allFoods = [];
    const meals = nutritionPlan?.meals || [];
    meals.forEach(meal => {
      (meal.foods || []).forEach(food => {
        const name = food.name || food.food_name || '';
        if (name) allFoods.push(name);
      });
    });
    // Deduplicate
    const unique = [...new Set(allFoods.map(f => f.trim()).filter(Boolean))];
    const cats = {};
    unique.forEach(name => {
      const cat = categorize(name);
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(name);
    });
    return cats;
  }, [nutritionPlan]);

  const totalItems = Object.values(grouped).flat().length;

  const handleCopy = () => {
    const lines = [];
    CATEGORY_ORDER.forEach(cat => {
      if (grouped[cat]?.length) {
        lines.push(`\n${cat}`);
        grouped[cat].forEach(item => lines.push(`- ${item}`));
      }
    });
    navigator.clipboard.writeText(lines.join('\n').trim());
    setCopied(true);
    toast.success('Grocery list copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DisclosureCard
      title="Grocery list"
      sub={totalItems > 0 ? `${totalItems} items from your meal plan` : 'Built from your meal plan'}
    >
      {totalItems === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No meal plan assigned yet. Your coach will add one.</p>
      ) : (
        <>
          <Button variant="outline" size="sm" className="mb-3" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy list'}
          </Button>

          {CATEGORY_ORDER.map(cat => {
            if (!grouped[cat]?.length) return null;
            return (
              <div key={cat} className="mb-3 last:mb-0">
                <h3 className="text-[15px] font-semibold text-foreground">{cat}</h3>
                <ul className="mt-1">
                  {grouped[cat].map(item => {
                    const key = `${cat}-${item}`;
                    return (
                      <li key={item}>
                        <button type="button" onClick={() => setChecked(p => ({ ...p, [key]: !p[key] }))}
                          className="flex w-full items-center gap-3 py-2 text-left">
                          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${checked[key] ? 'border-foreground bg-foreground text-background' : 'border-input'}`}>
                            {checked[key] && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className={`text-sm ${checked[key] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}
    </DisclosureCard>
  );
}
