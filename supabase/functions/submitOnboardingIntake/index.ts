// Supabase Edge Function: submitOnboardingIntake  (Migration Step 5c)
//
// Re-platform of base44/functions/submitOnboardingIntake — the PUBLIC intake
// endpoint the client onboarding flow posts to (no session yet: the prospect
// isn't a user). Writes go through the service role, matching Base44's
// asServiceRole.entities.OnboardingResponse.create. Deploy with
// --no-verify-jwt (like validateInviteToken) so anonymous prospects can submit.
//
// Schema-fit notes vs the Base44 version (which was schema-less):
//   - previous_experience now has a CHECK constraint; the form's
//     'intermediate' option is mapped to 'experienced' (1–3 yrs consistent
//     training), everything unknown is folded into schedule_preferences
//     rather than risking a constraint violation.
//   - goal/activity_level maps are unchanged from Base44.
import { serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
// Row mapping lives in _shared so the local rehearsal builds the SAME row
// and proves it satisfies the new CHECK constraints.
import { buildIntakeRow } from '../_shared/intakeMapping.js';
// No inline confirmation email here: the AFTER INSERT trigger on
// onboarding_responses fires 'intake.submitted' → _shared/entityEvents.js
// onIntakeSubmitted, which already sends the HTML confirmation to the
// prospect AND the coach notification. Sending one here too double-emailed.

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@<>"',;()\\]+@[^\s@<>"',;()\\]+\.[^\s@<>"',;()\\]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_EMAIL_PER_WINDOW = 3;
const MAX_PER_COACH_PER_WINDOW = 30;

// ilike treats % and _ as wildcards; escape so the email match is exact.
function exactIlike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function validName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (!name || name.length > NAME_MAX) return null;
  if (/[<>]/.test(name) || /http|www\./i.test(name)) return null;
  return name;
}

function validEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim();
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) return null;
  return email;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    let payload;
    try { payload = await req.json(); } catch { payload = null; }
    const { name: rawName, email: rawEmail, coachId, formData } = payload ?? {};

    const name = validName(rawName);
    const email = validEmail(rawEmail);
    if (!name || !email) {
      return jsonResponse({ success: false, error: 'Please provide a valid name and email address.' }, 400);
    }

    // coachId is required and must name an existing profile — an unrouted
    // intake is invisible to every coach (RLS) and only useful for abuse.
    // NOTE: OnboardingManager's share link currently passes the coach's EMAIL
    // (?coach=<email>), so accept either a profile UUID or a profile email.
    const coachKey = typeof coachId === 'string' ? coachId.trim() : '';
    const coachIsUuid = UUID_RE.test(coachKey);
    if (!coachIsUuid && !(coachKey.length <= EMAIL_MAX && EMAIL_RE.test(coachKey))) {
      return jsonResponse({ success: false, error: 'This intake link is invalid. Please use the link your coach sent you.' }, 400);
    }

    const svc = serviceClient();

    const coachQuery = svc.from('profiles').select('id');
    const { data: coachRows, error: coachErr } = coachIsUuid
      ? await coachQuery.eq('id', coachKey).limit(2)
      : await coachQuery.ilike('email', exactIlike(coachKey)).limit(2);
    if (coachErr) console.error('submitOnboardingIntake coach lookup error:', coachErr);
    // exactly one match, or we refuse (ambiguous email → don't guess a tenant)
    const coach = coachRows?.length === 1 ? coachRows[0] : null;
    if (!coach?.id) {
      return jsonResponse({ success: false, error: 'This intake link is invalid. Please use the link your coach sent you.' }, 400);
    }

    // Abuse throttle (public, unauthenticated endpoint that triggers emails).
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const [byEmail, byCoach] = await Promise.all([
      svc.from('onboarding_responses').select('id', { count: 'exact', head: true })
        .ilike('email', exactIlike(email)).gte('created_at', since),
      svc.from('onboarding_responses').select('id', { count: 'exact', head: true })
        .eq('coach_id', coach.id).gte('created_at', since),
    ]);
    if (byEmail.error || byCoach.error) {
      console.error('submitOnboardingIntake throttle check error:', byEmail.error || byCoach.error);
      return jsonResponse({ success: false, error: 'Something went wrong. Please try again shortly.' }, 500);
    }
    if ((byEmail.count ?? 0) >= MAX_PER_EMAIL_PER_WINDOW || (byCoach.count ?? 0) > MAX_PER_COACH_PER_WINDOW) {
      return jsonResponse({ success: false, error: 'Too many submissions. Please try again later.' }, 429);
    }

    const { data: record, error } = await svc.from('onboarding_responses')
      .insert(buildIntakeRow({ name, email, formData }, coach.id)).select('id').single();

    if (error) {
      console.error('submitOnboardingIntake insert error:', error);
      return jsonResponse({ success: false, error: 'We could not save your intake. Please try again.' }, 500);
    }

    return jsonResponse({ success: true, id: record.id });
  } catch (error) {
    console.error('submitOnboardingIntake error:', error);
    return jsonResponse({ success: false, error: 'Something went wrong. Please try again shortly.' }, 500);
  }
});
