import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import {
  ArrowLeft, Plus, GripVertical, Trash2, ChevronDown, ChevronUp, BookOpen, Calendar, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const QUESTION_TYPES = [
  { type: 'number', label: 'Number Input', icon: '🔢' },
  { type: 'scale', label: 'Scale 1–10', icon: '📊' },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
  { type: 'yes_no', label: 'Yes / No', icon: '✅' },
  { type: 'text_short', label: 'Short Text', icon: '✏️' },
  { type: 'text_long', label: 'Long Text', icon: '📝' },
  { type: 'photo', label: 'Photo Upload', icon: '📷' },
  { type: 'mood', label: 'Mood Selector', icon: '😊' },
  { type: 'measurements', label: 'Measurements', icon: '📏' },
];

const PRESET_QUESTIONS = [
  { preset_key: 'weight', type: 'number', label: 'What is your current weight? (lbs)' },
  { preset_key: 'sleep', type: 'scale', label: 'How was your sleep quality this week?' },
  { preset_key: 'energy', type: 'scale', label: 'How were your energy levels this week?' },
  { preset_key: 'stress', type: 'scale', label: 'How were your stress levels this week?' },
  { preset_key: 'workouts', type: 'multiple_choice', label: 'How many workouts did you complete?', options: ['0', '1', '2', '3', '4', '5', '6+'] },
  { preset_key: 'nutrition', type: 'scale', label: 'Rate your nutrition adherence this week.' },
  { preset_key: 'water', type: 'text_short', label: 'How was your water intake? (avg oz/day)' },
  { preset_key: 'overall', type: 'mood', label: 'How are you feeling overall?' },
  { preset_key: 'injuries', type: 'yes_no', label: 'Any injuries or soreness to report?' },
  { preset_key: 'wins', type: 'text_long', label: 'What were your wins from this week?' },
  { preset_key: 'challenges', type: 'text_long', label: 'What challenges or struggles did you face?' },
  { preset_key: 'goals', type: 'text_long', label: 'What are your goals for next week?' },
  { preset_key: 'photos', type: 'photo', label: 'Submit your weekly progress photos (front, side, back)' },
  { preset_key: 'measurements', type: 'measurements', label: 'Body measurements (inches)' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function uid() { return Math.random().toString(36).slice(2, 9); }

function QuestionCard({ question, index, onChange, onDelete, onMove, total }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-background transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}.</span>
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{question.label || 'Untitled question'}</span>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
          {QUESTION_TYPES.find(t => t.type === question.type)?.label || question.type}
        </span>
        {question.required && <span className="text-[10px] text-destructive font-bold">Required</span>}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <Input
            value={question.label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder="Question text..."
            className="text-sm"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={question.type}
              onChange={e => onChange({ type: e.target.value })}
              className="text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary/40 bg-card"
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.type} value={t.type}>{t.icon} {t.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
              <input type="checkbox" checked={question.required}
                onChange={e => onChange({ required: e.target.checked })}
                className="rounded" />
              Required
            </label>
          </div>

          {question.type === 'multiple_choice' && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Options</p>
              {(question.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={e => {
                      const opts = [...(question.options || [])];
                      opts[i] = e.target.value;
                      onChange({ options: opts });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="text-xs h-8"
                  />
                  <button onClick={() => {
                    const opts = (question.options || []).filter((_, j) => j !== i);
                    onChange({ options: opts });
                  }} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onChange({ options: [...(question.options || []), ''] })}
                className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CheckInFormEditor({ form, clients, onClose }) {
  const [name, setName] = useState(form?.name || '');
  const [description, setDescription] = useState(form?.description || '');
  const [frequency, setFrequency] = useState(form?.frequency || 'weekly');
  const [dueDay, setDueDay] = useState(form?.due_day ?? 0);
  const [reminderHours, setReminderHours] = useState(form?.reminder_hours_before ?? 24);
  const [questions, setQuestions] = useState(form?.questions || []);
  const [settings, setSettings] = useState(form?.settings || { require_photo: false, allow_late: true, notify_coach: true, auto_thankyou: false });
  const [assignTo, setAssignTo] = useState(form?.assign_to || 'all');
  const [clientSchedules, setClientSchedules] = useState(form?.client_schedules || {}); // { clientId: dueDay }
  const [selectedClientIds, setSelectedClientIds] = useState(form?.assigned_client_ids || []);
  const [clientSearch, setClientSearch] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (data) => form?.id
      ? db.entities.CheckInForm.update(form.id, data)
      : db.entities.CheckInForm.create(data),
    onSuccess: () => {
      toast.success(form?.id ? 'Form updated!' : 'Form created!');
      onClose();
    },
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error('Form name is required'); return; }
    saveMutation.mutate({
      name, description, frequency, due_day: dueDay, reminder_hours_before: reminderHours,
      questions, settings, assign_to: assignTo,
      assigned_client_ids: assignTo === 'specific' ? selectedClientIds : [],
      client_schedules: assignTo === 'specific' ? clientSchedules : {},
      is_active: true,
    });
  };

  const addQuestion = (q = {}) => {
    setQuestions(prev => [...prev, { id: uid(), type: 'text_short', label: '', required: false, options: [], ...q }]);
  };

  const addPreset = (preset) => {
    if (questions.some(q => q.preset_key === preset.preset_key)) {
      toast.info('This question is already added');
      return;
    }
    setQuestions(prev => [...prev, { id: uid(), ...preset }]);
  };

  const updateQuestion = (idx, patch) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const deleteQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Forms
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground">{form?.id ? 'Edit Form' : 'New Form'}</span>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saveMutation.isPending} style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            {saveMutation.isPending ? 'Saving...' : (form?.id ? 'Save Changes' : 'Create Form')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Form fields */}
        <div className="lg:col-span-2 space-y-4">

          {/* Basic info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground">Form Details</h3>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Form Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Check-in" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description shown to clients..."
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Frequency</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary/40 bg-card">
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Due Day</label>
                <select value={dueDay} onChange={e => setDueDay(Number(e.target.value))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary/40 bg-card">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Send reminder</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="72" value={reminderHours}
                  onChange={e => setReminderHours(Number(e.target.value))}
                  className="w-20 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary/40 text-center" />
                <span className="text-sm text-muted-foreground">hours before due date</span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">Questions ({questions.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowPresets(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" /> Presets
                </button>
                <button onClick={() => addQuestion()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Preset library */}
            {showPresets && (
              <div className="mb-4 p-4 bg-background border border-border rounded-xl">
                <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wide">Preset Question Library</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PRESET_QUESTIONS.map(p => (
                    <button key={p.preset_key} onClick={() => addPreset(p)}
                      className={cn(
                        'text-left text-xs px-3 py-2.5 rounded-lg border transition-colors',
                        questions.some(q => q.preset_key === p.preset_key)
                          ? 'bg-primary/5 border-primary/20 text-primary font-semibold cursor-default'
                          : 'bg-card border-border text-foreground hover:border-primary/30 hover:bg-primary/5'
                      )}>
                      <span className="mr-1.5">{QUESTION_TYPES.find(t => t.type === p.type)?.icon}</span>
                      {p.label}
                      {questions.some(q => q.preset_key === p.preset_key) && <span className="ml-1 text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {questions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No questions yet. Add from presets or create custom ones.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    total={questions.length}
                    onChange={(patch) => updateQuestion(i, patch)}
                    onDelete={() => deleteQuestion(i)}
                    onMove={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          {/* Form Settings */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground">Settings</h3>
            {[
              { key: 'require_photo', label: 'Require photo submission' },
              { key: 'allow_late', label: 'Allow late submissions' },
              { key: 'notify_coach', label: 'Notify coach when submitted' },
              { key: 'auto_thankyou', label: 'Auto-send thank you message' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">{label}</span>
                <button
                  onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative',
                    settings[key] ? 'bg-primary' : 'bg-muted-foreground'
                  )}>
                  <span className={cn(
                    'absolute top-1 w-4 h-4 bg-card rounded-full shadow transition-transform',
                    settings[key] ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </label>
            ))}
          </div>

          {/* Assign to */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">Assign To</h3>
            {[
              { value: 'all', label: 'All active clients' },
              { value: 'specific', label: 'Specific clients' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="assign_to" value={opt.value}
                  checked={assignTo === opt.value}
                  onChange={() => setAssignTo(opt.value)}
                  className="accent-primary" />
                <span className="text-sm text-foreground">{opt.label}</span>
              </label>
            ))}

            {assignTo === 'specific' && (
              <div className="mt-3 space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:border-primary/40 bg-card"
                  />
                </div>

                {/* Client list with per-client day picker */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {clients
                    .filter(c => !clientSearch || c.name?.toLowerCase().includes(clientSearch.toLowerCase()))
                    .map(client => {
                      const isSelected = selectedClientIds.includes(client.id);
                      const clientDay = clientSchedules[client.id] ?? dueDay;
                      return (
                        <div key={client.id}
                          className={cn(
                            'rounded-lg border p-2.5 transition-all',
                            isSelected ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-muted-foreground'
                          )}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedClientIds(prev =>
                                  prev.includes(client.id)
                                    ? prev.filter(id => id !== client.id)
                                    : [...prev, client.id]
                                );
                              }}
                              className="accent-primary rounded flex-shrink-0"
                            />
                            <span className="text-xs font-semibold text-foreground flex-1 truncate">{client.name}</span>
                          </label>

                          {isSelected && (
                            <div className="mt-2 flex items-center gap-2 pl-5">
                              <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[10px] text-muted-foreground">Due:</span>
                              <select
                                value={clientDay}
                                onChange={e => setClientSchedules(prev => ({ ...prev, [client.id]: Number(e.target.value) }))}
                                className="text-[10px] border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-primary/40 bg-card flex-1"
                              >
                                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {selectedClientIds.length > 0 && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            {saveMutation.isPending ? 'Saving...' : (form?.id ? 'Save Changes' : 'Create Form')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClipboardList({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}