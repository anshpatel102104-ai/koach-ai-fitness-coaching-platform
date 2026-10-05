/**
 * claudeAssistant tool executor (Step 5d) — the <action> tools the agentic
 * assistant can run, ported from base44/functions/claudeAssistant with ONE
 * deliberate change, applied to EVERY tool:
 *
 *   Base44 executed every tool asServiceRole with NO ownership checks — any
 *   authenticated coach could read/write ANY client, plan, program, check-in
 *   or badge by asking the assistant nicely. Multi-tenant correction: every
 *   tool resolves the target through the CALLER's ownership (clients.user_id /
 *   created_by via ownsClient; plans/check-ins through their owning client or
 *   created_by) and returns an error result instead of acting cross-tenant.
 *
 * Writes are NEVER executed by the model loop: claudeAssistant calls
 * previewAssistantWrite() (ownership-checked, no side effects) and returns the
 * result as a proposal the coach must confirm in the UI; only then does the
 * confirm path call executeAssistantTool(). READ_TOOLS run immediately.
 *
 * Message/badge writes go through the shared automation executors
 * (_shared/automationActions.js) — the same write paths runAutomations and
 * the entity-event handlers use.
 */
import { ownsClient } from './ownership.js';
import { sendMessage, awardBadge } from './automationActions.js';

const NOT_OWNED = (what = 'client') => ({ error: `Forbidden: ${what} not found or not owned by you` });

/** Does this nutrition plan belong to the caller (directly or via its client)? */
async function ownsPlan(svc, userId, planId) {
  if (!planId) return null;
  const { data: plan } = await svc.from('nutrition_plans').select('*').eq('id', planId).maybeSingle();
  if (!plan) return null;
  if (plan.created_by === userId) return plan;
  if (plan.client_id && await ownsClient(svc, userId, plan.client_id)) return plan;
  return null;
}


export const READ_TOOLS = new Set(['get_client_data', 'list_clients', 'get_program', 'list_checkins']);
export const WRITE_TOOLS = new Set([
  'create_nutrition_plan', 'update_nutrition_plan', 'create_program', 'update_program',
  'update_client', 'flag_client_at_risk', 'send_message', 'create_checkin_response', 'award_badge',
]);

// Sanity bounds: a model-proposed (or UI-edited) number outside these is rejected
// before any write, so a bad AI macro can never reach a client's plan.
const BOUNDS = { calories: [800, 8000], protein_g: [0, 600], carbs_g: [0, 1200], fats_g: [0, 400] };
const MACRO_FIELDS = Object.keys(BOUNDS);

function validateMacros(input) {
  for (const f of MACRO_FIELDS) {
    if (input[f] === undefined || input[f] === null) continue;
    const n = Number(input[f]);
    const [lo, hi] = BOUNDS[f];
    if (!Number.isFinite(n) || n < lo || n > hi) return `${f} must be a number between ${lo} and ${hi}`;
  }
  return null;
}

/** Does this workout program belong to the caller (created by them, or assigned only to their clients)? */
async function ownsProgram(svc, userId, programId) {
  if (!programId) return null;
  const { data: prog } = await svc.from('workout_programs').select('*').eq('id', programId).maybeSingle();
  if (!prog) return null;
  if (prog.created_by === userId) return prog;
  const { data: assignees } = await svc.from('clients').select('id, user_id, created_by')
    .eq('assigned_program_id', programId);
  // Someone else's program is only editable when EVERY client it is assigned to
  // is the caller's — never a shared template that other coaches' clients use.
  const list = assignees ?? [];
  if (list.length > 0 && list.every((c) => c.user_id === userId || c.created_by === userId)) return prog;
  return null;
}

/**
 * Apply sets/reps changes to a program's workouts jsonb. Each change targets a
 * workout (day_name, or 1-based day_number) and an exercise by name. Pure +
 * all-or-nothing: returns { error } if any change is invalid or unmatched,
 * else { workouts, diffs }.
 */
