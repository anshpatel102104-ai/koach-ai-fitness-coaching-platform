// Supabase Edge Function: aiProgressInsights  (Migration Step 7 — frontend cutover)
//
// Per-purpose replacement for the raw `integrations.Core.InvokeLLM` calls in the
// progress UI. Three prompt-only actions, ported verbatim from the frontend
// prompt builders they replace:
//   - checkInSummary   (components/progress/AICheckInSummaryCard)
//   - progressAnalysis (components/progress/AIProgressAnalyzer — coach + client views)
//   - clientSummary    (components/progress/ClientAnalyticsView)
// Context arrives in the request body; the caller-scoped analytics `ctx` is
// computed client-side and passed through. Uses the shared Anthropic client.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { guardAiUse } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { buildCheckInSummaryPrompt } from '../_shared/progressAnalysis.js';
import { TOOL_SYSTEM, CHECKIN_SUMMARY, PROGRESS_CLIENT, PROGRESS_COACH } from '../_shared/aiTools.js';
import { serve } from '../_shared/observe.js';

serve('aiProgressInsights', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { action, client, checkIn, prevCheckIn, recentCheckIns = [], ctx } = body;
    // A portal client always gets the client-facing variant: the coach-internal
    // analysis (churn risk etc.) is never theirs to request. Coaches may choose.
    const isClientFacing = caller.profile?.role === 'client' ? true : !!body.isClientFacing;
    // Bounded prompt input (this array is browser-supplied).
    const recent = Array.isArray(body.recent) ? body.recent.slice(0, 12) : [];
    if (action === 'checkInSummary' && !checkIn) return jsonResponse({ error: 'Missing checkIn' }, 400);
    // Unknown/invalid requests are rejected BEFORE metering so they cost no quota.
    if (!['checkInSummary', 'progressAnalysis', 'clientSummary'].includes(action)) return jsonResponse({ error: 'Unknown action' }, 400);
    // Plan + billing gate (aiPolicy.js): this feature is NOT counted against the
    // monthly AI generations; every call is still recorded in ai_usage_events.
    const blocked = await guardAiUse(serviceClient(), caller, 'aiProgressInsights');
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    // ── ACTION: checkInSummary ── coach dashboard quick summary of one check-in
    if (action === 'checkInSummary') {
      if (!checkIn) return jsonResponse({ error: 'Missing checkIn' }, 400);
      const result = await invokeClaude({
        tool: CHECKIN_SUMMARY, system: TOOL_SYSTEM,
        prompt: buildCheckInSummaryPrompt({ client, checkIn, prevCheckIn, recentCheckIns }),
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: progressAnalysis ── coach (or client-facing) progress analysis
    if (action === 'progressAnalysis') {
      const c = ctx || {};
      const prompt = isClientFacing
        ? `You are a motivational AI fitness coach. Generate encouraging, positive insights for a client viewing their own progress.
NEVER show risk data, churn probability, or negative predictions to the client. Be uplifting and celebratory.

Client: ${client?.name?.split(' ')[0] || 'there'}
Goal: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}
Weeks active: ${c.weeks}
Total check-ins: ${c.checkInCount}
Weight change: ${c.weightChange ? `${c.weightChange} lbs` : 'not tracked'}
Weekly rate: ${c.weeklyWeightRate ? `${c.weeklyWeightRate} lbs/wk` : 'n/a'}
Avg training: ${c.avgTraining ?? 'n/a'}%
Avg nutrition: ${c.avgNutrition ?? 'n/a'}%
Workouts this week: ${c.workoutsThisWeek}
Pace to goal: ${c.paceStatus || 'not set'}
Weeks to goal: ${c.weeksToGoal ?? 'calculating'}

Generate a JSON response with:
{
  "headline": "short celebratory headline (1 line)",
  "summary": "2-3 sentence positive progress summary, data-driven",
  "insights": ["insight 1 (specific, encouraging)", "insight 2", "insight 3"],
  "prediction": "positive goal achievement message",
  "tip": "one actionable tip for next week"
}`
        : `You are an elite fitness coach AI generating an intelligent progress analysis for a coach dashboard.
Be specific, data-driven, and clinically insightful. Surface patterns the coach might miss.

CLIENT: ${client?.name || 'Client'}
GOAL: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}
START WEIGHT: ${c.startWeight ?? 'unknown'} lbs | CURRENT: ${c.currentWeight ?? 'unknown'} lbs
WEIGHT CHANGE: ${c.weightChange ?? 'n/a'} lbs over ${c.weeks} weeks (${c.weeklyWeightRate ?? 'n/a'} lbs/wk)
WEIGHT TREND: ${c.weightTrend}
TARGET WEIGHT: ${client?.target_weight ?? 'not set'} lbs | WEEKS TO GOAL: ${c.weeksToGoal ?? 'n/a'} | PACE: ${c.paceStatus ?? 'n/a'}
PLATEAU DETECTED: ${c.isWeightPlateau ? 'YES' : 'no'}

RECENT AVERAGES (last 8 check-ins):
- Training compliance: ${c.avgTraining ?? 'n/a'}%
- Nutrition compliance: ${c.avgNutrition ?? 'n/a'}%
- Energy: ${c.avgEnergy ?? 'n/a'}/10
- Stress: ${c.avgStress ?? 'n/a'}/10
- Sleep: ${c.avgSleep ?? 'n/a'} hrs
- Mood: ${c.avgMood ?? 'n/a'}/5

PROGRAM: ${c.programTitle ?? 'none'} | Phase: ${c.programPhase} | ${c.weeks} weeks in
WORKOUTS THIS WEEK: ${c.workoutsThisWeek}
DAYS SINCE LAST CHECK-IN: ${c.daysSinceLastCI}
CHURN RISK: ${c.churnRisk}

Generate a JSON response with exactly this structure:
{
  "summary": "3-4 sentence plain English coaching summary covering key metrics, trends, and what stands out",
  "coaching_priority": "One sentence: the single most important coaching focus this week",
  "trends": [
    {"type": "positive|negative|neutral", "text": "specific trend observation"},
    {"type": "positive|negative|neutral", "text": "another trend"}
  ],
  "pace_analysis": "1-2 sentences on goal pace and whether client is ahead/on track/behind",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "readiness": "progress|maintain|deload|switch_program",
  "readiness_reason": "why you chose that readiness status",
  "churn_insight": "insight about engagement risk if relevant, or empty string",
  "plateau_warning": "plateau prediction or warning, or empty string"
}`;

      const result = await invokeClaude({ tool: isClientFacing ? PROGRESS_CLIENT : PROGRESS_COACH, system: TOOL_SYSTEM, prompt });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: clientSummary ── short free-text progress summary
    if (action === 'clientSummary') {
      const result = await invokeClaude({
        prompt: `You are an expert fitness coach AI. Analyze this client's recent check-in data and write a 2–3 sentence progress summary. Be specific, encouraging but honest. Mention what's working, what's limiting progress, and one actionable recommendation.

Client: ${client?.name}
Goal: ${client?.goal}
Recent check-ins: ${JSON.stringify(recent ?? [], null, 2)}`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse({ text: result.text.trim() });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
