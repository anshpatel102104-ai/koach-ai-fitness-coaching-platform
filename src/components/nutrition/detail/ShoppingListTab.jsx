import React, { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, EmptyState } from '@/components/kit';
import { toast } from 'sonner';

const CATEGORIES = ['Proteins', 'Carbs', 'Vegetables', 'Fruits', 'Dairy', 'Fats', 'Condiments'];
const CATEGORY_LABEL = {
  Proteins: 'Meat, fish and eggs',
  Carbs: 'Grains and starches',
  Vegetables: 'Vegetables',
  Fruits: 'Fruit',
  Dairy: 'Dairy',
  Fats: 'Oils, nuts and seeds',
  Condiments: 'Everything else',
};

function categorizeFood(name) {
  const n = (name || '').toLowerCase();
  if (n.match(/chicken|beef|turkey|fish|salmon|tuna|egg|protein|shrimp|pork|lamb/)) return 'Proteins';
  if (n.match(/rice|oat|bread|pasta|potato|quinoa|tortilla|corn/)) return 'Carbs';
  if (n.match(/broccoli|spinach|kale|asparagus|zucchini|pepper|onion|lettuce|tomato/)) return 'Vegetables';
  if (n.match(/apple|banana|berry|mango|orange|fruit/)) return 'Fruits';
  if (n.match(/milk|yogurt|cheese|dairy|whey/)) return 'Dairy';
  if (n.match(/almond|walnut|avocado|olive oil|peanut|butter|oil|nut/)) return 'Fats';
  return 'Condiments';
}

/** "Shopping list" view: every food on the plan, deduped and grouped by aisle. */
export default function ShoppingListTab({ plan, meals }) {
  const [copied, setCopied] = useState(false);
  const [ticked, setTicked] = useState({});

  const groupedItems = useMemo(() => {
    const allFoods = (meals || plan.meals || []).flatMap(m => m.foods || []);
    const groups = {};
    allFoods.forEach(f => {
      const name = f.food_name || f.name;
      if (!name) return;
      const cat = categorizeFood(name);
      if (!groups[cat]) groups[cat] = [];
      // Deduplicate by name
      const existing = groups[cat].find(x => x.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.count++;
      } else {
        groups[cat].push({ name, portion: f.portion || f.amount_household, count: 1 });
      }
    });
    return groups;
  }, [plan, meals]);

  const hasItems = Object.keys(groupedItems).length > 0;
  const total = Object.values(groupedItems).reduce((s, a) => s + a.length, 0);

  function buildListText() {
    return CATEGORIES
      .filter(cat => groupedItems[cat]?.length)
      .map(cat => `${CATEGORY_LABEL[cat]}\n${groupedItems[cat].map(i => `- ${i.name}${i.portion ? ` (${i.portion})` : ''}${i.count > 1 ? ` x${i.count}` : ''}`).join('\n')}`)
      .join('\n\n');
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildListText());
    setCopied(true);
    toast.success('Shopping list copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Panel className="pb-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-5 sm:px-6 pt-5">
        <div>
          <h2 className="text-[22px] text-foreground">Shopping list</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasItems ? `${total} items, built from every food on this day's meals.` : 'Built from the foods in the meals.'}
          </p>
        </div>
        {hasItems && (
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy list'}
          </Button>
        )}
      </div>

      {!hasItems ? (
        <EmptyState title="Nothing to buy yet." body="Add foods to the meals and the list fills in, grouped by aisle." />
      ) : (
        CATEGORIES
          .filter(cat => groupedItems[cat]?.length > 0)
          .map(cat => (
            <div key={cat} className="px-5 sm:px-6 pt-4">
              <p className="text-[13px] text-muted-foreground mb-0.5">{CATEGORY_LABEL[cat]}</p>
              <ul>
                {groupedItems[cat].map((item, i) => {
                  const id = `${cat}-${i}`;
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-b-0">
                      <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!ticked[id]}
                          onChange={() => setTicked(t => ({ ...t, [id]: !t[id] }))}
                          className="h-4 w-4 rounded border-input accent-[rgb(var(--primary))]"
                        />
                        <span className={`text-[15px] truncate ${ticked[id] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.name}</span>
                      </label>
                      <span className="text-[13px] text-muted-foreground tabular-nums flex-shrink-0">
                        {[item.portion, item.count > 1 ? `${item.count}x a day` : null].filter(Boolean).join(' · ')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
      )}
    </Panel>
  );
}