export function applyProgramChanges(workouts, changes) {
  if (!Array.isArray(changes) || changes.length === 0) return { error: 'changes must be a non-empty array' };
  if (changes.length > 50) return { error: 'at most 50 changes per request' };
  const next = JSON.parse(JSON.stringify(workouts ?? []));
  const diffs = [];
  for (const ch of changes) {
    if (ch.sets === undefined && ch.reps === undefined) return { error: 'each change needs sets and/or reps' };
    if (ch.sets !== undefined && !(Number.isInteger(Number(ch.sets)) && ch.sets >= 1 && ch.sets <= 20)) {
      return { error: `sets for "${ch.exercise}" must be a whole number 1-20` };
    }
    if (ch.reps !== undefined && !(typeof ch.reps === 'string' || typeof ch.reps === 'number')) {
      return { error: `reps for "${ch.exercise}" must be text like "8-10"` };
    }
    if (ch.reps !== undefined && String(ch.reps).length > 20) return { error: `reps for "${ch.exercise}" too long` };
    const w = next.find((x, i) => (ch.workout != null
      && (String(x.day_name ?? '').toLowerCase() === String(ch.workout).toLowerCase()
        || Number(x.day_number ?? i + 1) === Number(ch.workout))));
    if (!w) return { error: `workout "${ch.workout}" not found in program` };
    const ex = (w.exercises ?? []).find((e) => String(e.name ?? '').toLowerCase() === String(ch.exercise ?? '').toLowerCase());
    if (!ex) return { error: `exercise "${ch.exercise}" not found in workout "${w.day_name ?? ch.workout}"` };
    const before = { sets: ex.sets, reps: ex.reps };
    if (ch.sets !== undefined) ex.sets = Number(ch.sets);
    if (ch.reps !== undefined) ex.reps = String(ch.reps);
    diffs.push({ workout: w.day_name, exercise: ex.name, before, after: { sets: ex.sets, reps: ex.reps } });
  }
  return { workouts: next, diffs };
}

/**
 * Dry-run of a write tool: ownership + validation, NO side effects. Returns
 * { ok:true, summary, changes? } for the confirmation card, or { error }.
 */
export async function previewAssistantWrite(svc, userId, toolName, input) {
  try {
    if (!WRITE_TOOLS.has(toolName)) return { error: 'Unknown write tool: ' + toolName };
    switch (toolName) {
      case 'update_nutrition_plan': {
        const plan = await ownsPlan(svc, userId, input.plan_id);
        if (!plan) return NOT_OWNED('nutrition plan');
        const bad = validateMacros(input);
        if (bad) return { error: bad };
        const changes = MACRO_FIELDS.filter((f) => input[f] !== undefined && input[f] !== null)
          .map((f) => ({ field: f, before: plan[f], after: Number(input[f]) }));
        if (changes.length === 0) return { error: 'No calorie/macro values supplied' };
        return { ok: true, summary: `Update "${plan.title}" calories/macros`, changes };
      }
      case 'update_program': {
        const prog = await ownsProgram(svc, userId, input.program_id);
        if (!prog) return NOT_OWNED('program');
        const r = applyProgramChanges(prog.workouts, input.changes);
        if (r.error) return { error: r.error };
        return {
          ok: true, summary: `Update sets/reps in "${prog.title}"`,
          changes: r.diffs.map((d) => ({
            field: `${d.workout} - ${d.exercise}`,
            before: `${d.before.sets} x ${d.before.reps}`, after: `${d.after.sets} x ${d.after.reps}`,
          })),
        };
      }
      case 'create_nutrition_plan': {
        if (input.client_id && !(await ownsClient(svc, userId, input.client_id))) return NOT_OWNED();
        const bad = validateMacros(input);
        if (bad) return { error: bad };
        return { ok: true, summary: `Create nutrition plan "${input.title}" (${input.calories} kcal)` };
      }
      case 'create_program':
        if (input.client_id && !(await ownsClient(svc, userId, input.client_id))) return NOT_OWNED();
        return { ok: true, summary: `Create program "${input.title}"` };
      case 'create_checkin_response': {
        const { data: ci } = await svc.from('check_ins').select('client_id').eq('id', input.checkin_id).maybeSingle();
        if (!ci || !(await ownsClient(svc, userId, ci.client_id))) return NOT_OWNED('check-in');
        return { ok: true, summary: 'Respond to check-in', changes: [{ field: 'response', before: '', after: input.response }] };
      }
      default: { // update_client, flag_client_at_risk, send_message, award_badge — all client-scoped
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        const label = { update_client: 'Update profile of', flag_client_at_risk: 'Flag as at-risk:',
          send_message: 'Send message to', award_badge: 'Award badge to' }[toolName];
        return { ok: true, summary: `${label} ${client.name}`,
          changes: toolName === 'send_message' ? [{ field: 'message', before: '', after: input.message }] : undefined };
      }
    }
  } catch (err) {
    return { error: err.message };
  }
}

