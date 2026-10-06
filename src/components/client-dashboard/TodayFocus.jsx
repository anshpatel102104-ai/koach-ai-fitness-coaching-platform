import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TodayFocus({ tasks = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState('');

  const toggle = (idx) => {
    const updated = tasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
    onChange(updated);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    onChange([...tasks, { text: newTask.trim(), done: false }]);
    setNewTask('');
    setAdding(false);
  };

  const remove = (idx) => onChange(tasks.filter((_, i) => i !== idx));

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl text-foreground">Today's focus</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {tasks.filter(t => t.done).length}/{tasks.length} done
          </p>
        </div>
        {tasks.length < 3 && (
          <button
            onClick={() => setAdding(true)}
            aria-label="Add a focus" className="touch-compact w-8 h-8 rounded-md border border-input bg-card hover:bg-accent flex items-center justify-center text-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && !adding && (
          <button onClick={() => setAdding(true)} className="w-full py-3 text-sm text-muted-foreground border border-dashed border-input rounded-lg hover:text-foreground">
            Add up to three things to focus on
          </button>
        )}
        {tasks.map((task, idx) => (
          <div key={idx} className={cn(
            "flex items-center gap-3 p-3 rounded-lg group bg-secondary"
          )}>
            <button
              onClick={() => toggle(idx)}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                task.done ? "bg-success text-white" : "border-[1.5px] border-input hover:border-foreground"
              )}
            >
              {task.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </button>
            <span className={cn("flex-1 text-sm", task.done && "line-through text-muted-foreground")}>{task.text}</span>
            <button onClick={() => remove(idx)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="What's one thing to focus on?"
              className="flex-1 text-base bg-card border border-input rounded-md px-3 py-2 outline-none focus:border-foreground"
            />
            <button onClick={addTask} className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-md">Add</button>
            <button onClick={() => setAdding(false)} className="text-sm text-muted-foreground px-2 py-2 underline underline-offset-4">Cancel</button>
          </div>
        )}
      </div>
    </section>
  );
}