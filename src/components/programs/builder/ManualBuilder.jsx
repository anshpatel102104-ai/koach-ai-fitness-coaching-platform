import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTitle } from '@/components/ui/dialog';
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
      toast.error('Give the program a name first');
      return;
    }
    if (!form.workouts.some(w => w.exercises?.length > 0)) {
      toast.error('Add at least one exercise first');
      return;
    }

    try {
      setSaving(true);
      const program = await db.entities.WorkoutProgram.create(form);
      toast.success('Program saved');
      onProgramCreated(program);
    } catch (error) {
      toast.error("Couldn't save the program. Try again.");
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

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ');

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-start gap-2 border-b border-border px-5 pb-4 pt-5 pr-12 sm:px-6">
        <button onClick={onBack} className="touch-compact -ml-1.5 mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <DialogTitle className="text-[26px]">Build it yourself</DialogTitle>
          <p className="text-sm text-muted-foreground">Name it, set the basics, add a few days. The full builder opens after you save.</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        {/* Program details */}
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Name</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Push / pull / legs"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Who it's for and how it progresses"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Level</Label>
              <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{cap(d)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Goal</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Weeks</Label>
              <Input
                type="number"
                min="1"
                value={form.duration_weeks}
                onChange={e => setForm(f => ({ ...f, duration_weeks: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Days a week</Label>
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

        {/* Days */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[18px] text-foreground">Training days</h3>
            <Button size="sm" variant="outline" onClick={addDay}>Add a day</Button>
          </div>
          <div className="space-y-3">
            {form.workouts.map((day, idx) => (
              <ManualDayBuilder
                key={idx}
                day={day}
                onUpdate={d => updateDay(idx, d)}
                onRemove={() => removeDay(idx)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSaveProgram} disabled={saving}>
          {saving ? 'Saving…' : 'Save program'}
        </Button>
      </div>
    </div>
  );
}
