// Supabase Edge Function: weeklyDigest  (Migration Step 5b)
//
// Port of base44/functions/weeklyDigest. The inline 0–10 priorityScore + churn
// logic is REMOVED and replaced by the shared source-of-truth risk model
// (_shared/weeklyDigest.js → getAtRiskClients, 0–100). Any authenticated coach
// gets a digest of THEIR OWN clients (Step 6 replaced Base44's single-tenant
// 'admin' gate with per-coach scoping). The email language was updated for the
// new scale ("Risk score: N/100", not "N/10").
// No scoring logic lives in this file — it only loads data, calls the shared
// builder, and sends the email.
//
// Two callers:
//   - a coach session  → that coach's own digest (unchanged behavior);
//   - the service-role key (pg_cron) → a sweep that sends every coach who owns
//     clients their own digest. Body { dry_run: true } builds the digests but
//     sends nothing (used to verify the schedule without emailing anyone).
// verify_jwt is off for this function (config.toml): the service key is not a
// JWT, so both paths authenticate in-function.
import { getCaller, serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { buildWeeklyDigest, renderDigestEmail } from '../_shared/weeklyDigest.js';

const COACH_TIPS = [
  'Send a voice message instead of text this week — clients love the personal touch.',
  'Review your least-engaged client and schedule a surprise check-in call.',
  "Consider updating a client's program — stale programs reduce adherence by up to 30%.",
  'Ask one client to share a progress photo — it boosts their accountability significantly.',
  'A personalized win acknowledgment takes 30 seconds and dramatically improves retention.',
];

function isServiceRoleCall(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey) && token === serviceKey;
}

// Build (and unless dryRun, email) one coach's digest of their own clients.
async function sendDigestFor(svc, coach: { id: string; email?: string | null }, now: Date, dryRun: boolean) {
  const uid = coach.id;
  const { data: clients } = await svc.from('clients').select('*')
    .or(`user_id.eq.${uid},created_by.eq.${uid}`)
    .order('created_at', { ascending: false });
  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: checkIns } = clientIds.length
    ? await svc.from('check_ins').select('*')
        .in('client_id', clientIds)
        .order('date', { ascending: false }).limit(200)
    : { data: [] };

  const digest = buildWeeklyDigest(clients ?? [], checkIns ?? [], now);
  const tip = COACH_TIPS[now.getDay() % COACH_TIPS.length];
  const appUrl = Deno.env.get('APP_URL') || 'https://app.koachai.net';
  const emailHtml = renderDigestEmail(digest, { tip, appUrl });

  let sent = false;
  if (coach.email && !dryRun) {
    // functions.invoke resolves to { data, error } and does NOT throw on a
    // non-2xx — only count the digest as sent when there is no error.
    try {
      const { error } = await svc.functions.invoke('sendEmailNotification', {
        body: {
          to: coach.email,
          subject: `🧠 Your Weekly AI Coaching Digest — ${digest.week_of}`,
          html: emailHtml,
        },
      });
      if (error) console.error('[weeklyDigest] send failed for coach', uid, error?.message ?? error);
      else sent = true;
    } catch (e) {
      console.error('[weeklyDigest] send threw for coach', uid, (e as Error)?.message ?? e);
    }
  }
  return { digest, sent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const svc = serviceClient();
    const now = new Date();

    // ── Scheduled sweep (pg_cron, service-role key) ───────────────────────────
    if (isServiceRoleCall(req)) {
      let dryRun = false;
      try { dryRun = (await req.json())?.dry_run === true; } catch { /* no body */ }

      // A "coach" for digest purposes = any profile that owns at least one client.
      const { data: owners } = await svc.from('clients').select('user_id, created_by');
      const coachIds = [...new Set((owners ?? []).map((o) => o.user_id ?? o.created_by).filter(Boolean))];
      const { data: coaches } = coachIds.length
        ? await svc.from('profiles').select('id, email').in('id', coachIds)
        : { data: [] };

      let sent = 0;
      for (const coach of coaches ?? []) {
        const r = await sendDigestFor(svc, coach, now, dryRun);
        if (r.sent) sent++;
      }
      return jsonResponse({ success: true, mode: 'sweep', dry_run: dryRun, coaches: (coaches ?? []).length, sent });
    }

    // ── Coach-initiated (own digest) ──────────────────────────────────────────
    // Step 6 follow-up: Base44's 'admin' gate meant "the coach" in the
    // single-tenant app. Under the RBAC split ('admin' = platform staff,
    // coaches = 'user') that gate made the digest unreachable for every
    // coach — and the service-role read below pulled ALL clients, so a
    // staff caller would have been emailed a CROSS-TENANT digest. Every
    // coach now gets a digest of THEIR OWN clients only.
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { digest } = await sendDigestFor(svc, { id: caller.profile.id, email: caller.profile.email }, now, false);
    return jsonResponse({ success: true, digest });
  } catch (error) {
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
