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
  { type: 'number', label: 'Number' },
  { type: 'scale', label: 'Scale 1–10' },
  { type: 'multiple_choice', label: 'Multiple choice' },
  { type: 'yes_no', label: 'Yes / No' },
  { type: 'text_short', label: 'Short text' },
  { type: 'text_long', label: 'Long text' },
  { type: 'photo', label: 'Photo upload' },
  { type: 'mood', label: 'Mood' },
  { type: 'measurements', label: 'Measurements' },
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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-background transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-semibold text-muted-foreground w-5 tabular-nums">{index + 1}.</span>
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{question.label || 'Untitled question'}</span>
        <span className="text-[12px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
          {QUESTION_TYPES.find(t => t.type === question.type)?.label || question.type}
        </span>
        {question.required && <span className="text-[12px] text-muted-foreground font-medium">Required</span>}
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
              className="h-9 text-sm border border-input rounded-md px-2.5 focus:outline-none focus:border-foreground bg-card"
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.type} value={t.type}>{t.label}</option>
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
              <p className="text-[13px] text-muted-foreground">Options</p>
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
                className="text-[13px] text-foreground font-semibold flex items-center gap-1 underline underline-offset-4 decoration-1">
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
      toast.success(form?.id ? 'Form saved' : 'Form created');
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
          <ArrowLeft className="w-4 h-4" /> All forms
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground">{form?.id ? 'Edit form' : 'New form'}</span>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : (form?.id ? 'Save changes' : 'Create form')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Form fields */}
        <div className="lg:col-span-2 space-y-4">

          {/* Basic info */}
          <div className="panel p-5 space-y-4">
            <h3 className="text-[20px] text-foreground">Details</h3>
            <div>
              <label className="text-[13px] text-muted-foreground mb-1.5 block">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Check-in" />
            </div>
            <div>
              <label className="text-[13px] text-muted-foreground mb-1.5 block">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Shown to clients above the questions. Optional."
                className="w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-[15px] resize-none focus:outline-none focus:border-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] text-muted-foreground mb-1.5 block">Frequency</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 h-10 focus:outline-none focus:border-foreground bg-card">
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground mb-1.5 block">Due day</label>
                <select value={dueDay} onChange={e => setDueDay(Number(e.target.value))}
                  className="w-full text-sm border border-input rounded-md px-3 h-10 focus:outline-none focus:border-foreground bg-card">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[13px] text-muted-foreground mb-1.5 block">Send reminder</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="72" value={reminderHours}
                  onChange={e => setReminderHours(Number(e.target.value))}
                  className="w-20 text-sm border border-input rounded-md px-3 h-10 focus:outline-none focus:border-foreground text-center" />
                <span className="text-sm text-muted-foreground">hours before due date</span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] text-foreground">Questions <span className="text-muted-foreground">{questions.length}</span></h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPresets(v => !v)}>
                  <BookOpen /> Common questions
                </Button>
                <Button size="sm" onClick={() => addQuestion()}>
                  <Plus /> Add question
                </Button>
              </div>
            </div>

            {/* Preset library */}
            {showPresets && (
              <div className="mb-4 p-4 bg-secondary rounded-lg">
                <p className="text-[13px] text-muted-foreground mb-3">Tap to add</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PRESET_QUESTIONS.map(p => (
                    <button key={p.preset_key} onClick={() => addPreset(p)}
                      className={cn(
                        'text-left text-[13px] px-3 py-2.5 rounded-md border transition-colors',
                        questions.some(q => q.preset_key === p.preset_key)
                          ? 'bg-card border-border text-muted-foreground cursor-default'
                          : 'bg-card border-border text-foreground hover:border-foreground'
                      )}>
                      {p.label}
                      {questions.some(q => q.preset_key === p.preset_key) && <span className="ml-1 text-muted-foreground">added</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {questions.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No questions yet. Start with the common ones, or write your own.</p>
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
          <div className="panel p-5 space-y-4">
            <h3 className="text-[20px] text-foreground">Settings</h3>
            {[
              { key: 'require_photo', label: 'Require photo submission' },
              { key: 'allow_late', label: 'Allow late submissions' },
              { key: 'notify_coach', label: 'Notify coach when submitted' },
              { key: 'auto_thankyou', label: 'Send an automatic thank-you' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">{label}</span>
                <button
                  onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative',
                    settings[key] ? 'bg-primary' : 'bg-input'
                  )}>
                  <span className={cn(
                    'absolute top-1 w-4 h-4 bg-card rounded-full transition-transform',
                    settings[key] ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </label>
            ))}
          </div>

          {/* Assign to */}
          <div className="panel p-5 space-y-3">
            <h3 className="text-[20px] text-foreground">Who gets it</h3>
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
                    placeholder="Search clients"
                    className="w-full h-9 pl-8 pr-3 text-sm border border-input rounded-md focus:outline-none focus:border-foreground bg-card"
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
                            isSelected ? 'border-foreground/40 bg-accent' : 'border-border bg-card hover:border-muted-foreground'
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
                            <span className="text-sm font-medium text-foreground flex-1 truncate">{client.name}</span>
                          </label>

                          {isSelected && (
                            <div className="mt-2 flex items-center gap-2 pl-5">
                              <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[12px] text-muted-foreground">Due</span>
                              <select
                                value={clientDay}
                                onChange={e => setClientSchedules(prev => ({ ...prev, [client.id]: Number(e.target.value) }))}
                                className="text-[12px] border border-input rounded px-1.5 py-0.5 focus:outline-none focus:border-foreground bg-card flex-1"
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
                  <p className="text-[12px] text-muted-foreground pt-1">
                    {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? 'Saving…' : (form?.id ? 'Save changes' : 'Create form')}
          </Button>
        </div>
      </div>
    </div>
  );
}

