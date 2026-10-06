/**
 * Friday check-in/workout reminder logic (Step 5e) — port of
 * base44/functions/sendCheckInReminders, in _shared so the edge function and
 * the rehearsal run the same code.
 *
 * Multi-tenant corrections vs Base44 (which loaded ALL clients and notified
 * "all admins"):
 *   - each client's nudge notification goes to their OWNING coach only,
 *   - the client's own in-app copy goes to their portal identity
 *     (clients.portal_user_id) when linked — Base44 used the email as
 *     recipient_id, which the ported notifications FK can't represent,
 *   - IDEMPOTENCY (new): a client who already received a friday_reminder
 *     notification this week is skipped, so an at-least-once scheduler
 *     (pg_cron + pg_net retries, manual re-runs) can never double-email.
 *
 * Notification writes reuse the shared notifyCoach executor; email goes
 * through the injected `sendEmail` (production: _shared/resendEmail.js).
 */
import { notifyCoach } from './automationActions.js';
import { escapeHtml } from './escapeHtml.js';

export function startOfCurrentWeek(now = new Date()) {
  const day = now.getUTCDay(); // 0=Sun, 1=Mon …
  const diff = day === 0 ? -6 : 1 - day; // roll back to Monday
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() + diff);
  mon.setUTCHours(0, 0, 0, 0);
  return mon;
}

export function buildReminderEmail({ clientName, missedCheckin, missedWorkout }, appUrl) {
  const items = [];
  if (missedCheckin) items.push({ icon: '📋', label: 'Weekly Check-in', sub: 'Your coach reviews your progress every week — this is key to results.', link: `${appUrl}/portal/checkin`, cta: 'Submit Check-in' });
  if (missedWorkout) items.push({ icon: '🏋️', label: 'Workout This Week', sub: "Don't let the week slip by without getting a session in.", link: `${appUrl}/portal/workouts`, cta: 'View Workouts' });

  const cards = items.map((item) => `
    <tr><td style="padding:14px 20px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;margin-bottom:12px;display:block;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:22px;width:36px;vertical-align:middle;">${item.icon}</td>
          <td style="padding-left:12px;vertical-align:middle;">
            <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0F172A;">${item.label}</p>
            <p style="margin:0;font-size:13px;color:#64748B;">${item.sub}</p>
          </td>
        </tr>
        <tr><td colspan="2" style="padding-top:12px;">
          <a href="${item.link}" style="display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;">${item.cta} →</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="height:10px;"></td></tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
  <tr><td style="padding:28px 36px;background:#0F172A;">
    <span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">KOACH AI</span>
  </td></tr>
  <tr><td style="padding:32px 36px 24px;">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0F172A;letter-spacing:-0.5px;">⏰ Friday reminder, ${escapeHtml(String(clientName || 'there').split(' ')[0])}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
      The week's almost over — here's what still needs your attention before the weekend:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${cards}</table>
    <p style="margin:24px 0 0;font-size:14px;color:#64748B;line-height:1.7;">
      Consistency is everything. Your coach is in your corner — let's finish the week strong. 💪
    </p>
  </td></tr>
  <tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
    <p style="margin:0;font-size:12px;color:#94A3B8;">© KOACH AI · <a href="${appUrl}" style="color:#94A3B8;text-decoration:none;">koachai.net</a> · You're receiving this as part of your coaching program.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

/** Run the Friday reminder sweep. Returns { count, remindersSent, skippedIdempotent, failed }. */
export async function runCheckinReminders(admin, { sendEmail, appUrl, now = new Date() }) {
  const weekStart = startOfCurrentWeek(now);
  const weekStartIso = weekStart.toISOString();

  const [{ data: clients }, { data: allCheckIns }, { data: allSessions }, { data: priorReminders }] = await Promise.all([
    admin.from('clients').select('*').eq('lifecycle_status', 'active'),
    admin.from('check_ins').select('client_id, date').gte('date', weekStartIso.slice(0, 10)),
    admin.from('workout_sessions').select('client_id, completed_at, status').gte('completed_at', weekStartIso),
    // either notification type marks the client as handled this week — the
    // client-facing one only exists when a portal identity is linked, the
    // coach nudge whenever an owner exists, so checking both makes the
    // dedupe hold for every client shape
    admin.from('notifications').select('related_client_id')
      .in('type', ['friday_reminder', 'client_friday_reminder']).gte('created_at', weekStartIso),
  ]);

  const alreadyReminded = new Set((priorReminders ?? []).map((n) => n.related_client_id));
  const remindersSent = [];
  let skippedIdempotent = 0;
  let failed = 0;

  for (const client of clients ?? []) {
    if (!client.email) continue;

    // Idempotency: one reminder per client per week, however often the
    // scheduler fires.
    if (alreadyReminded.has(client.id)) { skippedIdempotent++; continue; }

    const hasCheckin = (allCheckIns ?? []).some((ci) => ci.client_id === client.id);
    const hasWorkout = (allSessions ?? []).some((ws) =>
      ws.client_id === client.id && ws.completed_at && ws.status === 'completed');

    const missedCheckin = !hasCheckin;
    const missedWorkout = !hasWorkout;
    if (!missedCheckin && !missedWorkout) continue;

    const subject = missedCheckin && missedWorkout
      ? '⏰ Quick reminder: check-in & workout still pending'
      : missedCheckin
        ? "⏰ Don't forget your weekly check-in"
        : "⏰ You've still got time for a workout this week";

    const sendResult = await sendEmail({
      to: client.email, toName: client.name,
      subject,
      html: buildReminderEmail({ clientName: client.name, missedCheckin, missedWorkout }, appUrl),
    });
    // Only record the reminder (these notifications double as the weekly
    // dedupe marker) when the email actually went out — otherwise a mailer
    // outage would silently suppress this week's reminder on retry.
    if (!sendResult?.ok) {
      failed++;
      console.error('[checkinReminders] email send failed for client', client.id, sendResult?.error);
      continue;
    }

    // In-app copy to the client's portal identity (when linked)
    if (client.portal_user_id) {
      await notifyCoach(admin, {
        recipient_id: client.portal_user_id,
        category: 'system',
        type: 'friday_reminder',
        title: 'Friday reminder ⏰',
        body: [
          missedCheckin && "You haven't submitted your weekly check-in yet.",
          missedWorkout && "You haven't logged a workout this week.",
        ].filter(Boolean).join(' '),
        link: missedCheckin ? '/portal/checkin' : '/portal/workouts',
        related_client_id: client.id,
        priority: 'high',
      });
    }

    // Nudge to the OWNING coach only (Base44 blasted all admins)
    const ownerId = client.user_id ?? client.created_by;
    if (ownerId) {
      await notifyCoach(admin, {
        recipient_id: ownerId,
        category: 'system',
        type: 'client_friday_reminder',
        title: `${client.name} needs a nudge 📌`,
        body: [
          missedCheckin && 'No check-in this week.',
          missedWorkout && 'No workout logged this week.',
        ].filter(Boolean).join(' '),
        link: '/checkin-review',
        related_client_id: client.id,
        priority: 'normal',
      });
    }

    remindersSent.push({ name: client.name, missedCheckin, missedWorkout });
  }

  return { count: remindersSent.length, remindersSent, skippedIdempotent, failed };
}
