/**
 * Entity-event handlers (Migration Step 5c) — the logic of the five Base44
 * entity-automation trigger functions (onCheckInCreated, onCheckInResponded,
 * onClientCreated, onIntakeSubmitted, onWorkoutCompleted), re-platformed to be
 * driven by Postgres AFTER INSERT/UPDATE triggers → pg_net → the onEntityEvent
 * edge function (see 20260714000100_entity_event_triggers.sql).
 *
 * Message/notification writes go through the SHARED automation executors
 * (_shared/automationActions.js: sendMessage / notifyCoach) — the same write
 * paths runAutomations uses — NOT reimplementations. Emails go through the
 * injected `sendEmail` (prod: _shared/resendEmail.js sendResendEmail; the
 * rehearsal injects a recorder).
 *
 * Multi-tenant corrections vs the single-tenant Base44 originals (documented
 * in AUTOMATION_MIGRATION.md):
 *   - "notify all role=admin users" fallbacks become "notify the client's
 *     owning coach" (clients.user_id ?? created_by). There is no global-admin
 *     broadcast in a multi-tenant deployment.
 *   - onCheckInResponded's client-facing IN-APP notification is dropped:
 *     notifications.recipient_id references auth.users and portal clients
 *     have no auth identity (portal JWT only). The client-facing EMAIL — the
 *     primary channel — is preserved.
 *   - notifications.category values not in the schema CHECK are mapped:
 *     'client_activity' → 'client' (workout), 'intake' → 'client' (intake).
 *
 * Pure-ish module: all I/O goes through the injected `admin` client and
 * `sendEmail`, so the rehearsal exercises the REAL code against real Postgres.
 */
import { sendMessage, notifyCoach } from './automationActions.js';
import { analyzeCheckIn } from './progressAnalysis.js';
import {
  buildCheckInEmail, buildReviewedEmail, buildWelcomeEmail,
  buildNewClientCoachEmail, buildClientConfirmEmail, buildCoachNotifyEmail,
  buildWorkoutEmail,
} from './entityEventEmails.js';

async function getClient(admin, clientId) {
  if (!clientId) return null;
  const { data } = await admin.from('clients').select('*').eq('id', clientId).maybeSingle();
  return data ?? null;
}

async function getProfile(admin, userId) {
  if (!userId) return null;
  const { data } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data ?? null;
}

/** The owning coach of a client row (multi-tenant replacement for "admins"). */
function ownerOf(client) {
  return client?.user_id ?? client?.created_by ?? null;
}

// ── checkin.created ──────────────────────────────────────────────────────────
async function onCheckInCreated(admin, checkIn, deps) {
  const { sendEmail, appUrl } = deps;
  if (!checkIn) return { ok: true, skipped: 'no data' };

  const client = await getClient(admin, checkIn.client_id);
  const ownerId = ownerOf(client);
  if (!ownerId) return { ok: true, skipped: 'no owning coach' };
  const coach = await getProfile(admin, ownerId);

  const clientName = checkIn.client_name || client?.name || 'a client';

  await notifyCoach(admin, {
    recipient_id: ownerId,
    category: 'checkin',
    type: 'checkin_received',
    title: `New check-in from ${clientName} 📋`,
    body: checkIn.notes
      ? `"${checkIn.notes.slice(0, 80)}${checkIn.notes.length > 80 ? '…' : ''}"`
      : `Submitted on ${checkIn.date}`,
    client_name: clientName,
    action_label: 'Review',
    link: '/checkin-review',
    related_client_id: checkIn.client_id,
    related_checkin_id: checkIn.id,
    priority: 'normal',
  });

  let emails = 0;
  if (coach?.email) {
    const html = buildCheckInEmail({ name: clientName, id: checkIn.client_id }, checkIn, coach.full_name || 'Coach', appUrl);
    await sendEmail({
      to: coach.email, toName: coach.full_name,
      subject: `${clientName} submitted their check-in 📋`, html,
    });
    emails++;
  }
  // checkin.analyze — auto progress analysis (best-effort; see runCheckInAnalysis).
  const analysis = await runCheckInAnalysis(admin, checkIn, deps);
  return { ok: true, notified: 1, emails, analysis };
}

