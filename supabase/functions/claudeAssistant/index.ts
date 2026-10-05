// Supabase Edge Function: claudeAssistant  (Migration Step 5d)
//
// Re-platform of base44/functions/claudeAssistant — the agentic coach
// assistant: prompt → model may emit <action>{json}</action> tool calls →
// execute → feed results back, up to 6 iterations (verbatim loop shape).
//
// Two deliberate changes vs Base44:
//   - InvokeLLM → the shared Anthropic client (_shared/anthropic.js).
//   - WRITES REQUIRE COACH CONFIRMATION: write tools never execute inside the
//     model loop. They return a validated proposal ({proposals}) that the UI
//     shows with Confirm/Dismiss; the confirm request ({confirm:{tool,input}})
//     is what actually writes — re-checked for ownership at that moment.
//     Reads (get_client_data, list_clients, get_program, list_checkins) run
//     immediately.
//   - SECURITY: Base44 ran every tool asServiceRole with no ownership checks
//     (any coach could act on any tenant's clients). Every tool now resolves
//     targets through the caller's ownership — see _shared/assistantTools.js.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { guardAiUse } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import {
  executeAssistantTool, previewAssistantWrite, READ_TOOLS, WRITE_TOOLS,
} from '../_shared/assistantTools.js';

const TOOLS_PROMPT = `You are an expert AI fitness coach assistant with REAL ACTION capabilities inside the KOACH AI coaching platform.

You have access to the following tools. When you want to use a tool, output it as JSON wrapped in <action> tags.
After an action result comes back, continue naturally and take additional actions if needed.

AVAILABLE TOOLS:

READ tools run immediately. WRITE tools (marked [WRITE]) are NOT executed: they are sent to the coach as a proposal and only saved after the coach clicks Confirm. After proposing, tell the coach what you proposed and that it awaits their confirmation — never say a write is done.

1. get_client_data - Get full client info, check-ins, nutrition plan
   <action>{"tool":"get_client_data","client_id":"CLIENT_ID"}</action>

2. list_clients - List all clients
   <action>{"tool":"list_clients","filter":"all"}</action>

3. [WRITE] create_nutrition_plan - Create a nutrition plan and assign to client
   <action>{"tool":"create_nutrition_plan","client_id":"ID","title":"Title","calories":2200,"protein_g":180,"carbs_g":220,"fats_g":70,"tracking_mode":"macros","description":"optional"}</action>

4. [WRITE] update_nutrition_plan - Update calories/macros of an existing nutrition plan
   <action>{"tool":"update_nutrition_plan","plan_id":"ID","calories":2000,"protein_g":160,"carbs_g":200,"fats_g":65}</action>

5. [WRITE] create_program - Create a workout program for a client
   <action>{"tool":"create_program","title":"Title","client_id":"ID","duration_weeks":8,"days_per_week":4,"difficulty":"intermediate","description":"optional"}</action>

5b. get_program - Read a workout program (workouts, exercises, sets, reps)
   <action>{"tool":"get_program","program_id":"ID"}</action>

5c. list_checkins - Read a client's recent check-ins (limit up to 30)
   <action>{"tool":"list_checkins","client_id":"ID","limit":10}</action>

5d. [WRITE] update_program - Change sets/reps on exercises of an existing program (call get_program first to see exact workout and exercise names)
   <action>{"tool":"update_program","program_id":"ID","changes":[{"workout":"Day 1","exercise":"Barbell Squat","sets":4,"reps":"6-8"}]}</action>

6. [WRITE] update_client - Update client profile
   <action>{"tool":"update_client","client_id":"ID","goal":"weight_loss","lifecycle_status":"active","notes":"optional"}</action>

7. [WRITE] flag_client_at_risk - Flag a client as at-risk
   <action>{"tool":"flag_client_at_risk","client_id":"ID","reason":"reason text","urgency":"medium"}</action>

8. [WRITE] send_message - Send a message to a client
   <action>{"tool":"send_message","client_id":"ID","message":"Your message here"}</action>

9. [WRITE] create_checkin_response - Respond to a client check-in
   <action>{"tool":"create_checkin_response","checkin_id":"ID","response":"Your coaching response","review_status":"reviewed"}</action>

10. [WRITE] award_badge - Award an achievement badge
    <action>{"tool":"award_badge","client_id":"ID","badge_key":"streak_7","notes":"optional"}</action>

IMPORTANT RULES:
- When asked to DO something, ALWAYS use the appropriate tool - do not just give advice
- Use list_clients or get_client_data first if you need IDs or more context
- You can chain multiple actions in sequence
- After taking actions, give a clear summary of what you did
- Only ever act on the clients/plans/programs the tools return — IDs you were not given are rejected
- Calories must be 800-8000 and macros sensible; the server rejects anything else
- For nutrition plans, calculate sensible macros based on goals if not specified`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    // Full AI assistant: not counted, Elite+ (see aiPolicy.js).
    const blocked = await guardAiUse(svc, caller, 'claudeAssistant');
    if (blocked) return jsonResponse(blocked.body, blocked.status);
    const userId = caller.auth.id;

    const body = await req.json();
    const { userMessage, conversationHistory = [], clientContext = null } = body;

    // ── confirm path: the coach approved a proposed write in the UI ──────────
    if (body.confirm) {
      const { tool, input } = body.confirm;
      if (!WRITE_TOOLS.has(tool)) return jsonResponse({ error: 'Not a confirmable write tool' }, 400);
      // executeAssistantTool re-checks ownership of every target — a tampered
      // confirm payload can still only touch the caller's own records.
      const result = await executeAssistantTool(svc, userId, tool, input ?? {});
      return jsonResponse({ tool, input, result });
    }

    if (!userMessage) return jsonResponse({ error: 'userMessage required' }, 400);

    // Build client context section (verbatim)
    let clientSection = '';
    if (clientContext) {
      clientSection = '\n\nCURRENT CLIENT IN CONTEXT:\n' +
        '- Name: ' + clientContext.name + '\n' +
        '- ID: ' + clientContext.id + '\n' +
        '- Goal: ' + (clientContext.goal || 'general fitness').replace(/_/g, ' ') + '\n' +
        '- Current weight: ' + (clientContext.current_weight || 'unknown') + ' lbs\n' +
        '- Target weight: ' + (clientContext.target_weight || 'not set') + ' lbs\n' +
        '- Assigned nutrition plan ID: ' + (clientContext.assigned_nutrition_id || 'none') + '\n' +
        '- Assigned program ID: ' + (clientContext.assigned_program_id || 'none') + '\n' +
        '- Lifecycle status: ' + (clientContext.lifecycle_status || 'active') + '\n' +
        '- Overall adherence: ' + (clientContext.adherenceScore || 0) + '%\n' +
        '- Check-in streak: ' + (clientContext.streak || 0) + ' days\n' +
        '- Last check-in date: ' + (clientContext.lastCheckIn?.date || 'never') + '\n' +
        '- Last check-in ID: ' + (clientContext.lastCheckIn?.id || 'none') + '\n' +
        '- Last check-in mood: ' + (clientContext.lastCheckIn?.mood || 'unknown') + '\n' +
        '- Last check-in notes: ' + (clientContext.lastCheckIn?.notes || 'none');
    }

    const systemPrompt = TOOLS_PROMPT + clientSection;

    const historyStr = conversationHistory.slice(-6).map((m: { role: string; content: string }) =>
      (m.role === 'user' ? 'Coach' : 'Assistant') + ': ' + m.content
    ).join('\n\n');

    // Agentic loop (verbatim shape: ≤6 iterations, <action> tag protocol)
    const actionLog: unknown[] = [];
    const proposals: unknown[] = [];
    let currentInput = userMessage;
    let fullContext = historyStr ? 'CONVERSATION HISTORY:\n' + historyStr + '\n\n' : '';
    let iterations = 0;

    while (iterations < 6) {
      iterations++;

      const prompt = systemPrompt + '\n\n' + fullContext + 'Coach: ' + currentInput + '\n\nAssistant:';

      const llm = await invokeClaude({ prompt, maxTokens: 2048 });
      if (!llm.ok) return jsonResponse({ error: llm.error }, llm.status ?? 500);
      const responseText = llm.text;

      // Parse action tags
      const actionRegex = /<action>([\s\S]*?)<\/action>/g;
      const actionsFound: Record<string, unknown>[] = [];
      let match;
      while ((match = actionRegex.exec(responseText)) !== null) {
        try {
          actionsFound.push(JSON.parse(match[1].trim()));
        } catch (_e) { /* skip malformed */ }
      }

      if (actionsFound.length === 0) {
        return jsonResponse({ response: responseText.trim(), actions: actionLog, proposals });
      }

      const results = [];
      for (const action of actionsFound) {
        const tool = action.tool as string;
        if (WRITE_TOOLS.has(tool)) {
          // Validate + ownership-check now, but DO NOT write: queue for confirmation.
          const preview = await previewAssistantWrite(svc, userId, tool, action);
          if (preview.error) {
            results.push({ tool, input: action, result: { error: preview.error } });
            actionLog.push({ tool, input: action, result: { error: preview.error } });
          } else {
            const { tool: _t, ...input } = action;
            proposals.push({ id: crypto.randomUUID(), tool, input, summary: preview.summary, changes: preview.changes ?? [] });
            results.push({ tool, input: action, result: {
              status: 'proposed_awaiting_coach_confirmation', summary: preview.summary,
              note: 'NOT saved yet — the coach must confirm in the UI.',
            } });
          }
        } else if (READ_TOOLS.has(tool)) {
          const result = await executeAssistantTool(svc, userId, tool, action);
          results.push({ tool, input: action, result });
          actionLog.push({ tool, input: action, result });
        } else {
          results.push({ tool, input: action, result: { error: 'Unknown tool: ' + tool } });
        }
      }

      const resultsStr = results.map((r) =>
        'Tool: ' + r.tool + '\nResult: ' + JSON.stringify(r.result)
      ).join('\n\n');

      const cleanResponse = responseText.replace(/<action>[\s\S]*?<\/action>/g, '').trim();

      fullContext += 'Coach: ' + currentInput + '\n\nAssistant: ' + (cleanResponse || '[taking action]') +
        '\n\nTOOL RESULTS:\n' + resultsStr + '\n\n';

      currentInput = 'Continue based on the tool results above. Provide your final response to the coach.';
    }

    return jsonResponse({
      response: 'I completed the requested actions. Please check the action log for details.',
      actions: actionLog,
      proposals,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
