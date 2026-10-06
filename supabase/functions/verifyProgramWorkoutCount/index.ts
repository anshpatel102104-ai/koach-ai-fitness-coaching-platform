// Supabase Edge Function: verifyProgramWorkoutCount  (Migration Step 5e)
//
// Faithful port of base44/functions/verifyProgramWorkoutCount — an integrity
// probe: resolves the caller's CLIENT row (portal_user_id), their assigned
// program, and the completed-vs-remaining workout math (same formula as the
// fixed component).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

serve('verifyProgramWorkoutCount', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();

    // The caller's own client row, by the durable portal link (set only by
    // setupPortalAccount). Matching by email let any account read the client
    // row of whoever shares that address.
    const { data: clients } = await svc.from('clients').select('*')
      .eq('portal_user_id', caller.auth.id)
      .order('created_at', { ascending: false }).limit(1);
    const client = clients?.[0];
    if (!client) return jsonResponse({ error: 'No client found for user' }, 404);

    if (!client.assigned_program_id) {
      return jsonResponse({ error: 'No program assigned to client' }, 404);
    }

    const { data: program } = await svc.from('workout_programs').select('*')
      .eq('id', client.assigned_program_id).maybeSingle();
    if (!program) return jsonResponse({ error: 'Program not found' }, 404);

    const { data: sessions } = await svc.from('workout_sessions').select('id')
      .eq('client_id', client.id).limit(500);

    const allWorkouts = program.workouts || [];
    const totalWorkouts = allWorkouts.filter((w: { day_name?: string }) => !w.day_name?.toLowerCase().includes('rest')).length;
    const completed = (sessions ?? []).length;
    const remaining = Math.max(0, totalWorkouts - completed);

    return jsonResponse({
      client: { id: client.id, name: client.name, email: client.email },
      program: {
        id: program.id,
        title: program.title,
        duration_weeks: program.duration_weeks,
        total_workout_days_in_program: allWorkouts.length,
        non_rest_days: totalWorkouts,
      },
      calculations: { total_workouts: totalWorkouts, completed, remaining },
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
