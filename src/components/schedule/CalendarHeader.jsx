import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';

/**
 * Calendar toolbar: range title with prev / today / next on the left,
 * Day / Week / Month on the right. Booking + availability actions live in
 * the page header (onNewSession / onAvailability are accepted for callers
 * that render this standalone).
 */
export default function CalendarHeader({ title, onPrev, onNext, onToday, view, onViewChange }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onPrev} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={onToday}>Today</Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onNext} aria-label="Next">
            <ChevronRight />
          </Button>
        </div>
        <h2 className="text-[22px] text-foreground truncate">{title}</h2>
      </div>

      <Segmented
        className="self-start sm:self-auto"
        size="sm"
        value={view}
        onChange={onViewChange}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
      />
    </div>
  );
}
