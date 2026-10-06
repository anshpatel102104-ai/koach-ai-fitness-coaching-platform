import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Page, PageHeader, Panel, Stat, Segmented, EmptyState, Initials } from '@/components/kit';
import { ruleSentence, describeTrigger, describeActions } from '@/components/automations/ruleText';
import { toast } from 'sonner';
import { differenceInDays, parseISO, formatDistanceToNow, format } from 'date-fns';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import RuleBuilderModal from '@/components/automations/RuleBuilderModal';

// ── Template categories ────────────────────────────────────────────────────
const TEMPLATE_CATEGORIES = [
  {
    label: 'Check-ins',
    templates: [
      { name: 'Missed check-in alert', description: 'Auto-message clients who miss their weekly check-in', trigger_type: 'no_checkin', trigger_value: 7, actions: [{ type: 'send_message', message: "Hey {client_name}, your weekly check-in didn't come in. How has training been going? Send me a message when you get a chance." }] },
      { name: 'Low compliance alert', description: 'Flag as at risk and send a note when compliance drops below 60%', trigger_type: 'low_compliance', trigger_value: 60, actions: [{ type: 'send_message', message: "Hey {client_name}, your compliance has been a bit low lately. Life gets busy, so let's talk about adjusting the plan to fit your week." }, { type: 'flag_at_risk' }] },
      { name: 'Perfect week reward', description: 'Award a badge and send a note when compliance is above 90%', trigger_type: 'high_compliance', trigger_value: 90, actions: [{ type: 'award_badge', value: 'perfect_week' }, { type: 'send_message', message: "{client_name}, great week. Your compliance was excellent. Keep the same rhythm going." }] },
      { name: 'Check-in streak badge', description: 'Auto-award streak badge when client hits 7-day streak', trigger_type: 'streak', trigger_value: 7, actions: [{ type: 'award_badge', value: 'streak_7' }, { type: 'send_message', message: "{client_name}, that's a 7-day streak. Nice consistency, keep it going." }] },
    ],
  },
  {
    label: 'Nutrition',
    templates: [
      { name: 'Weight plateau calorie adjust', description: 'Reduce calories by 100 when weight stalls for 3 check-ins', trigger_type: 'weight_plateau', trigger_value: 3, actions: [{ type: 'adjust_calories', value: '-100' }, { type: 'notify_coach', message: "{client_name}'s weight has plateaued for 3 check-ins — calories reduced by 100 automatically." }] },
      { name: 'Rapid weight loss adjustment', description: 'Increase calories when losing more than 2 lbs/week', trigger_type: 'weight_loss_fast', trigger_value: 2, actions: [{ type: 'adjust_calories', value: '+150' }, { type: 'notify_coach', message: "{client_name} is losing weight too quickly — calories increased by 150." }] },
      { name: 'Protein target miss', description: 'Send nutrition tip when nutrition compliance is low', trigger_type: 'low_compliance', trigger_value: 70, actions: [{ type: 'send_message', message: "Hey {client_name}, quick nutrition tip: hitting your protein target makes the biggest difference to your results. A protein shake after training is an easy way to close the gap." }] },
      { name: 'Calorie goal streak', description: 'Award badge when nutrition compliance hits 90%+ for 5 days', trigger_type: 'high_compliance', trigger_value: 90, actions: [{ type: 'award_badge', value: 'nutrition_star' }] },
    ],
  },
  {
    label: 'Progress',
    templates: [
      { name: 'Monthly progress message', description: 'Send a monthly summary message after 30+ days in program', trigger_type: 'streak', trigger_value: 30, actions: [{ type: 'send_message', message: "{client_name}, one month in. Your compliance is {compliance}%. Let's look at your progress together this week." }] },
      { name: 'PR achievement', description: 'Award PR badge and celebrate personal record', trigger_type: 'high_compliance', trigger_value: 95, actions: [{ type: 'award_badge', value: 'pr_hit' }, { type: 'send_message', message: "{client_name}, new personal record. That's what consistent work looks like." }] },
      { name: 'Halfway milestone', description: 'Award a badge when a client reaches a 14-day streak', trigger_type: 'streak', trigger_value: 14, actions: [{ type: 'award_badge', value: 'streak_14' }, { type: 'send_message', message: "Two weeks straight, {client_name}. You're halfway to a full month, so keep going." }] },
      { name: 'Momentum builder', description: 'Award 30-day badge for sustained commitment', trigger_type: 'streak', trigger_value: 30, actions: [{ type: 'award_badge', value: 'streak_30' }] },
    ],
  },
  {
    label: 'Engagement',
    templates: [
      { name: 'Re-engagement nudge', description: 'Send a nudge when client hasn\'t checked in for 14 days', trigger_type: 'no_checkin', trigger_value: 14, actions: [{ type: 'send_message', message: "Hey {client_name}, it's been a while since we spoke. How are things going? Let's catch up and get the plan moving again." }, { type: 'flag_at_risk' }] },
      { name: 'New client welcome', description: 'Auto-send welcome message when client becomes active', trigger_type: 'new_client', actions: [{ type: 'send_message', message: "Welcome, {client_name}. Glad to be working with you. Your first check-in is scheduled, and I'll review it as soon as it comes in." }] },
      { name: 'Low mood support', description: 'Send supportive message when client reports low mood', trigger_type: 'no_checkin', trigger_value: 5, actions: [{ type: 'send_message', message: "Hey {client_name}, just checking on you. Progress isn't always a straight line, and I'm here if you want to talk anything through." }] },
      { name: 'Coach at-risk alert', description: 'Notify yourself when a client needs immediate attention', trigger_type: 'no_checkin', trigger_value: 10, actions: [{ type: 'flag_at_risk' }, { type: 'notify_coach', message: "{client_name} hasn't checked in for 10 days or more. Reach out today." }] },
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
        if (msg) await db.entities.Message.create({ client_id: client.id, content: msg, sender: 'coach' });
        break;
      case 'notify_coach':
        // The client's coach (a literal 'coach' here was never a valid recipient id).
        await db.entities.Notification.create({ recipient_id: client.user_id || client.created_by, title: `Automation: ${client.name}`, body: msg || `Rule triggered for ${client.name}`, type: 'general', related_client_id: client.id });
        break;
      case 'award_badge': {
        if (!action.value) break;
        const alreadyHas = badges.some(b => b.client_id === client.id && b.badge_key === action.value);
        if (!alreadyHas) await db.entities.ClientBadge.create({ client_id: client.id, client_name: client.name, badge_key: action.value, earned_date: new Date().toISOString().split('T')[0], notes: 'Auto-awarded by automation' });
        break;
      }
      case 'update_status':
        if (action.value) await db.entities.Client.update(client.id, { lifecycle_status: action.value });
        break;
      case 'adjust_calories': {
        const plan = plans.find(p => p.id === client.assigned_nutrition_id);
        if (plan) {
          const delta = Number(action.value) || 0;
          await db.entities.NutritionPlan.update(plan.id, { calories: (plan.calories || 2000) + delta });
        }
        break;
      }
      case 'flag_at_risk':
        await db.entities.Client.update(client.id, { lifecycle_status: 'at_risk' });
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
          await db.entities.AutomationRule.update(rule.id, { last_triggered: new Date().toISOString(), trigger_count: (rule.trigger_count || 0) + 1 });
          await db.entities.AutomationLog.create({ rule_id: rule.id, rule_name: rule.name, client_id: client.id, client_name: client.name, triggered_at: new Date().toISOString(), actions_taken: actions.map(a => a.type).join(', ') });
          totalFired++;
          toast.success(`${rule.name} triggered for ${client.name}`);
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

// ── Template row ───────────────────────────────────────────────────────────
function TemplateRow({ template, isAdded, onUse, onCustomize }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{template.name}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          When {describeTrigger(template.trigger_type, template.trigger_value)} → {describeActions(template.actions)}
        </p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => onCustomize(template)}
          className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
        >
          Customize
        </button>
        {isAdded ? (
          <span className="text-sm font-medium text-success w-[72px] text-center">Added</span>
        ) : (
          <Button size="sm" variant="outline" className="w-[72px]" onClick={() => onUse(template)}>Use</Button>
        )}
      </div>
    </li>
  );
}

// ── Rule row ───────────────────────────────────────────────────────────────
function RuleRow({ rule, onToggle, onEdit, onDelete }) {
  const count = rule.trigger_count || 0;
  const lastRun = rule.last_triggered
    ? `Ran ${count} ${count === 1 ? 'time' : 'times'}, last ${formatDistanceToNow(parseISO(rule.last_triggered), { addSuffix: true })}`
    : 'Hasn’t run yet';
  return (
    <li className="flex items-start gap-4 py-4">
      <div className={cn('flex-1 min-w-0', !rule.is_active && 'opacity-60')}>
        <p className="text-[15px] font-semibold text-foreground">{rule.name}</p>
        <p className="text-sm text-foreground/80 mt-0.5">{ruleSentence(rule)}</p>
        <p className="text-[13px] text-muted-foreground mt-1">{rule.is_active ? lastRun : `Off. ${lastRun}`}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => onEdit(rule)} aria-label={`Edit ${rule.name}`}>
          <Pencil />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => onDelete(rule.id)} aria-label={`Delete ${rule.name}`}>
          <Trash2 />
        </Button>
        <Switch className="ml-2" checked={!!rule.is_active} onCheckedChange={(v) => onToggle(rule, v)} aria-label={rule.is_active ? 'Turn off' : 'Turn on'} />
      </div>
    </li>
  );
}

