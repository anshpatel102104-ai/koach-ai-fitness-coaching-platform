import React, { useState, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { Search, Loader2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';
import { Input } from '@/components/ui/input';

const CATEGORY_FILTERS = ['All', 'Proteins', 'Carbs', 'Vegetables', 'Dairy', 'Fruits', 'Snacks', 'Grains'];

// Map USDA category strings to our filter buckets
function mapCategory(food) {
  const cat = (food.category || '').toLowerCase();
  const name = (food.name || '').toLowerCase();
  if (/poultry|beef|pork|fish|seafood|lamb|meat|protein|egg/.test(cat + name)) return 'Proteins';
  if (/bread|pasta|rice|grain|cereal|flour|oat|wheat/.test(cat + name))        return 'Grains';
  if (/vegetable|broccoli|spinach|kale|lettuce|carrot|pepper|tomato/.test(cat + name)) return 'Vegetables';
  if (/milk|cheese|yogurt|dairy|cream/.test(cat + name))                       return 'Dairy';
  if (/fruit|apple|banana|orange|berry|grape|mango/.test(cat + name))          return 'Fruits';
  if (/chip|cookie|cake|candy|snack|bar|cracker/.test(cat + name))             return 'Snacks';
  if (/potato|rice|pasta|corn|bean|legume|carb/.test(cat + name))              return 'Carbs';
  return null; // uncategorized → shown under All
}

function FoodRow({ food, onSave, saved }) {
  const source = [food.brand, food.category].filter(Boolean).join(' · ') || 'Generic';
  const macros = [
    food.protein_g > 0 ? `${food.protein_g} g P` : null,
    food.carbs_g > 0 ? `${food.carbs_g} g C` : null,
    food.fats_g > 0 ? `${food.fats_g} g F` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground leading-snug">{food.name}</p>
        <p className="text-[13px] text-muted-foreground truncate">{source}, USDA</p>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Per 100 g: {food.calories > 0 ? `${food.calories} kcal` : '—'}{macros ? ` · ${macros}` : ''}
          {food.serving_size ? ` · usual serving ${food.serving_size}` : ''}
        </p>
      </div>
      <Button
        size="sm"
        variant={saved ? 'ghost' : 'outline'}
        onClick={() => onSave(food)}
        disabled={saved}
        className="shrink-0"
      >
        {saved ? <><Check /> Saved</> : <><Plus /> Add</>}
      </Button>
    </div>
  );
}

export default function FoodSearchPanel({ onSave, isSaved }) {
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await db.functions.invoke('searchFoods', { query: q.trim(), pageSize: 25 });
      setResults(res.data?.foods || []);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(window._foodSearchTimer);
    window._foodSearchTimer = setTimeout(() => doSearch(val), 450);
  };

  // Apply category filter
  const filtered = activeCategory === 'All'
    ? results
    : results.filter(f => mapCategory(f) === activeCategory);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by food, brand or category"
          className="pl-9 pr-9"
          value={query}
          onChange={handleChange}
          autoFocus
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Category filter */}
      {searched && results.length > 0 && (
        <Segmented
          size="sm"
          className="mb-3"
          value={activeCategory}
          onChange={setActiveCategory}
          options={CATEGORY_FILTERS
            .map(cat => ({ value: cat, label: cat, count: cat === 'All' ? results.length : results.filter(f => mapCategory(f) === cat).length }))
            .filter(o => o.value === 'All' || o.count > 0)}
        />
      )}

      {/* States */}
      {!searched && !loading && (
        <p className="text-sm text-muted-foreground py-6">Try "chicken breast" or "brown rice". Results come from USDA FoodData Central.</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground py-6">Nothing found for "{query}". Try a simpler name, like "chicken breast".</p>
      )}

      {searched && !loading && results.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          No {activeCategory.toLowerCase()} in these results. <button className="font-semibold text-foreground underline underline-offset-4" onClick={() => setActiveCategory('All')}>Show all {results.length}</button>
        </p>
      )}

      {/* Results list */}
      {filtered.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden max-h-96 overflow-y-auto bg-card">
          {filtered.map((food, i) => (
            <FoodRow key={i} food={food} onSave={onSave} saved={isSaved(food)} />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <p className="text-[13px] text-muted-foreground mt-2">
          {results.length} results from USDA FoodData Central
        </p>
      )}
    </div>
  );
}