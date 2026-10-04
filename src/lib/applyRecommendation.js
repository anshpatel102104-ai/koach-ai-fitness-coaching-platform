/**
 * Shared utility to execute a recommendation action against the database.
 * Returns a human-readable success message.
 */
import { db } from '@/api/supabaseClient';

export async function applyRecommendation(rec, checkIn, client) {
  if (rec.action === 'adjust_calories') {
    if (!client?.assigned_nutrition_id) throw new Error('No nutrition plan assigned to this client');
    const plans = await db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id });
    const plan = plans[0];
    if (!plan) throw new Error('Nutrition plan not found');
    const newCals = Math.max(1000, (plan.calories || 2000) + rec.actionData.delta);
    await Promise.all([
      db.entities.NutritionPlan.update(plan.id, { calories: newCals }),
      db.entities.Message.create({
        client_id: checkIn.client_id,
        client_name: checkIn.client_name,
        sender: 'coach',
        content: `Your daily calorie target has been updated to ${newCals} kcal (${rec.actionData.delta > 0 ? '+' : ''}${rec.actionData.delta} kcal based on your progress).`,
        tag: 'nutrition',
        is_read: false,
      }),
    ]);
    return `Calories set to ${newCals} kcal ✓`;
  }

  if (rec.action === 'adjust_cardio') {
    const msg = rec.actionData.direction === 'up'
      ? 'Cardio increased — add 1 extra session or +20 min this week.'
      : 'Cardio reduced — drop 1 session or −15 min this week.';
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, {
        coach_notes: (checkIn.coach_notes ? checkIn.coach_notes + '\n' : '') + '[Cardio] ' + msg,
        coach_responded: true,
      }),
      db.entities.Message.create({
        client_id: checkIn.client_id,
        client_name: checkIn.client_name,
        sender: 'coach',
        content: msg,
        tag: 'training',
        is_read: false,
      }),
    ]);
    return `Cardio ${rec.actionData.direction === 'up' ? 'increased' : 'reduced'} ✓`;
  }

  if (rec.action === 'message') {
    await db.entities.Message.create({
      client_id: checkIn.client_id,
      client_name: checkIn.client_name,
      sender: 'coach',
      content: rec.actionData.content,
      tag: rec.actionData.tag || 'general',
      is_read: false,
    });
    return 'Message sent ✓';
  }

  if (rec.action === 'maintain') {
    await db.entities.CheckIn.update(checkIn.id, { coach_responded: true });
    return 'Marked as reviewed ✓';
  }

  return 'Done ✓';
}

/**
 * Returns a short confirmation description for a recommendation action.
 */
export function getConfirmText(rec) {
  if (rec.action === 'adjust_calories') {
    const sign = rec.actionData.delta > 0 ? '+' : '';
    return `Adjust daily calories by ${sign}${rec.actionData.delta} kcal and notify the client?`;
  }
  if (rec.action === 'adjust_cardio') {
    return rec.actionData.direction === 'up'
      ? 'Increase cardio by 1 session (+20 min/week) and notify the client?'
      : 'Decrease cardio by 1 session (−15 min/week) and notify the client?';
  }
  if (rec.action === 'message') {
    return 'Send this message to the client?';
  }
  if (rec.action === 'maintain') {
    return 'Mark this check-in as reviewed?';
  }
  return 'Apply this recommendation?';
}