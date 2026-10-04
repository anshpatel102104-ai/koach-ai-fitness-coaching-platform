import { db } from '@/api/supabaseClient';

export const sendZapierEvent = async (eventType, data) => {
  const settings = await db.entities.CoachSettings.list();
  const webhookUrl = settings[0]?.zapier_webhook_url;
  const enabledEvents = settings[0]?.zapier_events || [];

  if (!webhookUrl || !enabledEvents.includes(eventType)) return;

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    app: 'KOACH AI',
    data,
  };

  let success = true;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // Update last triggered
    if (settings[0]?.id) {
      await db.entities.CoachSettings.update(settings[0].id, {
        zapier_last_triggered: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Zapier webhook failed:', err);
    success = false;
  }

  // Log the event
  try {
    await db.entities.ZapierLog.create({
      event_type: eventType,
      client_id: data?.client_id || '',
      client_name: data?.client_name || '',
      payload: JSON.stringify(payload),
      sent_at: new Date().toISOString(),
      success,
    });
  } catch (e) {
    // silently fail logging
  }
};