import React, { useState, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { Search, Star, Loader2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';


function MacroPill({ label, value, color }) {
  if (value == null || value === 0) return null;
  return <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', color)}>{label}: {value}</span>;
}

function FoodResult({ food, onSave, saved }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{food.name}</p>
          {food.brand && <p className="text-[10px] text-muted-foreground">{food.brand}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {food.calories > 0 && <MacroPill label="Cal" value={food.calories} color="bg-orange-50 text-orange-600" />}
            <MacroPill label="P" value={food.protein_g ? `${food.protein_g}g` : null} color="bg-accent text-primary" />
            <MacroPill label="C" value={food.carbs_g ? `${food.carbs_g}g` : null} color="bg-warning/10 text-warning" />
            <MacroPill label="F" value={food.fats_g ? `${food.fats_g}g` : null} color="bg-destructive/10 text-destructive" />
            {food.serving_size && <span className="text-[10px] text-muted-foreground">per {food.serving_size}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSave(food)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              saved ? 'text-warning hover:text-warning' : 'text-muted-foreground hover:text-warning hover:bg-warning/10'
            )}
          >
            <Star className={cn('w-4 h-4', saved && 'fill-warning')} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground bg-secondary/20">
          {food.fiber_g > 0 && <span>Fiber: <strong className="text-foreground">{food.fiber_g}g</strong></span>}
          {food.sugar_g > 0 && <span>Sugar: <strong className="text-foreground">{food.sugar_g}g</strong></span>}
          {food.sodium_mg > 0 && <span>Sodium: <strong className="text-foreground">{food.sodium_mg}mg</strong></span>}
          {food.micronutrients?.vitamin_c_mg > 0 && <span>Vit C: <strong className="text-foreground">{food.micronutrients.vitamin_c_mg}mg</strong></span>}
          {food.micronutrients?.iron_mg > 0 && <span>Iron: <strong className="text-foreground">{food.micronutrients.iron_mg}mg</strong></span>}
          {food.micronutrients?.calcium_mg > 0 && <span>Calcium: <strong className="text-foreground">{food.micronutrients.calcium_mg}mg</strong></span>}
          {food.category && <span className="col-span-3">Category: {food.category}</span>}
        </div>
      )}
    </div>
  );
}

export default function FoodSearchResults({ onSave, isSaved, onSelect, selectMode = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await db.functions.invoke('searchFoods', { query: q.trim(), pageSize: 25 });
      setResults(res.data?.foods || []);
      setSearched(true);
    } catch (e) {
      setError('Search failed. Check your USDA API key.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(window._foodSearchTimer);
    window._foodSearchTimer = setTimeout(() => doSearch(val), 500);
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search millions of foods (e.g. chicken breast, oats, avocado)…"
          className="pl-9"
          value={query}
          onChange={handleChange}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <div className="p-3 bg-warning/10 border border-warning rounded-xl text-xs text-warning mb-4">
          ⚠️ {error} — Using DEMO_KEY has rate limits. Add a free USDA API key in Settings → Environment Variables.
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search the USDA FoodData Central database</p>
          <p className="text-xs mt-1">Covers 600,000+ foods with full nutrition data</p>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No results for "{query}"</p>
          <p className="text-xs mt-1">Try a different spelling or create a custom food</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((food, i) => (
          selectMode ? (
            <button
              key={i}
              onClick={() => onSelect(food)}
              className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <p className="text-sm font-semibold text-foreground">{food.name}</p>
              {food.brand && <p className="text-[10px] text-muted-foreground">{food.brand}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                {food.calories > 0 && <MacroPill label="Cal" value={food.calories} color="bg-orange-50 text-orange-600" />}
                <MacroPill label="P" value={food.protein_g ? `${food.protein_g}g` : null} color="bg-accent text-primary" />
                <MacroPill label="C" value={food.carbs_g ? `${food.carbs_g}g` : null} color="bg-warning/10 text-warning" />
                <MacroPill label="F" value={food.fats_g ? `${food.fats_g}g` : null} color="bg-destructive/10 text-destructive" />
                {food.serving_size && <span className="text-[10px] text-muted-foreground">per {food.serving_size}</span>}
              </div>
            </button>
          ) : (
            <FoodResult key={i} food={food} onSave={onSave} saved={!!isSaved(food)} />
          )
        ))}
      </div>

      {results.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by USDA FoodData Central · {results.length} results
        </p>
      )}
    </div>
  );
}