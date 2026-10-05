/**
 * Check-in progress analysis — shared by the on-demand `aiProgressInsights`
 * checkInSummary action and the automatic `checkin.analyze` path run from
 * onEntityEvent when a check-in is created.
 *
 * The prompt is the aiProgressInsights checkInSummary prompt, unchanged, plus
 * an optional TREND SIGNALS block ported from base44's analyzeProgress
 * (weekly weight rate, plateau, mood trend, churn signals). Pure module — no
 * Deno / network imports — so node rehearsals can import it.
 */

export const MOOD_SCORE = { great: 5, good: 4, okay: 3, tired: 2, stressed: 1 };

const avg = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);

/**
 * base44 analyzeProgress signals, computed from the client's check-ins
 * (any order) and message list. Returns null with fewer than 2 check-ins.
 */
export function computeProgressSignals(checkIns, messages = [], now = Date.now()) {
  const sorted = [...checkIns].filter((c) => c.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 2) return null;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const weeks = Math.round((new Date(last.date) - new Date(first.date)) / (7 * 86400000));
  const weightChange = first.weight && last.weight ? Number((last.weight - first.weight).toFixed(1)) : null;
  const weeklyWeightRate = weightChange !== null && weeks > 0 ? Number((weightChange / weeks).toFixed(2)) : null;
  const recentWeights = sorted.slice(-4).filter((c) => c.weight).map((c) => Number(c.weight));
  const plateau = recentWeights.length >= 3
    && Math.abs(recentWeights[recentWeights.length - 1] - recentWeights[0]) < 1.5;

  const avgTraining = avg(sorted.map((c) => Number(c.compliance_training || 0)));
  const mood = (cs) => cs.filter((c) => c.mood).map((c) => MOOD_SCORE[c.mood] || 3);
  const recentMood = avg(mood(sorted.slice(-3)));
  const olderMood = avg(mood(sorted.slice(0, 3)));
  const moodTrendDown = recentMood !== null && olderMood !== null && recentMood < olderMood - 0.5;

  const daysSinceLast = Math.floor((now - new Date(last.date).getTime()) / 86400000);
  const coachMsgs = messages.filter((m) => m.sender === 'coach').length;
  const clientMsgs = messages.filter((m) => m.sender === 'client').length;
  const responseRate = coachMsgs > 0 ? Math.min(100, Math.round((clientMsgs / coachMsgs) * 100)) : 50;
  const churnRisk = Math.min(95,
    (daysSinceLast > 10 ? 30 : 0) + (avgTraining < 50 ? 20 : 0) + (moodTrendDown ? 20 : 0)
    + (plateau ? 15 : 0) + (responseRate < 30 ? 15 : 0));
  return { weeks, weightChange, weeklyWeightRate, plateau, moodTrendDown, daysSinceLast, responseRate, churnRisk };
}

