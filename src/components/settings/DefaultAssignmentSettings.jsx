import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsPanel, SettingsRow, SettingsSwitchRow } from './SettingsLayout';

export default function DefaultAssignmentSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    auto_assign_enabled: true,
    default_program_id: '',
    default_nutrition_id: '',
    send_welcome_message: true,
    welcome_message: "Welcome. Your program and nutrition plan are in the app now. Message me any time you have a question.",
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
        welcome_message: d.welcome_message || "Welcome. Your program and nutrition plan are in the app now. Message me any time you have a question.",
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
      toast.success('Defaults saved');
    },
    onError: () => toast.error('Could not save. Try again.'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const off = !form.auto_assign_enabled;

  return (
    <SettingsPanel
      title="New client defaults"
      subtitle="What every new client gets the moment you add them."
      footer={
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <><Loader2 className="animate-spin" /> Saving</> : 'Save defaults'}
        </Button>
      }
    >
      <SettingsSwitchRow
        label="Assign defaults automatically"
        help={form.auto_assign_enabled
          ? 'New clients get the program, plan and check-in below.'
          : 'Off. New clients start with nothing assigned.'}
        checked={form.auto_assign_enabled}
        onCheckedChange={v => set('auto_assign_enabled', v)}
      />

      <div className={cn('divide-y divide-border', off && 'opacity-40 pointer-events-none')} aria-disabled={off}>
        <SettingsRow label="Workout program" help="Assigned to every new client.">
          <Select value={form.default_program_id} onValueChange={v => set('default_program_id', v)}>
            <SelectTrigger><SelectValue placeholder="No default program" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {programs.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Nutrition plan" help="Assigned to every new client.">
          <Select value={form.default_nutrition_id} onValueChange={v => set('default_nutrition_id', v)}>
            <SelectTrigger><SelectValue placeholder="No default plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {nutritionPlans.map(n => (
                <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Check-in frequency" help="How often new clients are asked to check in.">
          <Select value={form.checkin_frequency} onValueChange={v => set('checkin_frequency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Every two weeks</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <div>
          <SettingsSwitchRow
            label="Welcome message"
            help="Sent from you as soon as the client is added."
            checked={form.send_welcome_message}
            onCheckedChange={v => set('send_welcome_message', v)}
          />
          {form.send_welcome_message && (
            <div className="pb-4">
              <Textarea
                value={form.welcome_message}
                onChange={e => set('welcome_message', e.target.value)}
                rows={3}
                placeholder="Write your welcome message"
                className="resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </SettingsPanel>
  );
}
