/**
 * AI Message Assistant — core context builder & generation engine
 * Used by BroadcastModal and AIFollowUpChip
 */
import { db } from '@/api/supabaseClient';
import { differenceInDays, format } from 'date-fns';

export const TONES = [
  { key: 'auto',          label: 'Match the client' },
  { key: 'motivational',  label: 'Motivational' },
  { key: 'empathetic',    label: 'Empathetic' },
  { key: 'direct',        label: 'Direct' },
  { key: 'casual',        label: 'Casual' },
  { key: 'professional',  label: 'Professional' },
];

export const TONE_LABELS = {
  motivational: 'Motivational',
  empathetic:   'Empathetic',
  direct:       'Direct',
  casual:       'Casual',
  professional: 'Professional',
  auto:         'Matched to client',
};

/**
 * Build rich context string for AI prompt
 */
export function buildClientContext(client, messages = [], checkIns = []) {
  if (!client) return '';

  const clientMessages = messages.filter(m => m.client_id === client.id);
  const sorted = [...clientMessages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const last5 = sorted.slice(-5);
  const coachMessages = sorted.filter(m => m.sender === 'coach').slice(-20);
  const clientMessagesOnly = sorted.filter(m => m.sender === 'client').slice(-10);

  const sortedCI = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastCI = sortedCI[0];
  const prevCI = sortedCI[1];

  // Last client message
  const lastClientMsg = [...clientMessages].reverse().find(m => m.sender === 'client');
  const daysSinceClientMsg = lastClientMsg
    ? differenceInDays(new Date(), new Date(lastClientMsg.created_date))
    : 999;

  // Coach tone profile from past messages
  const coachEmojis = coachMessages.flatMap(m => [...(m.content.match(/[\u{1F300}-\u{1FFFF}]/gu) || [])]);
  const emojiUsage = coachEmojis.length / Math.max(coachMessages.length, 1);
  const avgCoachLength = coachMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(coachMessages.length, 1);
  const toneProfile = emojiUsage > 0.8 ? 'casual with emojis' : emojiUsage > 0.3 ? 'friendly with occasional emojis' : 'professional';

  let ctx = `CLIENT PROFILE:
- Name: ${client.name} (use first name: ${client.name?.split(' ')[0]})
- Goal: ${client.goal?.replace(/_/g, ' ') || 'general fitness'}
- Status: ${client.lifecycle_status || 'active'}
- Start date: ${client.start_date || 'unknown'}
- Program assigned: ${client.assigned_program_id ? 'yes' : 'no'}
- Nutrition plan: ${client.assigned_nutrition_id ? 'yes' : 'no'}
- Days since client last messaged: ${daysSinceClientMsg === 999 ? 'never' : daysSinceClientMsg}`;

  if (lastCI) {
    const daysSinceCI = differenceInDays(new Date(), new Date(lastCI.date));
    const weightDelta = prevCI?.weight && lastCI.weight ? (lastCI.weight - prevCI.weight).toFixed(1) : null;
    const trainingTrend = prevCI?.compliance_training !== undefined
      ? lastCI.compliance_training - prevCI.compliance_training
      : null;

    ctx += `

LATEST CHECK-IN (${lastCI.date}, ${daysSinceCI} days ago):
- Mood: ${lastCI.mood || 'not provided'} ${lastCI.mood ? `(${getMoodScore(lastCI.mood)}/10)` : ''}
- Energy: ${lastCI.energy_level || '—'}/10
- Stress: ${lastCI.stress_level || '—'}/10
- Sleep: ${lastCI.sleep_hours || '—'} hrs/night
- Training compliance: ${lastCI.compliance_training ?? '—'}%${trainingTrend !== null ? ` (${trainingTrend >= 0 ? '+' : ''}${trainingTrend}% vs prev)` : ''}
- Nutrition compliance: ${lastCI.compliance_nutrition ?? '—'}%
- Weight: ${lastCI.weight || '—'} lbs${weightDelta !== null ? ` (${parseFloat(weightDelta) >= 0 ? '+' : ''}${weightDelta} lbs)` : ''}
- Client notes: "${lastCI.notes || 'none'}"
- Review status: ${lastCI.review_status || 'pending'}`;
  } else {
    ctx += '\n\nCHECK-INS: None submitted yet';
  }

  if (last5.length > 0) {
    ctx += '\n\nRECENT CONVERSATION (last 5 messages):';
    last5.forEach(m => {
      ctx += `\n${m.sender === 'coach' ? 'Coach' : client.name?.split(' ')[0]}: ${m.content}`;
    });
  } else {
    ctx += '\n\nCONVERSATION: No messages yet';
  }

  ctx += `\n\nCOACH STYLE PROFILE:
- Tone: ${toneProfile}
- Avg message length: ~${Math.round(avgCoachLength)} chars
- Past coach samples: ${coachMessages.slice(-3).map(m => `"${m.content.slice(0, 60)}..."`).join(', ') || 'none yet'}`;

  return ctx;
}

function getMoodScore(mood) {
  const map = { great: 9, good: 7, okay: 5, tired: 4, stressed: 3 };
  return map[mood] || 5;
}

/**
 * Detect the best situational context
 */
export function detectContext(client, messages = [], checkIns = []) {
  const clientMessages = messages.filter(m => m.client_id === client?.id);
  const lastClientMsg = [...clientMessages].reverse().find(m => m.sender === 'client');
  const sortedCI = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastCI = sortedCI[0];

  if (!lastClientMsg && !lastCI) return 'new_client';

  const daysSinceCI = lastCI ? differenceInDays(new Date(), new Date(lastCI.date)) : 999;
  const recentCI = daysSinceCI <= 2;

  if (recentCI && lastCI?.mood && getMoodScore(lastCI.mood) <= 4) return 'low_mood_checkin';
  if (recentCI && lastCI?.compliance_training !== undefined && lastCI.compliance_training < 50) return 'low_training';
  if (recentCI && lastCI?.compliance_training !== undefined && lastCI.compliance_training >= 90) return 'high_performance';
  if (recentCI) return 'recent_checkin';

  const daysSinceMsg = lastClientMsg
    ? differenceInDays(new Date(), new Date(lastClientMsg.created_date))
    : 999;
  if (daysSinceMsg > 7) return 'inactive';
  if (daysSinceMsg > 3) return 'quiet';

  const lastContent = lastClientMsg?.content?.toLowerCase() || '';
  if (lastContent.includes('hurt') || lastContent.includes('pain') || lastContent.includes('sore')) return 'injury_concern';
  if (lastContent.includes('modify') || lastContent.includes('change') || lastContent.includes('alternative')) return 'modification_request';
  if (lastContent.includes('pr') || lastContent.includes('personal best') || lastContent.includes('record')) return 'pr_achieved';

  return 'general';
}

/**
 * Generate AI reply suggestion
 */
export async function generateAIReply(client, messages, checkIns, tone = 'auto', retryCount = 0) {
  const context = buildClientContext(client, messages, checkIns);
  const detectedCtx = detectContext(client, messages, checkIns);
  const firstName = client?.name?.split(' ')[0] || client?.name || 'there';

  // Prompt template + tone/situational maps live in the aiMessageAssistant Edge
  // Function (action: richReply); the pure context builders above run here.
  const res = await db.functions.invoke('aiMessageAssistant', {
    action: 'richReply',
    context,
    tone,
    detectedCtx,
    firstName,
    retryCount,
  });
  const result = res.data || {};

  return {
    message: result.message || '',
    tone_label: result.tone_label || 'Supportive',
    context_reason: result.context_reason || '',
  };
}

/**
 * Generate broadcast message (multiple versions)
 */
export async function generateBroadcastMessage(selectedClients, allClients, filter, checkIns = []) {
  const clientSample = selectedClients.slice(0, 5);
  const summaries = clientSample.map(c => {
    const lastCI = checkIns
      .filter(ci => ci.client_id === c.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return `- ${c.name}: goal=${c.goal?.replace(/_/g, ' ')}, status=${c.lifecycle_status || 'active'}, last check-in=${lastCI?.date || 'none'}, training=${lastCI?.compliance_training ?? '?'}%`;
  }).join('\n');

  const today = format(new Date(), 'EEEE, MMMM d');

  const res = await db.functions.invoke('aiMessageAssistant', {
    action: 'richBroadcast',
    summaries,
    filter,
    count: selectedClients.length,
    today,
  });

  return res.data?.versions || [];
}

/**
 * Generate check-in response
 */
export async function generateCheckInResponse(client, checkIn, previousCheckIns = []) {
  const firstName = client?.name?.split(' ')[0] || 'there';
  const prevCI = previousCheckIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const weightDelta = prevCI?.weight && checkIn.weight
    ? (checkIn.weight - prevCI.weight).toFixed(1)
    : null;
  const trainingTrend = prevCI?.compliance_training !== undefined
    ? (checkIn.compliance_training || 0) - prevCI.compliance_training
    : null;

  const res = await db.functions.invoke('aiMessageAssistant', {
    action: 'richCheckInResponse',
    checkIn,
    client,
    firstName,
    weightDelta,
    trainingTrend,
  });

  return res.data;
}