// ── checkin.analyze ──────────────────────────────────────────────────────────
// Port of base44 analyzeProgress: writes the AI check-in summary the coach's
// AICheckInSummaryCard reads (check_ins.ai_checkin_summary). Gated by the
// plan (NOT a counted generation); silently skipped when the plan lacks it / AI is unavailable. Never throws — the notification work above is the durable part.
async function runCheckInAnalysis(admin, checkIn, deps) {
  if (!deps.analysis) return { skipped: 'analysis not configured' };
  const client = await getClient(admin, checkIn?.client_id);
  const coach = await getProfile(admin, ownerOf(client));
  return analyzeCheckIn(admin, { checkIn, client, coach }, deps.analysis);
}

// ── checkin.responded (coach_responded false → true) ─────────────────────────
async function onCheckInResponded(admin, checkIn, oldCheckIn, { sendEmail, appUrl }) {
  // Defense in depth — the DB trigger's WHEN clause already gates this.
  if (!checkIn?.coach_responded || oldCheckIn?.coach_responded) {
    return { ok: true, skipped: 'not a respond transition' };
  }

  const client = await getClient(admin, checkIn.client_id);
  if (!client?.email) return { ok: true, skipped: 'no client email' };

  const coach = await getProfile(admin, ownerOf(client));
  const coachName = coach?.full_name || 'Your Coach';

  // Base44 also wrote a client-facing in-app Notification here; dropped —
  // portal clients have no auth.users identity (see module doc).
  await sendEmail({
    to: client.email, toName: client.name,
    subject: `${coachName} reviewed your check-in ✓`,
    html: buildReviewedEmail(client, checkIn, coachName, appUrl),
    replyTo: coach?.email,
  });
  return { ok: true, emails: 1 };
}

// ── client.created ───────────────────────────────────────────────────────────
async function onClientCreated(admin, client, { sendEmail, appUrl }) {
  if (!client?.id) return { ok: true, skipped: 'no client data' };

  const ownerId = ownerOf(client);
  const coach = await getProfile(admin, ownerId);

  // Coach defaults, scoped to the owning coach (Base44 read the single
  // tenant-wide CoachDefaults row).
  let defaults = null;
  if (ownerId) {
    const { data } = await admin.from('coach_defaults').select('*')
      .or(`coach_id.eq.${ownerId},created_by.eq.${ownerId}`).limit(1);
    defaults = data?.[0] ?? null;
  }

  const updates = {};
  const autoAssignEnabled = defaults?.auto_assign_enabled ?? true;
  if (autoAssignEnabled) {
    if (defaults?.default_program_id && !client.assigned_program_id) {
      updates.assigned_program_id = defaults.default_program_id;
    }
    if (defaults?.default_nutrition_id && !client.assigned_nutrition_id) {
      updates.assigned_nutrition_id = defaults.default_nutrition_id;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from('clients').update(updates).eq('id', client.id);
      if (error) throw new Error(`auto-assign: ${error.message}`);
    }
  }

  // Welcome message (also gated by the master toggle) — via the SHARED
  // sendMessage executor, matching Base44's Message.create payload.
  if (autoAssignEnabled && defaults?.send_welcome_message && defaults.welcome_message) {
    await sendMessage(admin, {
      client_id: client.id,
      client_name: client.name,
      sender: 'coach',
      content: defaults.welcome_message,
      tag: 'general',
      created_by: ownerId ?? undefined,
    });
  }

  if (ownerId) {
    await notifyCoach(admin, {
      recipient_id: ownerId,
      category: 'client',
      type: 'new_client',
      title: `New client: ${client.name} 🎉`,
      body: `${client.name} has been added. ${Object.keys(updates).length > 0 ? 'Plans auto-assigned.' : ''}`,
      client_name: client.name,
      action_label: 'View Profile',
      link: `/client-profile?id=${client.id}`,
      priority: 'normal',
    });
  }

  let emails = 0;
  if (coach?.email) {
    await sendEmail({
      to: coach.email, toName: coach.full_name,
      subject: `${client.name} just joined your roster! 💪`,
      html: buildNewClientCoachEmail(client, coach.full_name || 'Coach', appUrl),
    });
    emails++;
  }
  if (client.email) {
    const coachName = coach?.full_name || 'Your Coach';
    await sendEmail({
      to: client.email, toName: client.name,
      subject: `Welcome to ${coachName}'s coaching! Your journey starts now 💪`,
      html: buildWelcomeEmail(client, coachName, appUrl),
      replyTo: coach?.email,
    });
    emails++;
  }

  return { ok: true, updates_applied: updates, emails };
}

