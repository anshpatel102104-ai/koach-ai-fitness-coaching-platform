// Plain-English descriptions of automation rules:
// "When a client hasn't checked in for 7 days → Send a message, flag as at risk"

const TRIGGERS = {
  no_checkin: (v) => `a client hasn't checked in for ${v ?? 7} days`,
  missed_checkin: (v) => `a client hasn't checked in for ${v ?? 7} days`,
  low_compliance: (v) => `compliance drops below ${v ?? 60}%`,
  low_adherence: (v) => `compliance drops below ${v ?? 60}%`,
  high_compliance: (v) => `compliance is ${v ?? 90}% or higher`,
  streak: (v) => `a client reaches a ${v ?? 7}-day streak`,
  weight_plateau: (v) => `weight stalls for ${v ?? 3} check-ins`,
  weight_loss_fast: (v) => `a client loses more than ${v ?? 2} lb in a week`,
  status_change: (v) => `a client's status changes to ${String(v || 'active').replace(/_/g, ' ')}`,
  program_ends: () => 'a program ends',
  new_client: () => 'a new client is added',
};

const ACTIONS = {
  send_message: () => 'send them a message',
  notify_coach: () => 'notify you',
  award_badge: (v) => (v ? `award the ${String(v).replace(/_/g, ' ')} badge` : 'award a badge'),
  update_status: (v) => (v ? `set status to ${String(v).replace(/_/g, ' ')}` : 'update their status'),
  adjust_calories: (v) => (v ? `adjust calories by ${String(v).startsWith('-') || String(v).startsWith('+') ? v : `+${v}`}` : 'adjust calories'),
  flag_at_risk: () => 'flag as at risk',
  flag_client: () => 'flag as at risk',
};

export function describeTrigger(type, value) {
  const fn = TRIGGERS[type];
  return fn ? fn(value) : String(type || 'something happens').replace(/_/g, ' ');
}

export function describeActions(actions = []) {
  const parts = actions
    .filter(a => a && a.type)
    .map(a => (ACTIONS[a.type] ? ACTIONS[a.type](a.value) : a.type.replace(/_/g, ' ')));
  if (!parts.length) return 'do nothing yet';
  const text = parts.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Normalise the legacy single-action shape into an actions array. */
export function ruleActions(rule) {
  if (rule?.actions?.length) return rule.actions;
  if (rule?.action_type) return [{ type: rule.action_type, value: rule.action_calorie_delta?.toString(), message: rule.action_message }];
  return [];
}

export function ruleSentence(rule) {
  const trigger = describeTrigger(rule.trigger_type || rule.condition_type, rule.trigger_value ?? rule.condition_threshold);
  return `When ${trigger} → ${describeActions(ruleActions(rule))}`;
}