export async function executeAssistantTool(svc, userId, toolName, input) {
  try {
    switch (toolName) {
      case 'get_client_data': {
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        const { data: checkIns } = await svc.from('check_ins').select('*')
          .eq('client_id', client.id).order('date', { ascending: false }).limit(5);
        const { data: plan } = client.assigned_nutrition_id
          ? await svc.from('nutrition_plans').select('*').eq('id', client.assigned_nutrition_id).maybeSingle()
          : { data: null };
        return { client, recent_checkins: checkIns ?? [], nutrition_plan: plan };
      }

      case 'get_program': {
        const prog = await ownsProgram(svc, userId, input.program_id);
        if (!prog) return NOT_OWNED('program');
        return { program: { id: prog.id, title: prog.title, description: prog.description,
          days_per_week: prog.days_per_week, workouts: prog.workouts } };
      }

      case 'list_checkins': {
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 30);
        const { data } = await svc.from('check_ins')
          .select('id, date, weight, mood, energy_level, stress_level, sleep_hours, compliance_training, compliance_nutrition, notes, coach_responded')
          .eq('client_id', client.id).order('date', { ascending: false }).limit(limit);
        return { checkins: data ?? [] };
      }

      case 'list_clients': {
        const { data: allClients } = await svc.from('clients').select('*')
          .or(`user_id.eq.${userId},created_by.eq.${userId}`)
          .order('name').limit(100);
        const filter = input.filter;
        const filtered = filter && filter !== 'all'
          ? (allClients ?? []).filter((c) => c.lifecycle_status === filter)
          : (allClients ?? []);
        return {
          clients: filtered.map((c) => ({
            id: c.id, name: c.name, status: c.lifecycle_status,
            goal: c.goal, assigned_nutrition_id: c.assigned_nutrition_id,
            assigned_program_id: c.assigned_program_id, current_weight: c.current_weight,
          })),
        };
      }

      case 'create_nutrition_plan': {
        if (input.client_id && !(await ownsClient(svc, userId, input.client_id))) return NOT_OWNED();
        { const bad = validateMacros(input); if (bad) return { error: bad }; }
        const { data: plan, error } = await svc.from('nutrition_plans').insert({
          title: input.title,
          calories: input.calories,
          protein_g: input.protein_g,
          carbs_g: input.carbs_g,
          fats_g: input.fats_g,
          tracking_mode: input.tracking_mode || 'macros',
          description: input.description || '',
          client_id: input.client_id || null,
          status: 'active',
          created_by: userId,
        }).select('id').single();
        if (error) return { error: error.message };
        if (input.client_id) {
          await svc.from('clients').update({ assigned_nutrition_id: plan.id }).eq('id', input.client_id);
        }
        return { success: true, plan_id: plan.id, message: 'Created nutrition plan: ' + input.title };
      }

      case 'update_nutrition_plan': {
        const plan = await ownsPlan(svc, userId, input.plan_id);
        if (!plan) return NOT_OWNED('nutrition plan');
        { const bad = validateMacros(input); if (bad) return { error: bad }; }
        const fields = {};
        if (input.calories !== undefined) fields.calories = input.calories;
        if (input.protein_g !== undefined) fields.protein_g = input.protein_g;
        if (input.carbs_g !== undefined) fields.carbs_g = input.carbs_g;
        if (input.fats_g !== undefined) fields.fats_g = input.fats_g;
        if (input.title) fields.title = input.title;
        if (input.description) fields.description = input.description;
        const { error } = await svc.from('nutrition_plans').update(fields).eq('id', plan.id);
        if (error) return { error: error.message };
        return { success: true, message: 'Nutrition plan updated successfully' };
      }

      case 'create_program': {
        if (input.client_id && !(await ownsClient(svc, userId, input.client_id))) return NOT_OWNED();
        const { data: prog, error } = await svc.from('workout_programs').insert({
          title: input.title,
          duration_weeks: input.duration_weeks,
          days_per_week: input.days_per_week,
          difficulty: input.difficulty || 'intermediate',
          description: input.description || '',
          workouts: [],
          created_by: userId,
        }).select('id').single();
        if (error) return { error: error.message };
        if (input.client_id) {
          await svc.from('clients').update({ assigned_program_id: prog.id }).eq('id', input.client_id);
        }
        return { success: true, program_id: prog.id, message: 'Created program: ' + input.title };
      }

      case 'update_program': {
        const prog = await ownsProgram(svc, userId, input.program_id);
        if (!prog) return NOT_OWNED('program');
        const r = applyProgramChanges(prog.workouts, input.changes);
        if (r.error) return { error: r.error };
        const { error } = await svc.from('workout_programs').update({ workouts: r.workouts }).eq('id', prog.id);
        if (error) return { error: error.message };
        return { success: true, message: `Updated ${r.diffs.length} exercise(s) in "${prog.title}"` };
      }

      case 'update_client': {
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        const fields = {};
        if (input.goal) fields.goal = input.goal;
        if (input.lifecycle_status) fields.lifecycle_status = input.lifecycle_status;
        if (input.notes) fields.notes = input.notes;
        if (input.tags) fields.tags = input.tags;
        if (input.target_weight) fields.target_weight = input.target_weight;
        if (input.current_weight) fields.current_weight = input.current_weight;
        const { error } = await svc.from('clients').update(fields).eq('id', client.id);
        if (error) return { error: error.message };
        return { success: true, message: 'Client profile updated' };
      }

      case 'flag_client_at_risk': {
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        const { error } = await svc.from('clients').update({
          lifecycle_status: 'at_risk',
          lifecycle_notes: '[AI Flag] ' + input.reason + ' (urgency: ' + (input.urgency || 'medium') + ')',
        }).eq('id', client.id);
        if (error) return { error: error.message };
        return { success: true, message: 'Client flagged as at-risk: ' + input.reason };
      }

      case 'send_message': {
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        await sendMessage(svc, {
          client_id: client.id, client_name: client.name,
          content: input.message, sender: 'coach', created_by: userId,
        });
        return { success: true, message: 'Message sent to client' };
      }

      case 'create_checkin_response': {
        const { data: checkIn } = await svc.from('check_ins').select('id, client_id').eq('id', input.checkin_id).maybeSingle();
        if (!checkIn || !(await ownsClient(svc, userId, checkIn.client_id))) return NOT_OWNED('check-in');
        const { error } = await svc.from('check_ins').update({
          coach_notes: input.response,
          review_status: input.review_status || 'reviewed',
          coach_responded: true,
        }).eq('id', checkIn.id);
        if (error) return { error: error.message };
        return { success: true, message: 'Check-in response submitted' };
      }

      case 'award_badge': {
        const client = await ownsClient(svc, userId, input.client_id);
        if (!client) return NOT_OWNED();
        await awardBadge(svc, null, {
          client_id: client.id, client_name: client.name,
          badge_key: input.badge_key, notes: input.notes || '',
        });
        return { success: true, message: 'Badge awarded: ' + input.badge_key };
      }

      default:
        return { error: 'Unknown tool: ' + toolName };
    }
  } catch (err) {
    return { error: err.message };
  }
}
