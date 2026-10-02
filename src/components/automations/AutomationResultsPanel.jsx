import React, { useState } from 'react';
import { Zap, Send, Flag, Flame, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTION_META, CONDITION_META } from '@/lib/automationEngine';
import { supabase as base44 } from '@/api/supabaseClient';
import { toast } from 'sonner';

/* Execute the rule action for one client */
async function executeAction(rule, client, allCheckIns) {
  switch (rule.action_type) {
    case 'send_message':
    case 'send_template':
      if (!rule.action_message) return;
      await base44.entities.Message.create({
        client_id: client.id,
        client_name: client.name,
        sender: 'coach',
        content: rule.action_message,
        tag: 'general',
        is_read: false,
      });
      await base44.entities.AutomationRule.update(rule.id, {
        trigger_count: (rule.trigger_count || 0) + 1,
        last_triggered: new Date().toISOString().split('T')[0],
      });
      return `Message sent to ${client.name}`;

    case 'notify_coach':
      await base44.entities.Notification.create({
        recipient_id: client.user_id,
        type: 'general',
        title: `Automation: ${rule.name}`,
        body: `${client.name} triggered rule "${rule.name}"`,
        related_client_id: client.id,
        is_read: false,
      });
      await base44.entities.AutomationRule.update(rule.id, {
        trigger_count: (rule.trigger_count || 0) + 1,
        last_triggered: new Date().toISOString().split('T')[0],
      });
      return `Coach notified for ${client.name}`;

    case 'adjust_calories': {
      if (!client.assigned_nutrition_id) throw new Error('No nutrition plan assigned');
      const plans = await base44.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id });
      const plan = plans[0];
      if (!plan) throw new Error('Nutrition plan not found');
      const delta = rule.action_calorie_delta || -100;
      const newCals = Math.max(1000, (plan.calories || 2000) + delta);
      await Promise.all([
        base44.entities.NutritionPlan.update(plan.id, { calories: newCals }),
        base44.entities.Message.create({
          client_id: client.id, client_name: client.name, sender: 'coach',
          content: `Your calorie target has been updated to ${newCals} kcal (${delta > 0 ? '+' : ''}${delta} adjustment).`,
          tag: 'nutrition', is_read: false,
        }),
        base44.entities.AutomationRule.update(rule.id, {
          trigger_count: (rule.trigger_count || 0) + 1,
          last_triggered: new Date().toISOString().split('T')[0],
        }),
      ]);
      return `Calories → ${newCals} kcal for ${client.name}`;
    }

    case 'flag_client':
      await Promise.all([
        base44.entities.Client.update(client.id, { lifecycle_status: 'at_risk' }),
        base44.entities.AutomationRule.update(rule.id, {
          trigger_count: (rule.trigger_count || 0) + 1,
          last_triggered: new Date().toISOString().split('T')[0],
        }),
      ]);
      return `${client.name} flagged as at-risk`;

    case 'suggest_adjustment':
      await Promise.all([
        base44.entities.Notification.create({
          recipient_id: client.user_id,
          type: 'general',
          title: `Plan adjustment needed: ${client.name}`,
          body: rule.action_message || `Review and adjust ${client.name}'s plan — triggered by rule "${rule.name}"`,
          related_client_id: client.id,
          is_read: false,
        }),
        base44.entities.AutomationRule.update(rule.id, {
          trigger_count: (rule.trigger_count || 0) + 1,
          last_triggered: new Date().toISOString().split('T')[0],
        }),
      ]);
      return `Adjustment suggestion created for ${client.name}`;

    default:
      throw new Error('Unknown action type');
  }
}

function ActionIcon({ type }) {
  const icons = { send_message: Send, send_template: Send, notify_coach: Zap, adjust_calories: Flame, flag_client: Flag };
  const Icon = icons[type] || Zap;
  return <Icon className="w-3.5 h-3.5" />;
}

function ClientRow({ rule, client, detail }) {
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState(false);

  const execute = async () => {
    if (done || executing) return;
    setExecuting(true);
    try {
      const msg = await executeAction(rule, client);
      toast.success(msg);
      setDone(true);
    } catch (err) {
      toast.error(err.message);
    }
    setExecuting(false);
  };

  const aMeta = ACTION_META[rule.action_type] || {};

  return (
    <div className={cn('flex items-center gap-2.5 p-2.5 rounded-xl transition-all', done ? 'bg-success/5 opacity-60' : 'bg-secondary/40')}>
      <div className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold text-destructive flex-shrink-0">
        {client.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{client.name}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <button
        onClick={execute}
        disabled={done || executing}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 whitespace-nowrap',
          done
            ? 'bg-success/10 border-success/20 text-success cursor-default'
            : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
        )}
      >
        {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : done ? <Check className="w-3 h-3" /> : <ActionIcon type={rule.action_type} />}
        {done ? 'Done' : aMeta.label?.split(' ')[0] || 'Apply'}
      </button>
    </div>
  );
}

function RuleResultGroup({ rule, clients }) {
  const [expanded, setExpanded] = useState(true);
  const cMeta = CONDITION_META[rule.condition_type] || {};
  const aMeta = ACTION_META[rule.action_type] || {};

  return (
    <div className="bg-card border border-destructive/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/20 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-lg flex-shrink-0">{cMeta.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{rule.name}</p>
          <p className="text-xs text-muted-foreground">THEN {aMeta.label || rule.action_type}</p>
        </div>
        <span className="text-[11px] font-bold bg-destructive/15 text-destructive px-2 py-0.5 rounded-full flex-shrink-0">
          {clients.length} client{clients.length > 1 ? 's' : ''}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-border">
          {/* Message preview */}
          {rule.action_message && (
            <div className="mt-3 bg-primary/5 border border-primary/15 rounded-xl p-2.5">
              <p className="text-[10px] font-semibold text-primary mb-1 uppercase tracking-wide">Message</p>
              <p className="text-xs text-foreground leading-relaxed line-clamp-2">"{rule.action_message}"</p>
            </div>
          )}

          {/* Client rows */}
          <div className="space-y-1.5 mt-2">
            {clients.map(({ client, detail }) => (
              <ClientRow key={client.id} rule={rule} client={client} detail={detail} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutomationResultsPanel({ results }) {
  if (!results.length) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 text-accent" />
        </div>
        <p className="text-sm font-semibold">No rules triggered</p>
        <p className="text-xs text-muted-foreground mt-1">All clients are within their thresholds</p>
      </div>
    );
  }

  // Group by rule
  const grouped = results.reduce((acc, r) => {
    const key = r.rule.id;
    if (!acc[key]) acc[key] = { rule: r.rule, clients: [] };
    acc[key].clients.push({ client: r.client, detail: r.detail });
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.values(grouped).map(({ rule, clients }) => (
        <RuleResultGroup key={rule.id} rule={rule} clients={clients} />
      ))}
    </div>
  );
}