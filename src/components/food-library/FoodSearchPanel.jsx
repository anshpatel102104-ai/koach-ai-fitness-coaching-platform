import React, { useState, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { Search, Loader2, Plus, Check, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORY_FILTERS = ['All', 'Proteins', 'Carbs', 'Vegetables', 'Dairy', 'Fruits', 'Snacks', 'Grains'];

const CATEGORY_STYLES = {
  Proteins:   'bg-accent text-primary',
  Carbs:      'bg-warning/10 text-warning',
  Vegetables: 'bg-success/10 text-success',
  Dairy:      'bg-accent text-primary',
  Fruits:     'bg-pink-100 text-pink-700',
  Snacks:     'bg-orange-100 text-orange-700',
  Grains:     'bg-warning/10 text-warning',
};

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

function getSourceTag(food) {
  if (food.brand) return { label: food.brand, style: 'bg-muted text-muted-foreground' };
  if (food.category) return { label: food.category, style: 'bg-muted text-muted-foreground' };
  return { label: 'Generic', style: 'bg-muted text-muted-foreground' };
}

function FoodRow({ food, onSave, saved }) {
  const sourceTag = getSourceTag(food);

  return (
    <div className="px-3 py-3 hover:bg-secondary/30 transition-colors border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Full name */}
          <p className="text-sm font-bold text-foreground leading-snug">{food.name}</p>

          {/* Source tag + USDA badge */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceTag.style}`}>
              {sourceTag.label}
            </span>
            {food.category && food.brand && (
              <span className="text-[10px] text-muted-foreground">{food.category}</span>
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-success font-semibold">
              <ShieldCheck className="w-3 h-3" />USDA Verified
            </span>
          </div>

          {/* Macros per 100g */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">per 100g:</span>
            {food.calories  > 0 && <span className="text-[10px] font-semibold text-orange-600">🔥 {food.calories}cal</span>}
            {food.protein_g > 0 && <span className="text-[10px] font-semibold text-primary">💪 {food.protein_g}g</span>}
            {food.carbs_g   > 0 && <span className="text-[10px] font-semibold text-warning">🌾 {food.carbs_g}g</span>}
            {food.fats_g    > 0 && <span className="text-[10px] font-semibold text-success">🥑 {food.fats_g}g</span>}
          </div>

          {/* Serving hint */}
          {food.serving_size && (
            <p className="text-[10px] text-muted-foreground mt-1">Typical serving: {food.serving_size}</p>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={() => onSave(food)}
          disabled={saved}
          className={cn(
            'shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all mt-0.5',
            saved
              ? 'text-success bg-success/10 border border-success cursor-default'
              : 'text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20'
          )}
        >
          {saved ? <><Check className="w-3 h-3" /> Saved</> : <><Plus className="w-3 h-3" /> Add</>}
        </button>
      </div>
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
          placeholder="Search by food name, brand, or category..."
          className="pl-9 bg-secondary/40 pr-9"
          value={query}
          onChange={handleChange}
          autoFocus
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Category filter pills */}
      {searched && results.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {CATEGORY_FILTERS.map(cat => {
            const count = cat === 'All' ? results.length : results.filter(f => mapCategory(f) === cat).length;
            if (count === 0 && cat !== 'All') return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                {cat} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* States */}
      {!searched && !loading && (
        <div className="text-center py-8">
          <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">USDA FoodData Central — 600,000+ foods</p>
          <p className="text-[11px] text-muted-foreground mt-1">Try "chicken breast" or "brown rice"</p>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-8">
          <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-sm font-semibold text-foreground">No results for "{query}"</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Try "chicken breast" or "brown rice"</p>
        </div>
      )}

      {searched && !loading && results.length > 0 && filtered.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          No {activeCategory} results — <button className="text-primary font-semibold" onClick={() => setActiveCategory('All')}>Show all {results.length}</button>
        </p>
      )}

      {/* Results list */}
      {filtered.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden max-h-96 overflow-y-auto bg-card">
          {filtered.map((food, i) => (
            <FoodRow key={i} food={food} onSave={onSave} saved={isSaved(food)} />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          USDA FoodData Central · {results.length} results
        </p>
      )}
    </div>
  );
}