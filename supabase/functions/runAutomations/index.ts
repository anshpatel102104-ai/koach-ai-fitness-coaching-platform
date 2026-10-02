// Supabase Edge Function: runAutomations  (Migration Step 4.2)
//
// The server-side replacement for the browser-only automation engine
// (src/lib/automationEngine.js + the inline engine in Automations.jsx), which
// only ran while a coach had the Automations page open. Scheduled via pg_cron
// (see 20260709000900_automation_runner.sql) — CHOICE + tradeoff documented
// in AUTOMATION_MIGRATION.md.
//
// Per run: load active rules + all clients/check-ins/plans/badges via the
// service role, evaluate EACH active rule against EACH eligible client using
// the shared faithful-port core (handles BOTH condition_type and trigger_type
// rules), execute actions on trigger, and write an automation_logs row for
// every evaluation (fired or not). Idempotent per window (see below).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, plus optional
//   AUTOMATION_WINDOW ('day' default | 'hour') controlling the dedup window.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  evaluateRule, resolveActions, isEligibleClient,
} from '../_shared/automationRunner.js';
// Action executors extracted to _shared in Step 5c so the entity-event
// trigger function (onEntityEvent) reuses the SAME write paths.
import { executeAction } from '../_shared/automationActions.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Start of the current dedup window (idempotency key component).
function windowStart(now: Date, mode: string): string {
  const d = new Date(now);
  if (mode === 'hour') d.setUTCMinutes(0, 0, 0);
  else d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// SECURITY (B-AUTOSEC): this function runs with the service role and performs
// cross-tenant reads + writes. Like its sibling scheduled/trigger functions
// (onEntityEvent, sendCheckInReminders) it must ONLY be callable by the service
// key (pg_cron / internal), never by an ordinary caller holding the public
// anon key. verify_jwt is not a sufficient gate (the anon key satisfies it).
function isServiceRoleCall(req: Request): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey) && token === serviceKey;
}

// A rule may only act on clients that belong to the rule's owner. Without this
// the rules × clients cross-join let one coach's rule mutate every coach's
// clients (send messages, flag at-risk, adjust calories, award badges).
function ruleOwnsClient(rule: Record<string, unknown>, client: Record<string, unknown>): boolean {
  const owner = rule.created_by;
  if (!owner) return false; // fail closed — an unowned rule acts on no one
  return client.user_id === owner || client.created_by === owner;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (!isServiceRoleCall(req)) return json({ error: 'Unauthorized' }, 401);

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const now = new Date();
    const winMode = Deno.env.get('AUTOMATION_WINDOW') ?? 'day';
    const winStart = windowStart(now, winMode);

    const [{ data: rules }, { data: clients }, { data: checkIns }, { data: plans }, { data: badges }] =
      await Promise.all([
        admin.from('automation_rules').select('*').eq('is_active', true),
        admin.from('clients').select('*'),
        admin.from('check_ins').select('*'),
        admin.from('nutrition_plans').select('*'),
        admin.from('client_badges').select('*'),
      ]);

    // Idempotency: which (rule_id, client_id) pairs were already evaluated in
    // this window? One query, built into a Set.
    const { data: priorLogs } = await admin
      .from('automation_logs')
      .select('rule_id, client_id')
      .gte('triggered_at', winStart);
    const seen = new Set((priorLogs ?? []).map((l) => `${l.rule_id}:${l.client_id}`));

    const ciByClient = new Map<string, unknown[]>();
    for (const ci of checkIns ?? []) {
      const arr = ciByClient.get(ci.client_id) ?? [];
      arr.push(ci);
      ciByClient.set(ci.client_id, arr);
    }

    const logRows: Record<string, unknown>[] = [];
    let evaluated = 0, fired = 0, skipped = 0;

    for (const rule of rules ?? []) {
      for (const client of clients ?? []) {
        if (!isEligibleClient(client)) continue;
        if (!ruleOwnsClient(rule, client)) continue; // tenant scoping (B-AUTOSEC)
        const key = `${rule.id}:${client.id}`;
        if (seen.has(key)) { skipped++; continue; } // already handled this window
        seen.add(key);

        const clientCheckIns = ciByClient.get(client.id) ?? [];
        const result = evaluateRule(rule, client, clientCheckIns, now);
        evaluated++;

        let actionsTaken = '';
        if (result.triggered) {
          const actions = resolveActions(rule);
          const lastCI = [...clientCheckIns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          for (const action of actions) {
            await executeAction(admin, action, client, lastCI, clientCheckIns, plans ?? [], badges ?? []);
          }
          actionsTaken = actions.map((a) => a.type).join(', ');
          fired++;
          await admin.from('automation_rules')
            .update({ last_triggered: now.toISOString(), trigger_count: (rule.trigger_count ?? 0) + 1 })
            .eq('id', rule.id);
        }

        // Row for EVERY evaluation (fired or not) — audit trail.
        logRows.push({
          rule_id: rule.id, rule_name: rule.name, client_id: client.id, client_name: client.name,
          triggered_at: now.toISOString(), fired: result.triggered,
          actions_taken: actionsTaken, detail: result.detail,
        });
      }
    }

    if (logRows.length) await admin.from('automation_logs').insert(logRows);

    return json({ ok: true, window: winStart, evaluated, fired, skipped_idempotent: skipped, logged: logRows.length });
  } catch (err) {
    console.error('runAutomations error:', (err as Error)?.message ?? err);
    return json({ ok: false, error: 'Server error' }, 500);
  }
});
