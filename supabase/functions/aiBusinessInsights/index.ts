// Supabase Edge Function: aiBusinessInsights  (Migration Step 7 — frontend cutover)
//
// Per-purpose replacement for the raw `integrations.Core.InvokeLLM` calls in the
// business / at-risk UI. Three prompt-only actions, ported verbatim from the
// frontend prompt builders they replace:
//   - interventionPlan (pages/AtRiskClients + components/at-risk/RiskClientCard)
//   - businessInsights (components/business/bi/BIAIInsights)
//   - clientAlerts     (components/dashboard/ClientAlerts)
// Context arrives in the request body. Uses the shared Anthropic client.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { meterInsightCall } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { TOOL_SYSTEM, INTERVENTION_PLAN, BUSINESS_INSIGHTS, CLIENT_ALERTS } from '../_shared/aiTools.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { action } = body;
    // Unknown/invalid requests are rejected BEFORE metering so they cost no quota.
    if (!['interventionPlan', 'businessInsights', 'clientAlerts'].includes(action)) return jsonResponse({ error: 'Unknown action' }, 400);
    // Every action below makes one Claude call: charge it to the AI quota
    // (coach, or the owning coach for a portal client) — same 402 as the generators.
    const blocked = await meterInsightCall(serviceClient(), caller);
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    // ── ACTION: interventionPlan ── at-risk client intervention plan
    if (action === 'interventionPlan') {
      const { clientName, goal, riskFactors, riskScore, avgAdherence } = body;
      const result = await invokeClaude({
        tool: INTERVENTION_PLAN, system: TOOL_SYSTEM,
        prompt: `You are a fitness coach AI advisor. Generate a personalized intervention plan for an at-risk client.

Client: ${clientName}
Risk factors: ${riskFactors || 'unknown'}
Goal: ${goal?.replace(/_/g, ' ') || 'general fitness'}
Risk score: ${riskScore ?? 'n/a'}/100
Average adherence: ${avgAdherence ?? 'unknown'}%

Respond with JSON only:
{
  "immediate_action": "specific action to take today (1 sentence)",
  "message_script": "personalized message to send the client (2-3 sentences, warm and motivating)",
  "program_adjustment": "program change to consider (1 sentence, e.g. reduce frequency)",
  "follow_up_timeline": "when to follow up (e.g. Check back in 3 days)",
  "followup": "follow-up timeline and action (1 sentence)"
}`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: businessInsights ── BI dashboard insights
    if (action === 'businessInsights') {
      const m = body.metrics || {};
      const result = await invokeClaude({
        tool: BUSINESS_INSIGHTS, system: TOOL_SYSTEM,
        prompt: `You are an expert business intelligence analyst for a fitness coaching business. Analyze this data and generate 4-5 specific, actionable business insights.

Business Data:
- MRR: $${m.mrr}
- Active Clients: ${m.activeClients}
- Average Monthly Rate: $${m.avgRate}
- At-Risk Clients: ${m.atRiskClients}
- Pipeline Leads: ${m.pipelineLeads} (${m.staleLeads} stale 14+ days)
- Lead Conversion Rate: ${m.convRate}%
- Average Adherence: ${m.avgAdherence}%
- Check-in Review Rate: ${m.reviewedPct}%
- New Clients This Month: ${m.newThisMonth}
- Stale pipeline value: $${m.staleValue}/mo potential

Generate 4-5 insights. Each must be actionable and specific. Include dollar amounts when relevant.
Categories: revenue, retention, pricing, efficiency, growth
Return ONLY valid JSON: { "insights": [ { "category": "...", "headline": "...", "body": "...", "action": "...", "impact": "..." } ] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: clientAlerts ── scan active clients' recent check-ins for issues
    if (action === 'clientAlerts') {
      const clients = (body.clients || []) as Array<Record<string, unknown>>;
      const checkIns = (body.checkIns || []) as Array<Record<string, unknown>>;
      const data = clients
        .filter((c) => c.status === 'active')
        .map((c) => {
          const cis = checkIns.filter((ci) => ci.client_id === c.id).slice(0, 3);
          return {
            name: c.name,
            goal: c.goal,
            checkIns: cis.map((ci) => ({
              date: ci.date,
              weight: ci.weight,
              compliance_training: ci.compliance_training,
              compliance_nutrition: ci.compliance_nutrition,
              mood: ci.mood,
              sleep: ci.sleep_hours,
            })),
          };
        });

      const result = await invokeClaude({
        tool: CLIENT_ALERTS, system: TOOL_SYSTEM,
        prompt: `You are an AI fitness coach assistant. Analyze the following client data and identify any alerts or issues.
Look for: weight plateaus, weight spikes, missed check-ins, declining compliance, poor sleep trends.
Return a JSON array of up to 5 alerts, each with: { client_name, alert_type, message, severity ("high"|"medium"|"low") }.
Keep each message under 15 words. Be direct and actionable.

Client data:
${JSON.stringify(data, null, 2)}

Return ONLY valid JSON: { "alerts": [ ... ] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
