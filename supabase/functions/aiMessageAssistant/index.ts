// Supabase Edge Function: aiMessageAssistant  (Migration Step 5d)
//
// Re-platform of base44/functions/aiMessageAssistant: four prompt-only
// actions (generateReply / generateBroadcast / generateCheckInResponse /
// followUpSuggestions). No DB reads or writes — all context arrives in the
// request body, exactly as in Base44 — so the only change is
// InvokeLLM → the shared Anthropic client. Unmetered, as in Base44.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { guardAiUse } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { serve } from '../_shared/observe.js';

serve('aiMessageAssistant', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    // Draft replies are not counted as generations; plan-gated (see aiPolicy.js).
    const blocked = await guardAiUse(serviceClient(), caller, 'aiMessageAssistant');
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    const body = await req.json();
    const { action, client, tone, conversationMessages, checkIn, recentCheckIns, selectedClientIds, clients, broadcastContext } = body;

    // ── ACTION: generateReply ──
    if (action === 'generateReply') {
      const toneInstruction = {
        motivational: 'Be highly energetic, celebratory, use fire/muscle emojis, pump the client up.',
        empathetic: 'Be gentle, understanding, validate feelings, show genuine care and warmth.',
        direct: 'Be concise and actionable, skip fluff, get straight to the point.',
        casual: 'Be relaxed and friendly, like texting a friend, use natural language.',
        professional: 'Be polished and structured, minimal emojis, clear coaching language.',
      }[tone as string] || 'Be warm, motivational, and human.';

      const convo = (conversationMessages || [])
        .slice(-6)
        .map((m: { sender: string; content: string }) => `${m.sender === 'coach' ? 'Coach' : (client?.name || 'Client')}: ${m.content}`)
        .join('\n');

      const lastCI = checkIn;
      const ciCtx = lastCI
        ? `\nLatest check-in (${lastCI.date}):
- Mood: ${lastCI.mood || 'N/A'} | Energy: ${lastCI.energy_level || 'N/A'}/10 | Stress: ${lastCI.stress_level || 'N/A'}/10
- Weight: ${lastCI.weight ? lastCI.weight + ' lbs' : 'N/A'} | Sleep: ${lastCI.sleep_hours || 'N/A'} hrs
- Training: ${lastCI.compliance_training != null ? lastCI.compliance_training + '%' : 'N/A'} | Nutrition: ${lastCI.compliance_nutrition != null ? lastCI.compliance_nutrition + '%' : 'N/A'}
- Client notes: ${lastCI.notes || 'None'}`
        : '';

      const result = await invokeClaude({
        expectJson: true,
        prompt: `You are an elite personal fitness coach. Write ONE short, human, personalized reply to your client "${client?.name || 'your client'}".

CLIENT CONTEXT:
- Goal: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}
- Status: ${client?.lifecycle_status || 'active'}${ciCtx}

RECENT CONVERSATION (most recent last):
${convo || 'No previous messages.'}

TONE INSTRUCTION: ${toneInstruction}

RULES:
- Under 70 words
- Use client's first name (${client?.name?.split(' ')[0] || 'there'})
- Sound like a real human coach, not a corporate bot
- Do NOT use em-dashes or bullet points
- Return ONLY valid JSON in this format: { "message": "...", "tone": "Motivational" }
- The "tone" field must be one of: Motivational, Empathetic, Informative, Casual, Direct`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: generateBroadcast ──
    if (action === 'generateBroadcast') {
      const ctx = broadcastContext || {};
      const count = ctx.count || (selectedClientIds || []).length || 0;
      const sampleNames = (clients || []).slice(0, 3).map((c: { name?: string }) => c.name?.split(' ')[0]).join(', ');

      const result = await invokeClaude({
        expectJson: true,
        prompt: `You are a fitness coach. Write 3 different broadcast messages for ${count} ${ctx.filter || 'clients'}.
Sample recipients: ${sampleNames || 'various clients'}.
Context: ${ctx.reason || 'general check-in'}, today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}.

Each message should:
- Use [First Name] token for personalization
- Be 30-50 words
- Version 1: Motivational/energetic tone
- Version 2: Informative/reminder tone
- Version 3: Casual/friendly tone
- Do NOT use em-dashes

Return ONLY valid JSON: { "versions": [{ "message": "...", "tone": "..." }, { "message": "...", "tone": "..." }, { "message": "...", "tone": "..." }] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: generateCheckInResponse ──
    if (action === 'generateCheckInResponse') {
      const allCIs = recentCheckIns || [];
      const weights = allCIs.filter((c: { weight?: number }) => c.weight).slice(0, 5).map((c: { weight: number }) => c.weight);
      const weightTrend = weights.length >= 2
        ? (weights[0] < weights[weights.length - 1]
            ? `up ${(weights[weights.length - 1] - weights[0]).toFixed(1)} lbs recently`
            : `down ${(weights[0] - weights[weights.length - 1]).toFixed(1)} lbs recently`)
        : 'insufficient data';
      const avgTraining = allCIs.length
        ? Math.round(allCIs.reduce((s: number, c: { compliance_training?: number }) => s + (c.compliance_training || 0), 0) / allCIs.length)
        : null;

      const result = await invokeClaude({
        prompt: `You are an elite personal fitness coach writing a check-in response.

CLIENT: ${client?.name || 'Client'} | GOAL: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}

THIS WEEK'S CHECK-IN:
- Weight: ${checkIn.weight ? checkIn.weight + ' lbs' : 'N/A'}
- Body fat: ${checkIn.body_fat_pct ? checkIn.body_fat_pct + '%' : 'N/A'}
- Sleep: ${checkIn.sleep_hours ? checkIn.sleep_hours + ' hrs' : 'N/A'}
- Energy: ${checkIn.energy_level || 'N/A'}/10 | Stress: ${checkIn.stress_level || 'N/A'}/10
- Mood: ${checkIn.mood || 'N/A'}
- Training: ${checkIn.compliance_training != null ? checkIn.compliance_training + '%' : 'N/A'}
- Nutrition: ${checkIn.compliance_nutrition != null ? checkIn.compliance_nutrition + '%' : 'N/A'}
- Client notes: ${checkIn.notes || 'None'}

TRENDS (last ${allCIs.length} check-ins): Weight trend ${weightTrend}, avg training ${avgTraining != null ? avgTraining + '%' : 'N/A'}

Write a 80-120 word coaching response that:
1. Acknowledges 2 specific data points from this check-in
2. Addresses any red flags (low mood/sleep/compliance) with empathy but action-focused
3. Gives ONE clear priority for next week
4. Ends with brief encouragement
Tone: warm, direct, results-focused. No bullet points, no em-dashes, plain paragraphs.
Use first name only (${client?.name?.split(' ')[0] || 'there'}), no greeting opener.
Return ONLY the message text as a plain string.`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse({ message: result.text.trim() });
    }

    // ── ACTION: followUpSuggestions ──
    if (action === 'followUpSuggestions') {
      const daysSince = body.daysSince || 7;
      const lastCI = checkIn;

      const result = await invokeClaude({
        expectJson: true,
        prompt: `Client "${client?.name}" hasn't been messaged in ${daysSince} days.
${lastCI ? `Last check-in: mood ${lastCI.mood}, training ${lastCI.compliance_training}%, nutrition ${lastCI.compliance_nutrition}%` : 'No recent check-in.'}
Goal: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}

Write ONE short (under 50 words) follow-up message. Warm, caring, curious. Use first name (${client?.name?.split(' ')[0] || 'there'}).
Return ONLY valid JSON: { "message": "..." }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: replySuggestions ── (ported from components/messages/AISuggestions)
    if (action === 'replySuggestions') {
      const clientName = body.clientName || client?.name || 'your client';
      const convoContext = body.context;
      const result = await invokeClaude({
        expectJson: true,
        prompt: `You are a fitness coach assistant. Based on this recent conversation with client "${clientName}", generate 3 short, friendly reply suggestions the coach might send next. Keep each under 40 words.

Conversation:
${convoContext || 'No messages yet.'}

Return exactly 3 suggestions.
Return ONLY valid JSON: { "suggestions": ["...", "...", "..."] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTIONS below back src/lib/aiMessageAssistant.js. The pure context
    // builders (buildClientContext/detectContext) stay client-side; the prompt
    // templates + lookup maps live here so the LLM call is server-side. ──

    // richReply → generateAIReply
    if (action === 'richReply') {
      const { context = '', tone = 'auto', detectedCtx = 'general', firstName = 'there', retryCount = 0 } = body;
      const toneInstruction = ({
        motivational: 'Be highly energetic, positive, and use motivating language. Use 1-2 fire or muscle emojis.',
        empathetic: 'Be warm, understanding, and emotionally supportive. Acknowledge feelings first.',
        direct: 'Be concise and action-oriented. Get straight to the point. No fluff.',
        casual: 'Be friendly and conversational, like texting a friend. Use casual language.',
        professional: 'Be polished and professional. Minimal emojis. Clear and structured.',
        auto: "Match the coach's established tone from their message history. Be natural and consistent.",
      } as Record<string, string>)[tone] || 'Be natural and coach-like.';
      const situationalHint = ({
        low_mood_checkin: 'Client submitted a check-in with LOW MOOD. Acknowledge it empathetically before coaching.',
        low_training: 'Client has LOW TRAINING COMPLIANCE this week. Gently explore why and offer support.',
        high_performance: 'Client had EXCEPTIONAL PERFORMANCE. Celebrate it genuinely and specifically.',
        recent_checkin: 'Client recently submitted a check-in. Respond to their progress specifically.',
        inactive: 'Client has been QUIET/INACTIVE for several days. Reach out warmly to re-engage.',
        quiet: "Client hasn't messaged in a few days. Check in casually.",
        injury_concern: 'Client may have mentioned pain/injury. Address safety first, offer modification.',
        modification_request: 'Client is asking about exercise modifications. Give a helpful, specific answer.',
        pr_achieved: 'Client hit a personal best! Celebrate enthusiastically and specifically.',
        new_client: 'This is a new client with no history. Warmly introduce yourself and set expectations.',
        general: 'Write a helpful, contextual reply based on the conversation.',
      } as Record<string, string>)[detectedCtx] || '';
      const retryVariant = retryCount > 0
        ? `\n\nIMPORTANT: This is retry #${retryCount} — generate a DIFFERENT style/angle reply than before. Change the opener and approach.`
        : '';
      const result = await invokeClaude({
        expectJson: true,
        prompt: `You are an elite personal fitness coach with a warm, results-driven communication style.

SITUATION: ${situationalHint}

TONE INSTRUCTION: ${toneInstruction}

${context}

YOUR TASK:
Write ONE reply message to ${firstName}. Rules:
- Under 80 words
- Use first name naturally
- Sound genuinely human, not robotic
- No generic filler phrases like "I hope you're well"
- Be specific to the client's actual data above
- Do NOT start with "I" as the first word${retryVariant}

Also detect the tone of your reply from: Motivational, Empathetic, Informative, Celebratory, Direct, Supportive.

Return ONLY valid JSON: { "message": "...", "tone_label": "...", "context_reason": "..." }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // richBroadcast → generateBroadcastMessage
    if (action === 'richBroadcast') {
      const { summaries = '', filter = 'all', count = 0, today = '' } = body;
      const filterCtx = ({
        all: 'all active coaching clients',
        active: 'all active clients who are progressing',
        at_risk: 'clients who are at-risk of churning or falling off track',
        no_program: "clients who don't have a workout program assigned yet",
        lead: "potential leads who haven't started yet",
      } as Record<string, string>)[filter] || 'selected clients';
      const result = await invokeClaude({
        expectJson: true,
        prompt: `You are a personal fitness coach writing a broadcast message to ${filterCtx} (${count} people) on ${today}.

Sample of recipients:
${summaries}

Generate 3 DIFFERENT versions of a broadcast message. Each version should:
- Use [First Name] as a personalization token
- Be under 100 words
- Be appropriate for the recipient group context (${filterCtx})
- Have a different tone/angle
- Sound warm and personal, not mass-marketing

Return ONLY valid JSON: { "versions": [ { "message": "...", "tone_label": "...", "description": "..." } ] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // richCheckInResponse → generateCheckInResponse (structured highlights/points)
    if (action === 'richCheckInResponse') {
      const { checkIn, client, firstName = 'there', weightDelta = null, trainingTrend = null } = body;
      const result = await invokeClaude({
        expectJson: true,
        prompt: `You are an elite fitness coach writing a personalized check-in response to ${firstName}.

CHECK-IN DATA (submitted ${checkIn?.date}):
- Mood: ${checkIn?.mood || 'not provided'}
- Energy: ${checkIn?.energy_level || '—'}/10
- Stress: ${checkIn?.stress_level || '—'}/10
- Sleep: ${checkIn?.sleep_hours || '—'} hrs
- Training compliance: ${checkIn?.compliance_training ?? '—'}%${trainingTrend !== null ? ` (${trainingTrend >= 0 ? '+' : ''}${trainingTrend}% vs last week)` : ''}
- Nutrition compliance: ${checkIn?.compliance_nutrition ?? '—'}%
- Weight: ${checkIn?.weight || '—'} lbs${weightDelta !== null ? ` (${parseFloat(weightDelta) >= 0 ? '+' : ''}${weightDelta} lbs vs last)` : ''}
- Client notes: "${checkIn?.notes || 'none'}"

CLIENT CONTEXT:
- Goal: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}
- Status: ${client?.lifecycle_status || 'active'}

Write a personalized check-in response that:
1. Opens with genuine acknowledgment of their week (specific to their data)
2. Highlights 1-2 specific things that went well
3. Gives 1-2 clear coaching points for improvement
4. Ends with a motivating close

Tone: warm, specific, professional coach. 100-150 words. Use first name.

Return ONLY valid JSON: { "response": "...", "highlights": ["..."], "coaching_points": ["..."] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
