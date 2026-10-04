import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dumbbell, Utensils, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

export default function DefaultAssignmentSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    auto_assign_enabled: true,
    default_program_id: '',
    default_nutrition_id: '',
    send_welcome_message: true,
    welcome_message: "Welcome! I'm excited to start this journey with you. Your program and nutrition plan have been assigned. Let's crush your goals! 💪",
    checkin_frequency: 'weekly',
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => db.entities.WorkoutProgram.list('title', 100),
  });

  const { data: nutritionPlans = [] } = useQuery({
    queryKey: ['nutrition-plans'],
    queryFn: () => db.entities.NutritionPlan.list('title', 100),
  });

  const { data: defaults = [], isLoading } = useQuery({
    queryKey: ['coach-defaults'],
    queryFn: () => db.entities.CoachDefaults.list(),
  });

  useEffect(() => {
    if (defaults.length > 0) {
      const d = defaults[0];
      setForm({
        auto_assign_enabled: d.auto_assign_enabled ?? true,
        default_program_id: d.default_program_id || '',
        default_nutrition_id: d.default_nutrition_id || '',
        send_welcome_message: d.send_welcome_message ?? true,
        welcome_message: d.welcome_message || "Welcome! I'm excited to start this journey with you. Your program and nutrition plan have been assigned. Let's crush your goals! 💪",
        checkin_frequency: d.checkin_frequency || 'weekly',
      });
    }
  }, [defaults]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        auto_assign_enabled: form.auto_assign_enabled,
        default_program_id: form.default_program_id || null,
        default_nutrition_id: form.default_nutrition_id || null,
        send_welcome_message: form.send_welcome_message,
        welcome_message: form.welcome_message,
        checkin_frequency: form.checkin_frequency,
      };
      if (defaults.length > 0) {
        return db.entities.CoachDefaults.update(defaults[0].id, payload);
      } else {
        return db.entities.CoachDefaults.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-defaults'] });
      toast.success('Default assignments saved!');
    },
    onError: () => toast.error('Failed to save. Please try again.'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className={`flex items-center justify-between rounded-2xl px-5 py-4 border-2 transition-all ${
        form.auto_assign_enabled
          ? 'bg-success/10 border-success'
          : 'bg-muted border-border'
      }`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${form.auto_assign_enabled ? 'text-success' : 'text-muted-foreground'}`} />
          <div>
            <p className={`text-sm font-bold ${form.auto_assign_enabled ? 'text-success' : 'text-muted-foreground'}`}>
              Auto-Assignment {form.auto_assign_enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className={`text-xs mt-0.5 ${form.auto_assign_enabled ? 'text-success' : 'text-muted-foreground'}`}>
              {form.auto_assign_enabled
                ? 'New clients automatically receive the defaults below'
                : 'New clients will NOT receive any defaults automatically'}
            </p>
          </div>
        </div>
        <Switch checked={form.auto_assign_enabled} onCheckedChange={v => set('auto_assign_enabled', v)} />
      </div>

      {/* Defaults (dimmed when disabled) */}
      <div className={form.auto_assign_enabled ? '' : 'opacity-40 pointer-events-none'}>

      {/* Program default */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Dumbbell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Default Workout Program</p>
            <p className="text-xs text-muted-foreground">Assigned automatically to every new client</p>
          </div>
        </div>
        <Select value={form.default_program_id} onValueChange={v => set('default_program_id', v)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select a program…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nutrition default */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Utensils className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Default Nutrition Plan</p>
            <p className="text-xs text-muted-foreground">Assigned automatically to every new client</p>
          </div>
        </div>
        <Select value={form.default_nutrition_id} onValueChange={v => set('default_nutrition_id', v)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select a nutrition plan…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {nutritionPlans.map(n => (
              <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Check-in frequency */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ai/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-ai" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Check-In Frequency</p>
            <p className="text-xs text-muted-foreground">How often new clients are reminded to check in</p>
          </div>
        </div>
        <Select value={form.checkin_frequency} onValueChange={v => set('checkin_frequency', v)}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Welcome message */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Welcome Message</p>
              <p className="text-xs text-muted-foreground">Sent automatically when a new client is added</p>
            </div>
          </div>
          <Switch checked={form.send_welcome_message} onCheckedChange={v => set('send_welcome_message', v)} />
        </div>
        {form.send_welcome_message && (
          <Textarea
            value={form.welcome_message}
            onChange={e => set('welcome_message', e.target.value)}
            rows={3}
            placeholder="Write your welcome message…"
            className="text-sm resize-none"
          />
        )}
      </div>

      </div>{/* end dimmed wrapper */}

      <Button
        className="w-full"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Defaults'}
      </Button>
    </div>
  );
}