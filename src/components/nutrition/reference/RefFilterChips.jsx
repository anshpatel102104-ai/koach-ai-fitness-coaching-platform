import React from 'react';
import { Segmented } from '@/components/kit';

/** Filter for the reference lists. Same API as before; renders the kit segmented control. */
export default function RefFilterChips({ options, active, onChange }) {
  return (
    <Segmented
      size="sm"
      value={active}
      onChange={onChange}
      options={options.map(opt => ({ value: opt, label: opt }))}
    />
  );
}
