import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Page } from '@/components/kit';

/** Loading placeholder for Today — mirrors TodayView's first screen. */
export default function DashboardSkeleton() {
  return (
    <Page>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <Skeleton className="h-4 w-80 max-w-full rounded" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-[60px] flex-1 rounded-lg sm:w-[54px] sm:flex-none" />)}
        </div>
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    </Page>
  );
}
