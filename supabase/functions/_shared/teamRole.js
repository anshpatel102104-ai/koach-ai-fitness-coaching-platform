/**
 * Server-side team-role resolution (Step 6) — the same semantics as the
 * frontend's useTeamRole hook, evaluated with the service client so it can't
 * be spoofed:
 *
 *   owner  — owns a team (teams.owner_coach_id), OR has an accepted
 *            team_members row with role_label='owner', OR has no membership
 *            at all (a solo coach is the owner of their own practice).
 *   coach  — only affiliation is an accepted role_label='coach' membership
 *            on someone else's team.
 *
 * Billing/subscription edge functions call assertBillingAllowed(): 'coach'
 * tier members manage nothing money-shaped — the team's billing rides on the
 * owner's own profile.
 */

export async function resolveTeamRole(svc, userId) {
  if (!userId) return 'coach';
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    svc.from('teams').select('id').eq('owner_coach_id', userId).limit(1),
    svc.from('team_members').select('role_label, invite_status')
      .eq('user_id', userId).eq('invite_status', 'accepted'),
  ]);
  if (owned?.length) return 'owner';
  const accepted = memberships ?? [];
  if (accepted.some((m) => m.role_label === 'owner')) return 'owner';
  if (accepted.some((m) => m.role_label === 'coach')) return 'coach';
  return 'owner'; // no affiliation → solo coach, owner of themselves
}

/**
 * Owner-only gate for billing functions. Returns null when allowed, or a
 * response body (to send with 403) when the caller is a coach-tier member.
 */
export async function billingDeniedFor(svc, userId) {
  const role = await resolveTeamRole(svc, userId);
  if (role === 'owner') return null;
  return {
    error: 'Billing is managed by your team owner.',
    owner_only: true,
    team_role: role,
  };
}

/**
 * For a coach-tier team member, the team owner's user id (whose plan and
 * billing the member works under); null for owners and solo coaches.
 */
export async function teamOwnerFor(svc, userId) {
  if (!userId || (await resolveTeamRole(svc, userId)) !== 'coach') return null;
  const { data } = await svc.from('team_members')
    .select('teams(owner_coach_id)')
    .eq('user_id', userId).eq('invite_status', 'accepted').eq('role_label', 'coach')
    .limit(1).maybeSingle();
  return data?.teams?.owner_coach_id ?? null;
}
