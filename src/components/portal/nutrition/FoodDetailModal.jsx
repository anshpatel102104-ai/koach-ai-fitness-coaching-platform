import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Heart } from 'lucide-react';

export default function FoodDetailModal({ food, mealName, isOpen, onClose, onAddToMeal }) {
  const [serving, setServing] = useState(1);
  const [unit, setUnit] = useState('serving');

  if (!isOpen || !food) return null;

  const unitOptions = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving'];

  // Calculate macros based on serving
  const calcMacros = () => {
    const multiplier = serving;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: (food.protein * multiplier).toFixed(1),
      carbs: (food.carbs * multiplier).toFixed(1),
      fats: (food.fats * multiplier).toFixed(1),
    };
  };

  const macros = calcMacros();

  return (
    <motion.div
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        className="w-full bg-card rounded-t-[28px] p-5"
        onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgb(var(--muted))' }}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Food name */}
        <h2 className="text-foreground font-black text-2xl mb-1">{food.name}</h2>
        {food.brand && <p className="text-muted-foreground text-sm mb-4">{food.brand} · {food.category}</p>}

        {/* Serving size input */}
        <div className="bg-muted rounded-xl p-4 mb-4 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Serving Size</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={serving}
                onChange={e => setServing(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-full px-3 py-3 text-center text-foreground font-black text-xl bg-card rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="px-4 py-3 rounded-xl text-foreground font-semibold text-sm bg-card border border-border focus:outline-none">
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Macro breakdown */}
        <div className="bg-accent rounded-xl p-5 mb-5 border border-accent">
          <p className="text-primary text-center font-black text-3xl leading-none">{macros.calories}</p>
          <p className="text-primary text-center text-xs font-semibold mt-1">calories</p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Protein', value: macros.protein, unit: 'g' },
              { label: 'Carbs', value: macros.carbs, unit: 'g' },
              { label: 'Fats', value: macros.fats, unit: 'g' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-foreground font-bold text-lg">{m.value}</p>
                <p className="text-muted-foreground text-[12px] font-semibold mt-0.5">{m.label}</p>
                <p className="text-muted-foreground text-[12px]">{m.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => { onAddToMeal(food, serving, unit); onClose(); }}
            className="w-full py-4 rounded-xl font-black text-base text-primary-foreground"
            style={{ background: 'rgb(var(--primary))', boxShadow: 'none' }}>
            Add to {mealName}
          </button>
          <button className="w-full py-3 rounded-xl font-bold text-sm text-primary border border-primary bg-accent flex items-center justify-center gap-2">
            <Heart className="w-4 h-4" /> Save to Favorites
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}