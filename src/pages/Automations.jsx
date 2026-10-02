import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import {
  Zap, Plus, Check, Pencil, Trash2, ToggleLeft, ToggleRight, Play, Clock, History, LayoutTemplate, List,
  Bell, MessageSquare, Trophy, Flag, TrendingDown, Scale,
  UserCheck, Activity, Target, Heart, Star, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInDays, parseISO, formatDistanceToNow, format } from 'date-fns';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import RuleBuilderModal from '@/components/automations/RuleBuilderModal';

// ── Template categories ────────────────────────────────────────────────────
const TEMPLATE_CATEGORIES = [
  {
    label: 'Check-In',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-primary',
    templates: [
      { name: 'Missed Check-in Alert', description: 'Auto-message clients who miss their weekly check-in', icon: <Clock className="w-5 h-5" />, trigger_type: 'no_checkin', trigger_value: 7, actions: [{ type: 'send_message', message: "Hey {client_name}! Just checking in — I noticed you missed your weekly check-in. How has training been going? Drop me a message when you get a chance 💪" }] },
      { name: 'Low Compliance Alert', description: 'Flag at-risk + send motivation when compliance drops below 60%', icon: <TrendingDown className="w-5 h-5" />, trigger_type: 'low_compliance', trigger_value: 60, actions: [{ type: 'send_message', message: "Hey {client_name}, I noticed your compliance has been a bit low. Life gets busy — let's chat about adjusting things to work better for you! 🔥" }, { type: 'flag_at_risk' }] },
      { name: 'Perfect Week Reward', description: 'Award badge + send congrats when compliance exceeds 90%', icon: <Trophy className="w-5 h-5" />, trigger_type: 'high_compliance', trigger_value: 90, actions: [{ type: 'award_badge', value: 'perfect_week' }, { type: 'send_message', message: "🎉 {client_name}, you absolutely crushed it this week! Perfect compliance — I'm so proud of you. Keep it up!" }] },
      { name: 'Check-in Streak Badge', description: 'Auto-award streak badge when client hits 7-day streak', icon: <Star className="w-5 h-5" />, trigger_type: 'streak', trigger_value: 7, actions: [{ type: 'award_badge', value: 'streak_7' }, { type: 'send_message', message: "🔥 {client_name}, 7-day streak achieved! You're on fire. Keep this momentum going!" }] },
    ],
  },
  {
    label: 'Nutrition',
    icon: <Activity className="w-4 h-4" />,
    color: 'text-success',
    templates: [
      { name: 'Weight Plateau Calorie Adjust', description: 'Reduce calories by 100 when weight stalls for 3 check-ins', icon: <Scale className="w-5 h-5" />, trigger_type: 'weight_plateau', trigger_value: 3, actions: [{ type: 'adjust_calories', value: '-100' }, { type: 'notify_coach', message: "{client_name}'s weight has plateaued for 3 check-ins — calories reduced by 100 automatically." }] },
      { name: 'Rapid Weight Loss Adjustment', description: 'Increase calories when losing more than 2 lbs/week', icon: <TrendingDown className="w-5 h-5" />, trigger_type: 'weight_loss_fast', trigger_value: 2, actions: [{ type: 'adjust_calories', value: '+150' }, { type: 'notify_coach', message: "{client_name} is losing weight too quickly — calories increased by 150." }] },
      { name: 'Protein Target Miss', description: 'Send nutrition tip when nutrition compliance is low', icon: <Target className="w-5 h-5" />, trigger_type: 'low_compliance', trigger_value: 70, actions: [{ type: 'send_message', message: "Hey {client_name}! Quick nutrition tip — hitting your protein targets is the #1 driver of your results. Try adding a protein shake after training 🥤" }] },
      { name: 'Calorie Goal Streak', description: 'Award badge when nutrition compliance hits 90%+ for 5 days', icon: <Trophy className="w-5 h-5" />, trigger_type: 'high_compliance', trigger_value: 90, actions: [{ type: 'award_badge', value: 'nutrition_star' }] },
    ],
  },
  {
    label: 'Progress',
    icon: <Target className="w-4 h-4" />,
    color: 'text-ai',
    templates: [
      { name: 'Monthly Progress Message', description: 'Send a monthly summary message after 30+ days in program', icon: <Activity className="w-5 h-5" />, trigger_type: 'streak', trigger_value: 30, actions: [{ type: 'send_message', message: "🎯 {client_name} — one month in! You're building incredible habits. Compliance: {compliance}%. Let's review your progress together!" }] },
      { name: 'PR Achievement', description: 'Award PR badge and celebrate personal record', icon: <Star className="w-5 h-5" />, trigger_type: 'high_compliance', trigger_value: 95, actions: [{ type: 'award_badge', value: 'pr_hit' }, { type: 'send_message', message: "🏆 {client_name}, new personal record! This is what consistent effort looks like — amazing work!" }] },
      { name: 'Halfway Milestone', description: 'Celebrate when client hits 14-day streak', icon: <Trophy className="w-5 h-5" />, trigger_type: 'streak', trigger_value: 14, actions: [{ type: 'award_badge', value: 'streak_14' }, { type: 'send_message', message: "🔥 Two weeks straight, {client_name}! You're halfway to a full month streak. The habit is forming — keep going!" }] },
      { name: 'Momentum Builder', description: 'Award 30-day badge for sustained commitment', icon: <Heart className="w-5 h-5" />, trigger_type: 'streak', trigger_value: 30, actions: [{ type: 'award_badge', value: 'streak_30' }] },
    ],
  },
  {
    label: 'Engagement',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-orange-600',
    templates: [
      { name: 'Re-engagement Nudge', description: 'Send a nudge when client hasn\'t checked in for 14 days', icon: <Bell className="w-5 h-5" />, trigger_type: 'no_checkin', trigger_value: 14, actions: [{ type: 'send_message', message: "Hey {client_name}! It's been a while — missing you! How are things going? Let's reconnect and get back on track 💙" }, { type: 'flag_at_risk' }] },
      { name: 'New Client Welcome', description: 'Auto-send welcome message when client becomes active', icon: <UserCheck className="w-5 h-5" />, trigger_type: 'new_client', actions: [{ type: 'send_message', message: "Welcome to the team, {client_name}! 🎉 I'm so excited to start this journey with you. Your first check-in is scheduled — let's crush your goals together!" }] },
      { name: 'Low Mood Support', description: 'Send supportive message when client reports low mood', icon: <Heart className="w-5 h-5" />, trigger_type: 'no_checkin', trigger_value: 5, actions: [{ type: 'send_message', message: "Hey {client_name}, just thinking about you! Remember — progress isn't always linear. You've got this, and I'm here every step of the way 💙" }] },
      { name: 'Coach At-Risk Alert', description: 'Notify yourself when a client needs immediate attention', icon: <Flag className="w-5 h-5" />, trigger_type: 'no_checkin', trigger_value: 10, actions: [{ type: 'flag_at_risk' }, { type: 'notify_coach', message: "{client_name} has missed check-ins for 10+ days and needs immediate outreach." }] },
    ],
  },
];