/** The check-in summary prompt (card shape: summary/week_vs_prev/coaching_focus/sentiment/key_wins/red_flags). */
export function buildCheckInSummaryPrompt({ client, checkIn, prevCheckIn, recentCheckIns = [], signals = null }) {
  const allCIs = recentCheckIns;
  const weightDelta = checkIn.weight && prevCheckIn?.weight
    ? (checkIn.weight - prevCheckIn.weight).toFixed(1) : null;
  const totalLost = allCIs.length >= 2
    ? (allCIs[allCIs.length - 1].weight - allCIs[0].weight).toFixed(1) : null;
  const moodTrend = allCIs.slice(-3).map((ci) => MOOD_SCORE[ci.mood ?? ''] || 3);
  const moodDirection = moodTrend.length >= 2
    ? (moodTrend[moodTrend.length - 1] > moodTrend[0] ? 'improving'
      : moodTrend[moodTrend.length - 1] < moodTrend[0] ? 'declining' : 'stable')
    : 'insufficient data';

  const signalBlock = signals ? `
TREND SIGNALS (computed from the full history):
- Weekly weight rate: ${signals.weeklyWeightRate ?? 'n/a'} lbs/wk over ${signals.weeks} weeks
- Plateau detected (last 4 check-ins within 1.5 lbs): ${signals.plateau ? 'YES' : 'no'}
- Mood trending down vs early check-ins: ${signals.moodTrendDown ? 'YES' : 'no'}
- Days since last check-in: ${signals.daysSinceLast}
- Client message response rate: ${signals.responseRate}%
- Churn risk score: ${signals.churnRisk}%
` : '';

  return `You are an AI fitness coach generating a quick check-in summary for a coach dashboard.
Be concise, specific, and data-driven. Write like a smart colleague briefing a coach.

CLIENT: ${client?.name || 'Client'}
GOAL: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}
TOTAL CHECK-INS: ${allCIs.length}

THIS CHECK-IN (${checkIn.date}):
- Weight: ${checkIn.weight ? `${checkIn.weight} lbs` : 'not recorded'}${weightDelta ? ` (${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} from last week)` : ''}
- Total weight change: ${totalLost ? `${totalLost} lbs` : 'n/a'}
- Training compliance: ${checkIn.compliance_training ?? 'n/a'}%
- Nutrition compliance: ${checkIn.compliance_nutrition ?? 'n/a'}%
- Mood: ${checkIn.mood || 'not recorded'} (trend: ${moodDirection})
- Energy: ${checkIn.energy_level ?? 'n/a'}/10
- Stress: ${checkIn.stress_level ?? 'n/a'}/10
- Sleep: ${checkIn.sleep_hours ?? 'n/a'} hrs
- Client notes: ${checkIn.notes || 'none'}

${prevCheckIn ? `PREVIOUS CHECK-IN: weight ${prevCheckIn.weight ?? 'n/a'} lbs, training ${prevCheckIn.compliance_training ?? 'n/a'}%, nutrition ${prevCheckIn.compliance_nutrition ?? 'n/a'}%` : 'FIRST CHECK-IN'}
${signalBlock}
Generate JSON:
{
  "summary": "3-4 sentence plain English summary of this check-in for the coach. Name the client. Note the most important data points, any positive changes, and one concern if present.",
  "week_vs_prev": "one sentence comparing this week to last week (or note it's the first)",
  "coaching_focus": "One sentence: the single most important thing for the coach to address this week",
  "sentiment": "great|good|okay|concerning",
  "key_wins": ["win 1", "win 2"],
  "red_flags": ["flag 1 if present, else leave empty array"]
}`;
}

/**
 * `checkin.analyze` — run from onEntityEvent on checkin.created.
 *
 * Deps are injected so the logic is testable without Deno/network:
 *   meter(profile)  → { allowed }   (plan/billing gate, NOT a counted generation — aiFeatureAllowed)
 *   invoke(args)    → { ok, parsed }  (invokeClaude)
 *   tool, system    → the CHECKIN_SUMMARY tool + TOOL_SYSTEM
 * Skips silently (no AI call, no error) when the coach's plan doesn't include it. Never
 * throws: analysis is best-effort and must not fail/un-claim the event.
 */
export async function analyzeCheckIn(admin, { checkIn, client, coach }, { meter, invoke, tool, system }) {
  try {
    if (!checkIn?.id || !client || !coach) return { skipped: 'missing context' };
    const { data: existing } = await admin.from('check_ins')
      .select('ai_checkin_summary').eq('id', checkIn.id).maybeSingle();
    if (existing?.ai_checkin_summary) return { skipped: 'already analysed' };

    const [{ data: cis }, { data: msgs }] = await Promise.all([
      admin.from('check_ins').select('*').eq('client_id', client.id)
        .order('date', { ascending: false }).limit(20),
      admin.from('messages').select('sender').eq('client_id', client.id)
        .order('created_at', { ascending: false }).limit(50),
    ]);
    const sorted = (cis ?? []).filter((c) => c.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    const current = sorted.find((c) => c.id === checkIn.id) ?? checkIn;
    const idx = sorted.findIndex((c) => c.id === current.id);
    const prevCheckIn = idx > 0 ? sorted[idx - 1] : (idx === -1 && sorted.length ? sorted[sorted.length - 1] : null);

    // Plan gate LAST before the model call: an ineligible coach costs nothing.
    const gate = await meter(coach);
    if (!gate.allowed) return { skipped: 'not in plan' };

    const result = await invoke({
      tool, system,
      prompt: buildCheckInSummaryPrompt({
        client, checkIn: current, prevCheckIn, recentCheckIns: sorted,
        signals: computeProgressSignals(sorted, msgs ?? []),
      }),
    });
    if (!result?.ok || !result.parsed) return { skipped: 'ai failed', error: result?.error };

    const { error } = await admin.from('check_ins').update({
      ai_checkin_summary: result.parsed,
      ai_checkin_summary_at: new Date().toISOString(),
    }).eq('id', checkIn.id);
    if (error) return { skipped: 'store failed', error: error.message };
    return { analysed: true };
  } catch (e) {
    return { skipped: 'error', error: e.message };
  }
}
