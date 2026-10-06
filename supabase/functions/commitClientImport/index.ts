// Supabase Edge Function: commitClientImport  (Migration Step 5e)
//
// Re-platform of base44/functions/commitClientImport — writes the mapped CSV
// rows of a confirmed client_import_jobs job into clients. Normalizers and
// the row builder are extracted verbatim to _shared/importCommit.js (with one
// documented bugfix: mapped columns no longer leak duplicated into notes).
//
// Multi-tenant scoping vs Base44:
//   - the JOB must belong to the caller (Base44 fetched any id),
//   - duplicate detection runs against the CALLER's clients,
//   - created rows carry user_id/created_by = caller (Base44's created_by_id).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { mappingContext, buildClientRow } from '../_shared/importCommit.js';
import { serve } from '../_shared/observe.js';

serve('commitClientImport', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    const userId = caller.auth.id;

    const { job_id } = await req.json();
    if (!job_id) return jsonResponse({ error: 'job_id required' }, 400);

    const { data: job } = await svc.from('client_import_jobs').select('*').eq('id', job_id).maybeSingle();
    if (!job) return jsonResponse({ error: 'Import job not found' }, 404);
    if (job.created_by !== userId && job.coach_id !== userId) {
      return jsonResponse({ error: 'Import job not found' }, 404);
    }
    if (job.status !== 'confirmed') {
      return jsonResponse({ error: 'Job must be in confirmed status before committing' }, 400);
    }

    const ctx = mappingContext(job.column_mapping || {}, job.headers || []);
    const rows = job.all_rows || [];

    // Resolve the coach's team_id for tagging new clients
    let coachTeamId = null;
    const { data: teams } = await svc.from('teams').select('id').eq('owner_coach_id', userId).limit(1);
    if (teams?.length) {
      coachTeamId = teams[0].id;
    } else {
      const { data: memberships } = await svc.from('team_members')
        .select('team_id').eq('user_id', userId).eq('invite_status', 'accepted').limit(1);
      if (memberships?.length) coachTeamId = memberships[0].team_id;
    }

    // Duplicate detection against the CALLER's clients (by email)
    const { data: existingClients } = await svc.from('clients').select('email')
      .or(`user_id.eq.${userId},created_by.eq.${userId}`);
    const existingEmails = new Set((existingClients ?? []).map((c) => (c.email || '').toLowerCase().trim()));

    let imported = 0;
    let skipped = 0;
    let flagged = 0;
    const errorLog: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const built = buildClientRow(rows[i], i, ctx);
      if (built.skip) { errorLog.push(built.skip); skipped++; continue; }
      const { clientData, email, name } = built;

      if (email && existingEmails.has(email.toLowerCase().trim())) { skipped++; continue; }

      const { error } = await svc.from('clients').insert({
        ...clientData,
        user_id: userId,
        created_by: userId,
        ...(coachTeamId ? { team_id: coachTeamId } : {}),
      });
      if (error) {
        flagged++;
        errorLog.push(`Row ${i + 1} (${name || email}): ${error.message}`);
        continue;
      }
      if (email) existingEmails.add(email.toLowerCase().trim());
      imported++;
    }

    await svc.from('client_import_jobs').update({
      status: 'committed',
      imported_count: imported,
      skipped_count: skipped,
      flagged_count: flagged,
      error_log: errorLog,
    }).eq('id', job_id);

    return jsonResponse({ success: true, imported, skipped, flagged, error_log: errorLog });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
