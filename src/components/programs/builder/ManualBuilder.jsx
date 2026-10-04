import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import ManualDayBuilder from './ManualDayBuilder';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'elite'];
const CATEGORIES = ['strength', 'hypertrophy', 'fat_loss', 'athletic', 'mobility', 'custom'];

export default function ManualBuilder({ onBack, onProgramCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'intermediate',
    category: 'custom',
    duration_weeks: 12,
    days_per_week: 4,
    workouts: [
      { day_name: 'Day 1', day_number: 1, exercises: [] },
    ],
  });

  const handleSaveProgram = async () => {
    if (!form.title) {
      toast.error('Please enter a program name');
      return;
    }
    if (!form.workouts.some(w => w.exercises?.length > 0)) {
      toast.error('Add at least one exercise to your program');
      return;
    }

    try {
      setSaving(true);
      const program = await db.entities.WorkoutProgram.create(form);
      toast.success('Program created successfully!');
      onProgramCreated(program);
    } catch (error) {
      toast.error('Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  const addDay = () => {
    const newDayNum = (form.workouts[form.workouts.length - 1]?.day_number || 0) + 1;
    setForm(f => ({
      ...f,
      workouts: [...f.workouts, {
        day_name: `Day ${newDayNum}`,
        day_number: newDayNum,
        exercises: [],
      }],
    }));
  };

  const removeDay = (idx) => {
    setForm(f => ({
      ...f,
      workouts: f.workouts.filter((_, i) => i !== idx),
    }));
  };

  const updateDay = (idx, dayData) => {
    setForm(f => ({
      ...f,
      workouts: f.workouts.map((w, i) => i === idx ? dayData : w),
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-h-96 overflow-y-auto pr-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="hover:bg-accent rounded-lg p-1.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-heading text-xl">Build Manually</h2>
      </div>

      {/* Program Details */}
      <div className="space-y-4 border-b pb-4">
        <div>
          <Label>Program Name *</Label>
          <Input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g., Push/Pull/Legs"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Difficulty</Label>
            <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration (weeks)</Label>
            <Input
              type="number"
              min="1"
              value={form.duration_weeks}
              onChange={e => setForm(f => ({ ...f, duration_weeks: parseInt(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Days Per Week</Label>
            <Input
              type="number"
              min="1"
              max="7"
              value={form.days_per_week}
              onChange={e => setForm(f => ({ ...f, days_per_week: parseInt(e.target.value) }))}
            />
          </div>
        </div>
      </div>

      {/* Days Builder */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Training Days</h3>
          <Button size="sm" variant="outline" onClick={addDay} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Day
          </Button>
        </div>
        {form.workouts.map((day, idx) => (
          <ManualDayBuilder
            key={idx}
            day={day}
            onUpdate={d => updateDay(idx, d)}
            onRemove={() => removeDay(idx)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSaveProgram} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Program'}
        </Button>
      </div>
    </motion.div>
  );
}