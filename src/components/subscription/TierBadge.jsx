import React from 'react';
import { getUserTier } from '@/lib/subscription';
import { cn } from '@/lib/utils';

/** Plain plan label, e.g. "Pro plan". */
export default function TierBadge({ user, className }) {
  const tier = getUserTier(user);
  return (
    <span className={cn('inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[13px] font-medium text-foreground', className)}>
      {tier.name} plan
    </span>
  );
}
