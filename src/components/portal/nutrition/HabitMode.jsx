import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const HABIT_EMOJIS = ['', '', '', '', '', '', '', ''];

export default function HabitMode({ meals, loggedHabits, onToggleHabit }) {
  const habits = (meals || []).map((m, i) => ({
    id: `habit-${i}`,
    emoji: HABIT_EMOJIS[i % HABIT_EMOJIS.length],
    name: m.meal_name,
    description: m.habit_description || m.foods?.map(f => f.food_name).join(', ') || 'Follow your plan',
  }));

  const completedCount = habits.filter(h => loggedHabits.has(h.id)).length;
  const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="mx-4 p-4 rounded-xl" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-foreground font-bold text-sm">Today's Habits</p>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-bold text-sm">{completedCount}/{habits.length}</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: 'rgb(var(--success))' }}
            animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
        </div>
        <p className="text-muted-foreground text-xs mt-1.5">{pct}% complete today</p>
      </div>

      {/* Habit cards */}
      <div className="px-4 space-y-2.5">
        <AnimatePresence>
          {habits.map((habit) => {
            const done = loggedHabits.has(habit.id);
            return (
              <motion.button key={habit.id} layout onClick={() => onToggleHabit(habit.id)}
                className={cn('w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all')}
                style={{
                  background: done ? 'rgb(var(--success) / 0.1)' : 'rgb(var(--secondary))',
                  border: `1px solid ${done ? 'rgb(var(--success) / 0.25)' : 'rgb(var(--secondary))'}`,
                }}>
                <span className="text-2xl flex-shrink-0">{habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-sm', done ? 'text-muted-foreground line-through' : 'text-foreground')}>{habit.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 truncate">{habit.description}</p>
                </div>
                <motion.div animate={{ scale: done ? [1.3, 1] : 1 }} transition={{ duration: 0.2 }}>
                  {done
                    ? <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                    : <Circle className="w-6 h-6 text-muted-foreground flex-shrink-0" />}
                </motion.div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}