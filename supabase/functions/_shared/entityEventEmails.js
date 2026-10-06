/**
 * HTML email builders for the Step 5c entity-event functions — ported
 * VERBATIM from the five Base44 trigger functions (onCheckInCreated,
 * onCheckInResponded, onClientCreated, onIntakeSubmitted, onWorkoutCompleted).
 * Only the hard-coded APP_URL constants (which disagreed across the Base44
 * files: app.koachai.com vs koachai.net) are unified behind the appUrl
 * argument (env APP_URL, same convention as weeklyDigest).
 */
import { escapeHtml } from './escapeHtml.js';

const firstName = (name) => escapeHtml(String(name || '').split(' ')[0]);

// ── onCheckInCreated ─────────────────────────────────────────────────────────
export function buildCheckInEmail(client, checkIn, coachName, appUrl) {
  const rows = [
    checkIn?.weight ? `<tr><td style="padding:12px 18px;font-size:14px;color:#64748B;border-bottom:1px solid #F1F5F9;">Weight</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;border-bottom:1px solid #F1F5F9;">${escapeHtml(checkIn.weight)} lbs</td></tr>` : '',
    checkIn?.compliance_training ? `<tr><td style="padding:12px 18px;font-size:14px;color:#64748B;border-bottom:1px solid #F1F5F9;">Training Compliance</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#2563EB;text-align:right;border-bottom:1px solid #F1F5F9;">${escapeHtml(checkIn.compliance_training)}%</td></tr>` : '',
    checkIn?.compliance_nutrition ? `<tr><td style="padding:12px 18px;font-size:14px;color:#64748B;border-bottom:1px solid #F1F5F9;">Nutrition Compliance</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;border-bottom:1px solid #F1F5F9;">${escapeHtml(checkIn.compliance_nutrition)}%</td></tr>` : '',
    checkIn?.mood ? `<tr><td style="padding:12px 18px;font-size:14px;color:#64748B;">Mood</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;">${escapeHtml(checkIn.mood)}</td></tr>` : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
<tr><td style="padding:24px 36px 18px;background:#0F172A;"><span style="font-size:18px;font-weight:900;color:#fff;">KOACH AI</span></td></tr>
<tr><td style="padding:28px 36px 20px;background:linear-gradient(160deg,#0F172A,#1E293B);">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;">📋 New Check-in from ${firstName(client?.name)}</h1>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);">Review and respond to keep your client motivated.</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;"><strong>${escapeHtml(client?.name)}</strong> just submitted their check-in.</p>
  ${rows ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin:16px 0;">${rows}</table>` : ''}
  ${checkIn?.notes ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 18px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${escapeHtml(checkIn.notes.slice(0, 200))}"</p></div>` : ''}
  <table cellpadding="0" cellspacing="0" style="margin:20px 0 0;"><tr><td style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;">
    <a href="${appUrl}/checkin-review" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">Review Check-in →</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
  <p style="margin:0;font-size:12px;color:#94A3B8;">${escapeHtml(coachName)} · KOACH AI · <a href="${appUrl}/unsubscribe" style="color:#94A3B8;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── onCheckInResponded ───────────────────────────────────────────────────────
export function buildReviewedEmail(client, checkIn, coachName, appUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
<tr><td style="padding:24px 36px 18px;background:#0F172A;"><span style="font-size:18px;font-weight:900;color:#fff;">KOACH AI</span></td></tr>
<tr><td style="padding:28px 36px 20px;background:linear-gradient(160deg,#0F172A,#1E293B);">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;">✓ Coach Reviewed Your Check-in</h1>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);">${escapeHtml(coachName)} left you personalized feedback.</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName(client?.name)},</p>
  ${checkIn?.coach_notes ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:18px 20px;margin:0 0 18px;"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151;">💬 ${escapeHtml(coachName)}'s feedback:</p><p style="margin:0;font-size:15px;color:#374151;font-style:italic;line-height:1.7;">"${escapeHtml(checkIn.coach_notes)}"</p></div>` : ''}
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Keep up the amazing work!</p>
  <table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;">
    <a href="${appUrl}/portal/checkin" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">View Full Feedback →</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
  <p style="margin:0;font-size:12px;color:#94A3B8;">${escapeHtml(coachName)} · KOACH AI · <a href="${appUrl}/unsubscribe" style="color:#94A3B8;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── onClientCreated (client welcome) ─────────────────────────────────────────
export function buildWelcomeEmail(client, coachName, appUrl) {
  const portalUrl = `${appUrl}/portal`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
<tr><td style="padding:24px 36px 18px;background:#0F172A;"><span style="font-size:18px;font-weight:900;color:#fff;">KOACH AI</span></td></tr>
<tr><td style="padding:28px 36px 20px;background:linear-gradient(160deg,#0F172A,#1E293B);">
  <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#fff;">🎉 Welcome, ${firstName(client?.name)}!</h1>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);">${escapeHtml(coachName)} is ready to help you reach your goals.</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName(client?.name)},</p>
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">I'm so excited to have you on board! Here's what to do first:</p>
  <div style="background:#F8FAFC;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
    <p style="margin:0 0 12px;font-size:14px;"><strong style="color:#0F172A;">1. Access your portal</strong> <span style="color:#64748B;">— Log in to see your personalized plan</span></p>
    <p style="margin:0 0 12px;font-size:14px;"><strong style="color:#0F172A;">2. Complete your profile</strong> <span style="color:#64748B;">— Add measurements and fitness goals</span></p>
    <p style="margin:0;font-size:14px;"><strong style="color:#0F172A;">3. Check your program</strong> <span style="color:#64748B;">— Your training plan is ready to go!</span></p>
  </div>
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Any questions? Just reply to this email — I'm here for you every step of the way! 💪</p>
  <p style="margin:0;font-size:15px;color:#64748B;font-style:italic;">— ${escapeHtml(coachName)}</p>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;"><tr><td style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;">
    <a href="${portalUrl}" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">Access My Portal →</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
  <p style="margin:0;font-size:12px;color:#94A3B8;">${escapeHtml(coachName)} · KOACH AI · <a href="${appUrl}/unsubscribe" style="color:#94A3B8;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── onClientCreated (coach notification) ─────────────────────────────────────
export function buildNewClientCoachEmail(client, coachName, appUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
<tr><td style="padding:24px 36px 18px;background:#0F172A;"><span style="font-size:18px;font-weight:900;color:#fff;">KOACH AI</span></td></tr>
<tr><td style="padding:28px 36px 20px;background:linear-gradient(160deg,#0F172A,#1E293B);">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;">💪 New Client Joined!</h1>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);">${escapeHtml(client?.name)} has been added to your roster.</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:18px 20px;margin:0 0 18px;">
    <p style="margin:0 0 4px;font-size:17px;font-weight:900;color:#0F172A;">${escapeHtml(client?.name)}</p>
    <p style="margin:0;font-size:13px;color:#64748B;">${escapeHtml(client?.email || '—')}</p>
  </div>
  <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.7;">Next step: assign them a program and send a welcome message to kick things off right! 🚀</p>
  <table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;">
    <a href="${appUrl}/clients" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">View Client Profile →</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
  <p style="margin:0;font-size:12px;color:#94A3B8;">${escapeHtml(coachName)} · KOACH AI · <a href="${appUrl}/unsubscribe" style="color:#94A3B8;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── onIntakeSubmitted (client confirmation) ──────────────────────────────────
export function buildClientConfirmEmail({ clientName, coachName }, appUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
  <tr><td style="padding:28px 36px;background:#0F172A;">
    <span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">KOACH AI</span>
  </td></tr>
  <tr><td style="padding:36px 36px 24px;">
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#0F172A;letter-spacing:-0.5px;">You're in! 🎉</h1>
    <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">
      Hey <strong>${escapeHtml(clientName)}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      Thanks for completing your intake — your application has been received and is now in your coach's hands.
    </p>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em;">What happens next</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${['Your coach reviews your full intake profile.', 'A personalized training & nutrition plan gets built for you.', `${escapeHtml(coachName || 'Your coach')} will reach out to you within 24 hours to get started.`].map((step, i) => `
        <tr>
          <td style="padding:6px 0;vertical-align:top;width:28px;">
            <div style="width:22px;height:22px;background:#2563EB;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:800;color:#fff;">${i + 1}</div>
          </td>
          <td style="padding:6px 0 6px 10px;font-size:14px;color:#374151;line-height:1.6;">${step}</td>
        </tr>`).join('')}
      </table>
    </div>
    <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.7;">
      In the meantime, sit tight — your transformation is about to begin. If you have any questions, just reply to this email.
    </p>
  </td></tr>
  <tr><td style="padding:20px 36px 28px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
    <p style="margin:0;font-size:12px;color:#94A3B8;">© KOACH AI · <a href="${appUrl}" style="color:#94A3B8;text-decoration:none;">koachai.net</a> · This email was sent to confirm your coaching intake submission.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

// ── onIntakeSubmitted (coach notification) ───────────────────────────────────
export function buildCoachNotifyEmail({ coachName, clientName, clientEmail, submittedAt }, appUrl) {
  const date = new Date(submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
  <tr><td style="padding:28px 36px;background:#0F172A;">
    <span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">KOACH AI</span>
  </td></tr>
  <tr><td style="padding:36px 36px 28px;">
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0F172A;letter-spacing:-0.5px;">📋 New Intake Submitted</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">Received ${date}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      Hey ${escapeHtml(coachName || 'Coach')} — <strong>${escapeHtml(clientName)}</strong> just completed your client intake form and is pending review.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6B7280;border-bottom:1px solid #F1F5F9;">Client</td>
          <td style="padding:8px 0;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border-bottom:1px solid #F1F5F9;">${escapeHtml(clientName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6B7280;">Email</td>
          <td style="padding:8px 0;font-size:13px;color:#0F172A;text-align:right;">${escapeHtml(clientEmail)}</td>
        </tr>
      </table>
    </div>
    <table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:10px;">
      <a href="${appUrl}/onboarding-manager" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">Review Intake →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
    <p style="margin:0;font-size:12px;color:#94A3B8;">KOACH AI · <a href="${appUrl}" style="color:#94A3B8;text-decoration:none;">koachai.net</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

// ── onWorkoutCompleted ───────────────────────────────────────────────────────
export function buildWorkoutEmail(clientName, session, coachName, appUrl) {
  const rating   = session.session_rating ? `${escapeHtml(session.session_rating)}/10` : '—';
  const duration = session.duration_minutes ? `${escapeHtml(session.duration_minutes)} min` : '—';
  const workout  = escapeHtml(session.workout_day_name || 'Workout');
  const note     = String(session.session_note || '');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="height:4px;background:linear-gradient(135deg,#2563EB,#7C3AED);"></td></tr>
<tr><td style="padding:24px 36px 18px;background:#0F172A;"><span style="font-size:18px;font-weight:900;color:#fff;">KOACH AI</span></td></tr>
<tr><td style="padding:28px 36px 20px;background:linear-gradient(160deg,#0F172A,#1E293B);">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;">💪 ${firstName(clientName)} crushed a workout!</h1>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);">Your client just logged a completed session.</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;"><strong>${escapeHtml(clientName)}</strong> completed <strong>${workout}</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin:0 0 16px;">
    <tr><td style="padding:12px 18px;font-size:14px;color:#64748B;border-bottom:1px solid #F1F5F9;">Session</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;border-bottom:1px solid #F1F5F9;">${workout}</td></tr>
    <tr><td style="padding:12px 18px;font-size:14px;color:#64748B;border-bottom:1px solid #F1F5F9;">Duration</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#2563EB;text-align:right;border-bottom:1px solid #F1F5F9;">${duration}</td></tr>
    <tr><td style="padding:12px 18px;font-size:14px;color:#64748B;">Difficulty Rating</td><td style="padding:12px 18px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;">${rating}</td></tr>
  </table>
  ${note ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 18px;margin:0 0 20px;"><p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${escapeHtml(note.slice(0, 200))}"</p></div>` : ''}
  <table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;">
    <a href="${appUrl}/clients" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">View Client Progress →</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 36px 20px;background:#F8FAFC;border-top:1px solid #F1F5F9;">
  <p style="margin:0;font-size:12px;color:#94A3B8;">${escapeHtml(coachName)} · KOACH AI</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
