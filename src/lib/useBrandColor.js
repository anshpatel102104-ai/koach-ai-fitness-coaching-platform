import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { applyBrandColor } from '@/lib/brand';

/**
 * Loads the coach's White Label settings and applies their brand color as a
 * runtime override of the --primary token family. Safe to call once high in the
 * coach app tree; it re-applies whenever the stored color changes.
 */
export function useBrandColor(enabled = true) {
  const { data } = useQuery({
    queryKey: ['white-label-settings'],
    queryFn: async () => {
      const rows = await db.entities.WhiteLabelSettings.list();
      return rows?.[0] || null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data === undefined) return; // still loading — leave defaults in place
    applyBrandColor(data?.primary_color || null);
  }, [data]);
}
