import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Settings,
  Hash, BarChart2, List, ToggleLeft, Type, Camera, Smile, Ruler, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const QUESTION_TYPES = [
  { key: 'number', label: 'Number', icon: Hash, desc: 'e.g. Current weight' },
  { key: 'scale', label: 'Scale 1–10', icon: BarChart2, desc: 'e.g. Energy level' },
  { key: 'multiple_choice', label: 'Multiple Choice', icon: List, desc: 'e.g. Workouts done' },
  { key: 'yes_no', label: 'Yes / No', icon: ToggleLeft, desc: 'e.g. Did you meal prep?' },
  { key: 'text_short', label: 'Short Text', icon: Type, desc: 'e.g. Quick win' },
  { key: 'text_long', label: 'Long Text', icon: Type, desc: 'e.g. How was your week?' },
  { key: 'photo', label: 'Photo Upload', icon: Camera, desc: 'e.g. Progress photos' },
  { key: 'mood', label: 'Mood Selector', icon: Smile, desc: 'Emoji grid 😫😕😐🙂😄' },
  { key: 'measurements', label: 'Measurements', icon: Ruler, desc: 'Waist, hips, chest…' },
];

const PRESET_QUESTIONS = [
  { preset_key: 'weight', label: 'Current weight', type: 'number' },
  { preset_key: 'sleep', label: 'Sleep quality (1-10)', type: 'scale' },
  { preset_key: 'energy', label: 'Energy levels (1-10)', type: 'scale' },
  { preset_key: 'stress', label: 'Stress levels (1-10)', type: 'scale' },
  { preset_key: 'workouts', label: 'Workouts completed this week', type: 'multiple_choice', options: ['0', '1', '2', '3', '4', '5+'] },
  { preset_key: 'nutrition', label: 'Nutrition adherence (1-10)', type: 'scale' },
  { preset_key: 'water', label: 'Water intake (glasses/day)', type: 'number' },
  { preset_key: 'feeling', label: 'How are you feeling overall?', type: 'mood' },
  { preset_key: 'injuries', label: 'Any injuries or soreness?', type: 'text_short' },
  { preset_key: 'wins', label: 'Wins from this week', type: 'text_long' },
  { preset_key: 'challenges', label: 'Challenges or struggles', type: 'text_long' },
  { preset_key: 'goals', label: 'Goals for next week', type: 'text_long' },
  { preset_key: 'photos', label: 'Progress photos (front, side, back)', type: 'photo' },
  { preset_key: 'measurements', label: 'Body measurements', type: 'measurements' },
];

const FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'bi_weekly', label: 'Bi-weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function newQuestion(type = 'text_short') {
  return { id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`, type, label: '', required: false, options: [] };
}

function QuestionEditor({ question, onChange, onDelete, index }) {
  const [expanded, setExpanded] = useState(true);
  const typeInfo = QUESTION_TYPES.find(t => t.key === question.type);
  const TypeIcon = typeInfo?.icon;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-background border-b border-border">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
          {index + 1}
        </div>
        {TypeIcon && <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="flex-1 text-xs font-medium text-foreground truncate">{question.label || typeInfo?.label || 'Question'}</span>
        <button onClick={() => setExpanded(v => !v)} className="p-1 text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Question label</label>
            <Input
              value={question.label}
              onChange={e => onChange({ ...question, label: e.target.value })}
              placeholder="e.g. What is your current weight?"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Question type</label>
            <select
              value={question.type}
              onChange={e => onChange({ ...question, type: e.target.value, options: [] })}
              className="w-full h-8 text-sm border border-border rounded-lg px-2 bg-card focus:outline-none focus:border-primary/40"
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>

          {question.type === 'multiple_choice' && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Options (one per line)</label>
              <textarea
                rows={3}
                value={(question.options || []).join('\n')}
                onChange={e => onChange({ ...question, options: e.target.value.split('\n').filter(Boolean) })}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/40"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={question.required}
              onChange={e => onChange({ ...question, required: e.target.checked })}
              className="rounded border-muted-foreground"
            />
            <span className="text-xs text-foreground">Required</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default function CheckInFormBuilderModal({ open, onOpenChange, editingForm, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [dueDay, setDueDay] = useState(0);
  const [reminderHours, setReminderHours] = useState(24);
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({
    require_photo: false,
    allow_late: true,
    notify_coach: true,
    auto_thankyou: false,
  });
  const [assignTo, setAssignTo] = useState('all');
  const [activeSection, setActiveSection] = useState('questions'); // questions | presets | settings

  useEffect(() => {
    if (editingForm) {
      setName(editingForm.name || '');
      setDescription(editingForm.description || '');
      setFrequency(editingForm.frequency || 'weekly');
      setDueDay(editingForm.due_day ?? 0);
      setReminderHours(editingForm.reminder_hours_before ?? 24);
      setQuestions(editingForm.questions || []);
      setSettings(editingForm.settings || { require_photo: false, allow_late: true, notify_coach: true, auto_thankyou: false });
      setAssignTo(editingForm.assign_to || 'all');
    } else {
      setName('');
      setDescription('');
      setFrequency('weekly');
      setDueDay(0);
      setReminderHours(24);
      setQuestions([]);
      setSettings({ require_photo: false, allow_late: true, notify_coach: true, auto_thankyou: false });
      setAssignTo('all');
    }
  }, [editingForm, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => editingForm
      ? db.entities.CheckInForm.update(editingForm.id, data)
      : db.entities.CheckInForm.create(data),
    onSuccess: () => {
      toast.success(editingForm ? 'Form updated' : 'Form created');
      onSaved();
    },
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error('Form name is required'); return; }
    saveMutation.mutate({
      name: name.trim(),
      description,
      frequency,
      due_day: dueDay,
      reminder_hours_before: reminderHours,
      questions,
      settings,
      assign_to: assignTo,
      is_active: true,
    });
  };

  const addQuestion = (type = 'text_short') => {
    setQuestions(qs => [...qs, newQuestion(type)]);
    setActiveSection('questions');
  };

  const addPreset = (preset) => {
    const exists = questions.some(q => q.preset_key === preset.preset_key);
    if (exists) { toast.info('Already added'); return; }
    setQuestions(qs => [...qs, { ...newQuestion(preset.type), label: preset.label, preset_key: preset.preset_key }]);
    setActiveSection('questions');
  };

  const updateQuestion = (idx, updated) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? updated : q));
  };

  const deleteQuestion = (idx) => {
    setQuestions(qs => qs.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-border">
          <DialogTitle className="text-base font-bold">
            {editingForm ? `Edit: ${editingForm.name}` : 'Create Check-in Form'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Form meta */}
          <div className="px-6 py-4 border-b border-border bg-background space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Form name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Check-in" className="h-9" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description for clients" className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="w-full h-9 text-sm border border-border rounded-lg px-2 bg-card focus:outline-none focus:border-primary/40"
                >
                  {FREQUENCIES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Due day</label>
                <select
                  value={dueDay}
                  onChange={e => setDueDay(Number(e.target.value))}
                  className="w-full h-9 text-sm border border-border rounded-lg px-2 bg-card focus:outline-none focus:border-primary/40"
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Remind (hrs before)</label>
                <Input
                  type="number"
                  value={reminderHours}
                  onChange={e => setReminderHours(Number(e.target.value))}
                  min={1}
                  max={72}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex border-b border-border">
            {[
              { key: 'questions', label: `Questions (${questions.length})` },
              { key: 'presets', label: 'Preset Library' },
              { key: 'settings', label: 'Settings' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold transition-colors',
                  activeSection === key
                    ? 'text-primary border-b-2 border-primary bg-card'
                    : 'text-muted-foreground hover:text-foreground bg-background'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-6 py-4">

            {/* Questions */}
            {activeSection === 'questions' && (
              <div className="space-y-3">
                {questions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm mb-3">No questions yet. Add from the preset library or create custom questions.</p>
                  </div>
                )}
                {questions.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    index={i}
                    onChange={(updated) => updateQuestion(i, updated)}
                    onDelete={() => deleteQuestion(i)}
                  />
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  {QUESTION_TYPES.slice(0, 5).map(t => (
                    <button
                      key={t.key}
                      onClick={() => addQuestion(t.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground text-xs text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> {t.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveSection('presets')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground text-xs text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> From Library
                  </button>
                </div>
              </div>
            )}

            {/* Presets */}
            {activeSection === 'presets' && (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Click any preset to add it to your form</p>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_QUESTIONS.map(preset => {
                    const added = questions.some(q => q.preset_key === preset.preset_key);
                    const typeInfo = QUESTION_TYPES.find(t => t.key === preset.type);
                    const TypeIcon = typeInfo?.icon;
                    return (
                      <button
                        key={preset.preset_key}
                        onClick={() => addPreset(preset)}
                        disabled={added}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                          added
                            ? 'border-success bg-success/10 opacity-60 cursor-default'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-primary/5 cursor-pointer'
                        )}
                      >
                        {TypeIcon && (
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                            added ? 'bg-success/10' : 'bg-muted'
                          )}>
                            <TypeIcon className={cn('w-3.5 h-3.5', added ? 'text-success' : 'text-muted-foreground')} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{preset.label}</p>
                          <p className="text-[10px] text-muted-foreground">{typeInfo?.label}</p>
                        </div>
                        {added ? (
                          <span className="text-[10px] text-success font-semibold">Added ✓</span>
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Settings */}
            {activeSection === 'settings' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" /> Form Settings
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: 'require_photo', label: 'Require photo submission', desc: 'Clients must attach at least one photo' },
                      { key: 'allow_late', label: 'Allow late submissions', desc: 'Accept submissions after the due date' },
                      { key: 'notify_coach', label: 'Notify coach immediately', desc: 'Send push notification when client submits' },
                      { key: 'auto_thankyou', label: 'Auto-send thank you message', desc: 'Automatically message client after submission' },
                    ].map(({ key, label, desc }) => (
                      <label key={key} className="flex items-center justify-between gap-4 p-3 bg-background border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings[key] || false}
                          onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))}
                          className="w-4 h-4 flex-shrink-0 rounded border-muted-foreground text-primary"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Assign to</h4>
                  <div className="flex gap-2">
                    {[
                      { key: 'all', label: 'All clients' },
                      { key: 'specific', label: 'Specific clients' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setAssignTo(key)}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                          assignTo === key
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:border-primary/30'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 flex gap-3 bg-card">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !name.trim()}
            className="flex-1"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingForm ? 'Save Changes' : 'Create Form'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}