import { Apple } from 'lucide-react';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSectionCard from './ProfileSectionCard';

const DIETS = ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-free', 'Dairy-free', 'Halal', 'Kosher', 'Low-carb', 'Mediterranean'];

export default function ProfileNutritionPrefs({ client, queryClient }) {
  const [dietary, setDietary] = useState([]);
  const [allergies, setAllergies] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [waterGoal, setWaterGoal] = useState(8);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (item) => {
    setDietary(p => p.includes(item) ? p.filter(x => x !== item) : [...p, item]);
    setDirty(true);
  };

  const save = async () => {
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ProfileSectionCard icon={Apple} title="Nutrition Preferences">
      <div className="pt-3 space-y-5">
        {/* Dietary */}
        <div>
          <p className="text-muted-foreground text-xs mb-2">Dietary Preferences</p>
          <div className="flex flex-wrap gap-2">
            {DIETS.map(d => (
              <button key={d} onClick={() => toggle(d)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: dietary.includes(d) ? 'rgb(var(--success) / 0.2)' : 'rgb(var(--secondary))',
                  color: dietary.includes(d) ? 'rgb(var(--success))' : 'rgb(var(--muted-foreground))',
                  border: `1px solid ${dietary.includes(d) ? 'rgb(var(--success) / 0.4)' : 'transparent'}`,
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <p className="text-muted-foreground text-xs mb-1.5">Food Allergies</p>
          <input
            className="w-full bg-transparent text-foreground text-sm outline-none border-b border-border pb-1 focus:border-primary transition-colors"
            placeholder="e.g. peanuts, shellfish, tree nuts..."
            value={allergies}
            onChange={e => { setAllergies(e.target.value); setDirty(true); }}
          />
        </div>

        {/* Dislikes */}
        <div>
          <p className="text-muted-foreground text-xs mb-1.5">Foods I Dislike</p>
          <input
            className="w-full bg-transparent text-foreground text-sm outline-none border-b border-border pb-1 focus:border-primary transition-colors"
            placeholder="e.g. broccoli, fish..."
            value={dislikes}
            onChange={e => { setDislikes(e.target.value); setDirty(true); }}
          />
        </div>

        {/* Water goal */}
        <div>
          <p className="text-muted-foreground text-xs mb-2">Daily Water Goal (glasses)</p>
          <div className="flex items-center gap-3">
            <button onClick={() => { setWaterGoal(w => Math.max(1, w - 1)); setDirty(true); }}
              className="w-9 h-9 rounded-full text-foreground text-xl flex items-center justify-center"
              style={{ background: 'rgb(var(--secondary))' }}>-</button>
            <span className="text-foreground font-bold text-xl w-12 text-center">{waterGoal}</span>
            <button onClick={() => { setWaterGoal(w => Math.min(20, w + 1)); setDirty(true); }}
              className="w-9 h-9 rounded-full text-foreground text-xl flex items-center justify-center"
              style={{ background: 'rgb(var(--secondary))' }}>+</button>
          </div>
        </div>

        {/* Calories — read only */}
        <div className="p-3 rounded-xl" style={{ background: 'rgb(var(--secondary))' }}>
          <p className="text-muted-foreground text-xs mb-1">Daily Calorie Goal</p>
          <p className="text-foreground text-sm">Set by your coach</p>
        </div>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.button exit={{ opacity: 0 }}
            onClick={save}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-primary-foreground"
            style={{ background: 'rgb(var(--primary))' }}>
            {saved ? 'Saved' : 'Save Preferences'}
          </motion.button>
        )}
      </AnimatePresence>
    </ProfileSectionCard>
  );
}