// ── intake.submitted ─────────────────────────────────────────────────────────
async function onIntakeSubmitted(admin, intake, { sendEmail, appUrl, now }) {
  if (!intake?.email || !intake?.name) return { ok: true, skipped: 'missing name/email' };

  const coach = await getProfile(admin, intake.coach_id);
  const coachName = coach?.full_name || 'Your Coach';
  const submittedAt = intake.created_at || (now ?? new Date()).toISOString();

  // 1. Confirmation email to the prospect
  await sendEmail({
    to: intake.email,
    subject: `You're in, ${intake.name} — intake received ✅`,
    html: buildClientConfirmEmail({ clientName: intake.name, coachName }, appUrl),
  });
  let emails = 1;

  // 2. Notification email to the coach
  if (coach?.email) {
    await sendEmail({
      to: coach.email,
      subject: `New intake from ${intake.name} — pending review 📋`,
      html: buildCoachNotifyEmail({
        coachName, clientName: intake.name, clientEmail: intake.email, submittedAt,
      }, appUrl),
    });
    emails++;
  }

  // 3. In-app notification for the coach (Base44 category 'intake' → 'client')
  if (coach?.id) {
    await notifyCoach(admin, {
      recipient_id: coach.id,
      category: 'client',
      type: 'intake_submitted',
      title: `New intake from ${intake.name} 📋`,
      body: `${intake.name} (${intake.email}) completed your intake form and is pending review.`,
      client_name: intake.name,
      action_label: 'Review',
      link: '/onboarding-manager',
      priority: 'high',
    });
  }

  return { ok: true, emails, notified: coach ? 1 : 0 };
}

// ── workout.completed ────────────────────────────────────────────────────────
async function onWorkoutCompleted(admin, session, { sendEmail, appUrl }) {
  if (!session?.client_id) return { ok: true, skipped: 'no client_id' };
  if (session.status !== 'completed') return { ok: true, skipped: 'not completed' };

  const client = await getClient(admin, session.client_id);
  if (!client) return { ok: true, skipped: 'client not found' };
  const clientName = client.name || 'A client';

  const ownerId = ownerOf(client);
  if (!ownerId) return { ok: true, skipped: 'no owning coach' };
  const coach = await getProfile(admin, ownerId);

  const workout = session.workout_day_name || 'Workout';

  // Base44 category 'client_activity' is not in the notifications CHECK → 'client'
  await notifyCoach(admin, {
    recipient_id: ownerId,
    category: 'client',
    type: 'workout_completed',
    title: `💪 ${clientName} completed a workout`,
    body: `${workout}${session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}${session.session_rating ? ` · Rating ${session.session_rating}/10` : ''}`,
    client_name: clientName,
    action_label: 'View Progress',
    link: '/progress',
    related_client_id: session.client_id,
    priority: 'normal',
  });

  let emails = 0;
  if (coach?.email) {
    await sendEmail({
      to: coach.email, toName: coach.full_name,
      subject: `💪 ${clientName} just completed ${workout}`,
      html: buildWorkoutEmail(clientName, session, coach.full_name || 'Coach', appUrl),
    });
    emails++;
  }
  return { ok: true, notified: 1, emails };
}

/**
 * Dispatch one entity event. `event` is the trigger payload:
 *   { event_type, record, old_record } — event_key is handled by the caller
 * (claim/release ledger in onEntityEvent/index.ts).
 */
export async function handleEntityEvent(admin, event, deps) {
  const { event_type, record, old_record } = event;
  switch (event_type) {
    case 'checkin.created': return onCheckInCreated(admin, record, deps);
    case 'checkin.analyze': return runCheckInAnalysis(admin, record, deps);
    case 'checkin.responded': return onCheckInResponded(admin, record, old_record, deps);
    case 'client.created': return onClientCreated(admin, record, deps);
    case 'intake.submitted': return onIntakeSubmitted(admin, record, deps);
    case 'workout.completed': return onWorkoutCompleted(admin, record, deps);
    default: return { ok: false, error: `Unknown event_type: ${event_type}` };
  }
}
