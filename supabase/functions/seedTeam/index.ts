// Supabase Edge Function: seedTeam  (Migration Step 5e)
//
// Faithful port of base44/functions/seedTeam — idempotent one-time setup per
// coach: ensure a teams row owned by the caller, then stamp team_id onto
// every caller-owned client missing one. Safe to call repeatedly.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

serve('seedTeam', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    const userId = caller.auth.id;

    // 1. Find or create the team for this coach
    const { data: existingTeams } = await svc.from('teams')
      .select('*').eq('owner_coach_id', userId).limit(1);
    let team = existingTeams?.[0];

    if (!team) {
      const teamName = caller.profile.full_name ? `${caller.profile.full_name}'s Team` : 'My Team';
      const { data: created, error } = await svc.from('teams')
        .insert({ name: teamName, owner_coach_id: userId, created_by: userId })
        .select('*').single();
      if (error) throw new Error(error.message);
      team = created;
    }

    // 2. Backfill team_id on the CALLER's clients that don't have one yet
    const { data: allClients } = await svc.from('clients').select('id, team_id')
      .or(`user_id.eq.${userId},created_by.eq.${userId}`);
    const clientsToUpdate = (allClients ?? []).filter((c) => !c.team_id);

    for (const client of clientsToUpdate) {
      await svc.from('clients').update({ team_id: team.id }).eq('id', client.id);
    }

    return jsonResponse({
      success: true,
      team_id: team.id,
      team_name: team.name,
      clients_backfilled: clientsToUpdate.length,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
