/**
 * getMyTeamId — resolves the team_id for the currently authenticated coach.
 * Looks up the Team owned by the user; returns null if none found.
 * Used to tag new Client records with the correct team_id at creation time.
 */
import { db } from '@/api/supabaseClient';

export async function getMyTeamId(userId) {
  if (!userId) return null;
  try {
    const teams = await db.entities.Team.filter({ owner_coach_id: userId });
    if (teams.length > 0) return teams[0].id;
    // Fallback: check if the user is a team member (invited coach)
    const memberships = await db.entities.TeamMember.filter({ user_id: userId });
    if (memberships.length > 0) return memberships[0].team_id;
    return null;
  } catch (_) {
    return null;
  }
}