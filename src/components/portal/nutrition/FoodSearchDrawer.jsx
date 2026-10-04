import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';

const UNITS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving', 'ml'];

function FoodRow({ food, onSelect }) {
  return (
    <button onClick={() => onSelect(food)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{food.name || food.food_name}</p>
        <p className="text-white/30 text-xs">{food.brand || food.serving_unit || ''} · {food.serving_size || food.serving_quantity || 1} {food.serving_unit || 'g'}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white/60 text-xs font-semibold">{food.calories} kcal</p>
        <p className="text-white/25 text-[10px]">P:{food.protein}g C:{food.carbs}g F:{food.fats}g</p>
      </div>
    </button>
  );
}

function ServingSizer({ food, onAdd, onClose }) {
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState(food.serving_unit || 'serving');
  const factor = qty; // For simplicity; real app would scale by weight
  const scaled = (v) => v ? Math.round(v * factor * 10) / 10 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between">
        <p className="text-white font-bold text-base">{food.name || food.food_name}</p>
        <button onClick={onClose}><X className="w-4 h-4 text-white/40" /></button>
      </div>
      {/* Macro preview */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Cal', value: scaled(food.calories), color: 'rgb(var(--warning))' },
          { label: 'Protein', value: scaled(food.protein), color: 'rgb(var(--primary))' },
          { label: 'Carbs', value: scaled(food.carbs), color: '#F97316' },
          { label: 'Fats', value: scaled(food.fats), color: '#EAB308' },
        ].map(m => (
          <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: `${m.color}10` }}>
            <p className="font-bold text-sm" style={{ color: m.color }}>{m.value}</p>
            <p className="text-white/30 text-[9px]">{m.label}</p>
          </div>
        ))}
      </div>
      {/* Quantity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => setQty(q => Math.max(0.5, q - 0.5))} className="text-white/60 text-xl font-bold w-8 h-8 flex items-center justify-center">−</button>
          <p className="flex-1 text-center text-white font-bold text-xl">{qty}</p>
          <button onClick={() => setQty(q => q + 0.5)} className="text-white/60 text-xl font-bold w-8 h-8 flex items-center justify-center">+</button>
        </div>
        <select value={unit} onChange={e => setUnit(e.target.value)}
          className="px-3 py-3 rounded-xl text-white text-sm font-semibold focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {UNITS.map(u => <option key={u} value={u} style={{ background: '#1a1a2e' }}>{u}</option>)}
        </select>
      </div>
      <button onClick={() => onAdd({ ...food, serving_quantity: qty, serving_unit: unit, calories: scaled(food.calories), protein: scaled(food.protein), carbs: scaled(food.carbs), fats: scaled(food.fats) })}
        className="w-full py-4 rounded-xl font-bold text-white text-base"
        style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
        Add to Log
      </button>
    </motion.div>
  );
}

export default function FoodSearchDrawer({ open, mealName, recentFoods, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const searchTimeout = useRef(null);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await portalDb.functions.invoke('searchFoods', { query: q, limit: 15 });
      setResults(res?.data?.items || res?.data || []);
      setLoading(false);
    }, 400);
  };

  const handleSelect = (food) => setSelected(food);
  const handleAdd = (food) => {
    onAdd({ ...food, meal_name: mealName, food_name: food.name || food.food_name });
    setSelected(null);
    setQuery('');
    setResults([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="mt-auto rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: '#0F1628', maxHeight: '85vh', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <input autoFocus value={query} onChange={e => handleSearch(e.target.value)}
              placeholder="Search foods..."
              className="flex-1 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none" />
            {query && <button onClick={() => { setQuery(''); setResults([]); }}><X className="w-3.5 h-3.5 text-white/30" /></button>}
          </div>
          <button onClick={onClose} className="text-white/40 text-sm font-semibold">Cancel</button>
        </div>

        {/* Serving sizer */}
        {selected ? (
          <div className="overflow-y-auto">
            <ServingSizer food={selected} onAdd={handleAdd} onClose={() => setSelected(null)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="text-white/30 text-sm text-center py-8">Searching...</p>}

            {results.length > 0 && (
              <div>
                <p className="text-white/25 text-[10px] font-bold uppercase tracking-wider px-5 py-2">Results</p>
                {results.map((f, i) => <FoodRow key={i} food={f} onSelect={handleSelect} />)}
              </div>
            )}

            {!query && recentFoods.length > 0 && (
              <div>
                <p className="text-white/25 text-[10px] font-bold uppercase tracking-wider px-5 py-2">Recent Foods</p>
                {recentFoods.slice(0, 8).map((f, i) => <FoodRow key={i} food={f} onSelect={handleSelect} />)}
              </div>
            )}

            {!query && recentFoods.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-4xl mb-3">🥗</p>
                <p className="text-white/30 text-sm">Search for any food to log it</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}