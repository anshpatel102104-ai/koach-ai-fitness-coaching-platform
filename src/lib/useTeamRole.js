/**
 * useTeamRole — resolves whether the current user is an "owner" or "coach"
 * within their team. Falls back to "owner" if no team/TeamMember record exists
 * (solo coaches who haven't been invited are always owners of themselves).
 *
 * Returns: { teamRole: 'owner' | 'coach', isOwner: boolean, isLoading: boolean }
 */
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export function useTeamRole() {
  const { me } = useAuth();
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => me(),
  });

  // Look for a TeamMember record where this user is the member (by user_id or email)
  const { data: myMemberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['my-team-memberships', user?.id],
    queryFn: async () => {
      // Try by user_id first; then by email as fallback
      const byUserId = user?.id
        ? await db.entities.TeamMember.filter({ user_id: user.id })
        : [];
      if (byUserId.length > 0) return byUserId;
      const byEmail = user?.email
        ? await db.entities.TeamMember.filter({ email: user.email })
        : [];
      return byEmail;
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingUser || loadingMemberships;

  if (isLoading) {
    return { teamRole: 'owner', isOwner: true, isLoading: true };
  }

  // If the user has a TeamMember record that explicitly marks them as 'coach', they are a coach
  const coachMembership = myMemberships.find(m => m.role_label === 'coach');
  const ownerMembership = myMemberships.find(m => m.role_label === 'owner');

  // Owner if: no membership record (solo coach), or has an owner record, or is admin
  if (!coachMembership || ownerMembership || user?.role === 'admin') {
    return { teamRole: 'owner', isOwner: true, isLoading: false };
  }

  return { teamRole: 'coach', isOwner: false, isLoading: false };
}