// ── Execution engine ───────────────────────────────────────────────────────
function useAutomationEngine(rules, clients, checkIns, plans, badges, queryClient) {
  const executeAction = useCallback(async (action, client, lastCheckIn, allClientCheckIns) => {
    const msg = (action.message || '')
      .replace(/\{client_name\}/g, client.name)
      .replace(/\{streak\}/g, calculateStreak(allClientCheckIns))
      .replace(/\{compliance\}/g, lastCheckIn?.compliance_training ?? 0)
      .replace(/\{weight\}/g, lastCheckIn?.weight ?? client.current_weight ?? '?');

    switch (action.type) {
      case 'send_message':
        if (msg) await base44.entities.Message.create({ client_id: client.id, content: msg, sender: 'coach' });
        break;
      case 'notify_coach':
        await base44.entities.Notification.create({ recipient_id: 'coach', title: `Automation: ${client.name}`, body: msg || `Rule triggered for ${client.name}`, type: 'general', related_client_id: client.id });
        break;
      case 'award_badge': {
        if (!action.value) break;
        const alreadyHas = badges.some(b => b.client_id === client.id && b.badge_key === action.value);
        if (!alreadyHas) await base44.entities.ClientBadge.create({ client_id: client.id, client_name: client.name, badge_key: action.value, earned_date: new Date().toISOString().split('T')[0], notes: 'Auto-awarded by automation' });
        break;
      }
      case 'update_status':
        if (action.value) await base44.entities.Client.update(client.id, { lifecycle_status: action.value });
        break;
      case 'adjust_calories': {
        const plan = plans.find(p => p.id === client.assigned_nutrition_id);
        if (plan) {
          const delta = Number(action.value) || 0;
          await base44.entities.NutritionPlan.update(plan.id, { calories: (plan.calories || 2000) + delta });
        }
        break;
      }
      case 'flag_at_risk':
        await base44.entities.Client.update(client.id, { lifecycle_status: 'at_risk' });
        break;
    }
  }, [badges, plans]);

  const runAutomations = useCallback(async () => {
    const activeRules = rules.filter(r => r.is_active && r.trigger_type);
    if (activeRules.length === 0) return;

    let totalFired = 0;

    for (const rule of activeRules) {
      for (const client of clients) {
        if (client.lifecycle_status === 'lead') continue;
        const cis = checkIns.filter(ci => ci.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastCI = cis[0];

        let triggered = false;
        const tv = Number(rule.trigger_value) || 0;

        switch (rule.trigger_type) {
          case 'no_checkin': {
            const daysSince = lastCI ? differenceInDays(new Date(), parseISO(lastCI.date)) : 999;
            triggered = daysSince >= tv;
            break;
          }
          case 'low_compliance': {
            const score = averageAdherenceScore(cis.slice(0, 3));
            triggered = score !== null && score < tv;
            break;
          }
          case 'high_compliance': {
            const score = averageAdherenceScore(cis.slice(0, 3));
            triggered = score !== null && score >= tv;
            break;
          }
          case 'streak': {
            triggered = calculateStreak(cis) >= tv;
            break;
          }
          case 'weight_plateau': {
            const withW = cis.filter(ci => ci.weight != null).slice(0, tv + 1);
            if (withW.length >= tv) {
              const range = Math.max(...withW.map(c => c.weight)) - Math.min(...withW.map(c => c.weight));
              triggered = range < 1;
            }
            break;
          }
          case 'weight_loss_fast': {
            if (cis.length >= 2 && cis[0].weight && cis[1].weight) {
              triggered = (cis[1].weight - cis[0].weight) > tv;
            }
            break;
          }
          case 'new_client':
            triggered = client.lifecycle_status === 'active' && differenceInDays(new Date(), parseISO(client.created_date || new Date().toISOString())) <= 1;
            break;
        }

        if (triggered) {
          const actions = rule.actions?.length ? rule.actions : [{ type: rule.action_type, message: rule.action_message, value: rule.action_calorie_delta?.toString() }];
          for (const action of actions) {
            await executeAction(action, client, lastCI, cis);
          }
          await base44.entities.AutomationRule.update(rule.id, { last_triggered: new Date().toISOString(), trigger_count: (rule.trigger_count || 0) + 1 });
          await base44.entities.AutomationLog.create({ rule_id: rule.id, rule_name: rule.name, client_id: client.id, client_name: client.name, triggered_at: new Date().toISOString(), actions_taken: actions.map(a => a.type).join(', ') });
          totalFired++;
          toast.success(`⚡ ${rule.name} triggered for ${client.name}`);
        }
      }
    }

    if (totalFired > 0) {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      queryClient.invalidateQueries({ queryKey: ['automation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] });
    }

    return totalFired;
  }, [rules, clients, checkIns, executeAction, queryClient]);

  return { runAutomations };
}

// ── Template card ──────────────────────────────────────────────────────────
function TemplateCard({ template, isAdded, onUse, onCustomize }) {
  const actionLabels = template.actions?.map(a => a.type.replace(/_/g, ' ')).join(' + ') || '';
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary flex-shrink-0">{template.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{template.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold bg-warning/10 text-warning border border-warning px-2 py-0.5 rounded-full">
          IF {template.trigger_type?.replace(/_/g, ' ')} {template.trigger_value ? `(${template.trigger_value})` : ''}
        </span>
        <span className="text-muted-foreground text-xs">→</span>
        <span className="text-[10px] font-semibold bg-accent text-primary border border-primary px-2 py-0.5 rounded-full">
          {actionLabels}
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onUse(template)} disabled={isAdded}
          className={cn('flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-all',
            isAdded ? 'bg-success/10 border border-success text-success cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
          {isAdded ? <><Check className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> Use Template</>}
        </button>
        <button onClick={() => onCustomize(template)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
          Customize
        </button>
      </div>
    </div>
  );
}

// ── Rule card ──────────────────────────────────────────────────────────────
function RuleRow({ rule, onToggle, onEdit, onDelete }) {
  const actions = rule.actions?.length ? rule.actions : [{ type: rule.action_type }];
  return (
    <div className={cn('bg-card border rounded-xl p-4 transition-all', rule.is_active ? 'border-border' : 'border-border opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <span className={cn('w-2 h-2 rounded-full block', rule.is_active ? 'bg-success' : 'bg-border')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground">{rule.name}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className="text-[10px] font-semibold bg-warning/10 text-warning border border-warning px-2 py-0.5 rounded-full">
              IF {(rule.trigger_type || rule.condition_type || '').replace(/_/g, ' ')} {rule.trigger_value ?? rule.condition_threshold ? `(${rule.trigger_value ?? rule.condition_threshold})` : ''}
            </span>
            <span className="text-muted-foreground text-[10px]">→</span>
            <span className="text-[10px] font-semibold bg-accent text-primary border border-accent px-2 py-0.5 rounded-full">
              {actions.map(a => (a.type || '').replace(/_/g, ' ')).join(' + ')}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Fired {rule.trigger_count || 0}×</span>
              {rule.last_triggered && <span>Last: {formatDistanceToNow(parseISO(rule.last_triggered), { addSuffix: true })}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(rule)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(rule.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => onToggle(rule, !rule.is_active)}
                className={cn('flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-all',
                  rule.is_active ? 'bg-success/10 border-success text-success' : 'bg-secondary border-border text-muted-foreground')}>
                {rule.is_active ? <><ToggleRight className="w-3.5 h-3.5" /> On</> : <><ToggleLeft className="w-3.5 h-3.5" /> Off</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Automations() {
  const [tab, setTab] = useState('templates');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [running, setRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({ queryKey: ['automation-rules'], queryFn: () => base44.entities.AutomationRule.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: checkIns = [] } = useQuery({ queryKey: ['checkins'], queryFn: () => base44.entities.CheckIn.list('-date', 300) });
  const { data: plans = [] } = useQuery({ queryKey: ['nutrition-plans'], queryFn: () => base44.entities.NutritionPlan.list() });
  const { data: badges = [] } = useQuery({ queryKey: ['badges'], queryFn: () => base44.entities.ClientBadge.list('-earned_date', 300) });
  const { data: logs = [] } = useQuery({ queryKey: ['automation-logs'], queryFn: () => base44.entities.AutomationLog.list('-triggered_at', 50) });

  const { runAutomations } = useAutomationEngine(rules, clients, checkIns, plans, badges, queryClient);

  // SECURITY / DATA-INTEGRITY (B2): the auto-run-on-mount was removed. The
  // browser engine has no cross-run idempotency (it does not read prior
  // automation_logs), so firing it on every page load/refresh sent duplicate
  // client messages and — worst — applied `adjust_calories` as a repeated
  // read-modify-write, silently shifting a client's calorie target on each
  // refresh. Automations must run on a schedule via the server function
  // (supabase/functions/runAutomations), which IS idempotent per window and now
  // tenant-scoped. The manual "Run Now" button remains for explicit coach use;
  // migrate it to invoke the server function as a follow-up.

  const createMutation = useMutation({ mutationFn: d => base44.entities.AutomationRule.create(d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.AutomationRule.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }) });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.AutomationRule.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }) });

  const handleSave = async (form) => {
    if (editingRule?.id && !editingRule._isTemplate) {
      await updateMutation.mutateAsync({ id: editingRule.id, data: form });
      toast.success('Rule updated');
    } else {
      await createMutation.mutateAsync(form);
      toast.success('Rule created');
    }
    setEditingRule(null);
  };

  const handleUseTemplate = async (template) => {
    const { icon, ...rest } = template;
    await createMutation.mutateAsync({ ...rest, is_active: true, run_once: false, apply_to: 'all' });
    toast.success(`"${template.name}" added!`);
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const count = await runAutomations();
      if (count === 0) toast.info('No rules triggered right now — all clients are on track!');
      else toast.success(`${count} automation${count !== 1 ? 's' : ''} executed`);
    } finally {
      setRunning(false);
    }
  };

  const activeCount = rules.filter(r => r.is_active).length;
  const triggeredToday = logs.filter(l => l.triggered_at && differenceInDays(new Date(), parseISO(l.triggered_at)) < 1).length;
  const timeSaved = `${Math.round((logs.length * 5) / 60 * 10) / 10}h`;

  const TABS = [
    { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    { key: 'rules', label: `My Rules (${rules.length})`, icon: <List className="w-3.5 h-3.5" /> },
    { key: 'triggered', label: 'Triggered', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* ── Dark header ── */}
      <div className="bg-sidebar rounded-xl p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--kc-w-10)] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Automations</h1>
            <p className="text-xs text-white/60 mt-0.5">IF/THEN rules that run automatically across your clients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunNow} disabled={running}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
            <RefreshCw className={cn('w-3.5 h-3.5', running && 'animate-spin')} />
            {running ? 'Running...' : 'Run Now'}
          </button>
          <button onClick={() => { setEditingRule(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Rule
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Rules', value: activeCount },
          { label: 'Total Rules', value: rules.length },
          { label: 'Triggered Today', value: triggeredToday },
          { label: 'Time Saved', value: timeSaved },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-secondary border border-border rounded-xl p-1 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex-shrink-0 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap',
              tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Templates ── */}
      {tab === 'templates' && (
        <div className="space-y-6">
          {TEMPLATE_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cat.color}>{cat.icon}</span>
                <p className={cn('text-sm font-bold', cat.color)}>{cat.label} Automations</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.templates.map((t, i) => {
                  const isAdded = rules.some(r => r.name === t.name);
                  return (
                    <TemplateCard key={i} template={t} isAdded={isAdded}
                      onUse={handleUseTemplate}
                      onCustomize={(tpl) => { const { icon, ...rest } = tpl; setEditingRule({ ...rest, _isTemplate: true }); setModalOpen(true); }} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── My Rules ── */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center">
                <Zap className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">No rules yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start with a template or create a custom rule</p>
              </div>
              <button onClick={() => setTab('templates')} className="text-sm text-primary font-semibold hover:underline">Browse Templates</button>
            </div>
          ) : (
            rules.map(rule => (
              <RuleRow key={rule.id} rule={rule}
                onToggle={(r, v) => updateMutation.mutate({ id: r.id, data: { is_active: v } })}
                onEdit={(r) => { setEditingRule(r); setModalOpen(true); }}
                onDelete={(id) => { deleteMutation.mutate(id); toast.success('Rule deleted'); }} />
            ))
          )}
        </div>
      )}

      {/* ── Triggered ── */}
      {tab === 'triggered' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Currently Triggered</p>
            <button onClick={handleRunNow} disabled={running} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
              <Play className="w-3 h-3" /> Run check
            </button>
          </div>
          {logs.filter(l => differenceInDays(new Date(), parseISO(l.triggered_at || new Date().toISOString())) < 1).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center gap-2">
              <Check className="w-8 h-8 text-success" />
              <p className="text-sm font-semibold">All clear!</p>
              <p className="text-xs text-muted-foreground">No rules triggered today</p>
            </div>
          ) : (
            logs.filter(l => differenceInDays(new Date(), parseISO(l.triggered_at || new Date().toISOString())) < 1).map((log, i) => (
              <div key={i} className="flex items-start gap-3 bg-card border border-warning rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{log.client_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.rule_name} → {log.actions_taken}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(parseISO(log.triggered_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Execution History</p>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No automations have run yet</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{log.rule_name} → {log.client_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{log.actions_taken}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {log.triggered_at ? format(parseISO(log.triggered_at), 'MMM d, h:mm a') : ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <RuleBuilderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRule(null); }}
        onSave={handleSave}
        initial={editingRule?._isTemplate ? { ...editingRule, id: undefined, _isTemplate: undefined } : editingRule}
      />
    </div>
  );
}