function LogRow({ log, showDate }) {
  const when = log.triggered_at
    ? (showDate ? format(parseISO(log.triggered_at), 'MMM d, h:mm a') : formatDistanceToNow(parseISO(log.triggered_at), { addSuffix: true }))
    : '';
  return (
    <li className="flex items-center gap-3 py-3">
      <Initials name={log.client_name || ''} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground truncate">{log.client_name}</p>
        <p className="text-sm text-muted-foreground truncate">{log.rule_name}. {String(log.actions_taken || '').replace(/_/g, ' ')}</p>
      </div>
      <span className="text-[13px] text-muted-foreground flex-shrink-0">{when}</span>
    </li>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Automations() {
  const [tab, setTab] = useState('rules');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [running, setRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({ queryKey: ['automation-rules'], queryFn: () => db.entities.AutomationRule.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.entities.Client.list() });
  const { data: checkIns = [] } = useQuery({ queryKey: ['checkins'], queryFn: () => db.entities.CheckIn.list('-date', 300) });
  const { data: plans = [] } = useQuery({ queryKey: ['nutrition-plans'], queryFn: () => db.entities.NutritionPlan.list() });
  const { data: badges = [] } = useQuery({ queryKey: ['badges'], queryFn: () => db.entities.ClientBadge.list('-earned_date', 300) });
  const { data: logs = [] } = useQuery({ queryKey: ['automation-logs'], queryFn: () => db.entities.AutomationLog.list('-triggered_at', 50) });

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

  const createMutation = useMutation({ mutationFn: d => db.entities.AutomationRule.create(d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => db.entities.AutomationRule.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }) });
  const deleteMutation = useMutation({ mutationFn: id => db.entities.AutomationRule.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }) });

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
    const { icon: _icon, ...rest } = template;
    await createMutation.mutateAsync({ ...rest, is_active: true, run_once: false, apply_to: 'all' });
    toast.success(`Added "${template.name}"`);
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const count = await runAutomations();
      if (!count) toast.info('Nothing to do right now. No rule matched any client.');
      else toast.success(`${count} automation${count !== 1 ? 's' : ''} ran`);
    } finally {
      setRunning(false);
    }
  };

  const openNew = () => { setEditingRule(null); setModalOpen(true); };

  const activeCount = rules.filter(r => r.is_active).length;
  const todayLogs = logs.filter(l => differenceInDays(new Date(), parseISO(l.triggered_at || new Date().toISOString())) < 1);
  const triggeredToday = todayLogs.length;
  const timeSaved = `${Math.round((logs.length * 5) / 60 * 10) / 10}h`;
  const ruleNames = new Set(rules.map(r => (r.name || '').toLowerCase()));

  const subtitle = rules.length === 0
    ? 'Rules that watch every client for you and act when something slips. Start from a template.'
    : `${activeCount} of ${rules.length} rules on. ${triggeredToday ? `They ran ${triggeredToday} ${triggeredToday === 1 ? 'time' : 'times'} today.` : 'Nothing has run today.'}`;

  const TABS = [
    { value: 'rules', label: 'Your rules', count: rules.length },
    { value: 'templates', label: 'Templates' },
    { value: 'triggered', label: 'Today', count: triggeredToday },
    { value: 'history', label: 'History' },
  ];

  return (
    <Page>
      <PageHeader
        title="Automations"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={handleRunNow} disabled={running}>
              <RefreshCw className={cn(running && 'animate-spin')} />
              {running ? 'Running' : 'Run now'}
            </Button>
            <Button onClick={openNew}><Plus /> New rule</Button>
          </>
        }
      />

      <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden bg-border mb-5 [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Rules on" value={activeCount} sub={`of ${rules.length}`} />
        <Stat label="Ran today" value={triggeredToday} />
        <Stat label="Runs logged" value={logs.length} sub="last 50 shown" />
        <Stat label="Time saved" value={timeSaved} sub="about 5 min per run" />
      </Panel>

      <Segmented className="mb-5" options={TABS} value={tab} onChange={setTab} />

      {tab === 'rules' && (
        <Panel>
          {rules.length === 0 ? (
            <EmptyState
              title="No rules yet"
              body="Pick a template to start. You can change the wording and thresholds after."
              action={<Button variant="outline" onClick={() => setTab('templates')}>Browse templates</Button>}
            />
          ) : (
            <ul className="divide-y divide-border px-5 sm:px-6">
              {rules.map(rule => (
                <RuleRow key={rule.id} rule={rule}
                  onToggle={(r, v) => updateMutation.mutate({ id: r.id, data: { is_active: v } })}
                  onEdit={(r) => { setEditingRule(r); setModalOpen(true); }}
                  onDelete={(id) => { deleteMutation.mutate(id); toast.success('Rule deleted'); }} />
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'templates' && (
        <div className="space-y-5">
          {TEMPLATE_CATEGORIES.map(cat => (
            <Panel key={cat.label}>
              <div className="px-5 pt-5 sm:px-6">
                <h2 className="text-[22px] text-foreground">{cat.label}</h2>
              </div>
              <ul className="divide-y divide-border px-5 sm:px-6 pb-1">
                {cat.templates.map((t, i) => (
                  <TemplateRow key={i} template={t} isAdded={ruleNames.has(t.name.toLowerCase())}
                    onUse={handleUseTemplate}
                    onCustomize={(tpl) => { const { icon: _icon, ...rest } = tpl; setEditingRule({ ...rest, _isTemplate: true }); setModalOpen(true); }} />
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'triggered' && (
        <Panel>
          <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-2 sm:px-6">
            <h2 className="text-[22px] text-foreground">Ran today</h2>
            <button onClick={handleRunNow} disabled={running} className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2 disabled:opacity-40">
              Check again
            </button>
          </div>
          {todayLogs.length === 0 ? (
            <EmptyState title="Nothing has run today" body="Every client is inside your rules. Check again after the next round of check-ins." />
          ) : (
            <ul className="divide-y divide-border px-5 sm:px-6 pb-2">
              {todayLogs.map((log, i) => <LogRow key={i} log={log} />)}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'history' && (
        <Panel>
          <div className="px-5 pt-5 pb-2 sm:px-6">
            <h2 className="text-[22px] text-foreground">History</h2>
          </div>
          {logs.length === 0 ? (
            <EmptyState title="No automations have run yet" body="Each run is logged here with the client and what it did." />
          ) : (
            <ul className="divide-y divide-border px-5 sm:px-6 pb-2">
              {logs.map((log, i) => <LogRow key={i} log={log} showDate />)}
            </ul>
          )}
        </Panel>
      )}

      <RuleBuilderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRule(null); }}
        onSave={handleSave}
        initial={editingRule?._isTemplate ? { ...editingRule, id: undefined, _isTemplate: undefined } : editingRule}
      />
    </Page>
  );
}
