import React, { useState, useMemo } from 'react';
import { SUPPLEMENTS, SUPPLEMENT_CATEGORIES } from '@/lib/nutritionReferenceData';
import { RefShell, RefRow, RefField } from './RefList';

export default function SupplementsTab({ isPortal = false }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    return SUPPLEMENTS.filter(s => {
      const matchCat = category === 'All' || s.category === category;
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.what_it_does.toLowerCase().includes(search.toLowerCase()) ||
        s.best_for.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, category]);

  return (
    <RefShell
      search={search} onSearch={setSearch} placeholder="Search supplements"
      filters={SUPPLEMENT_CATEGORIES} active={category} onFilter={setCategory}
      count={filtered.length} noun={filtered.length === 1 ? 'supplement' : 'supplements'}
      notice={isPortal ? 'Check with your coach or doctor before starting anything new.' : 'Reference only. Clients should check with a doctor before starting anything new.'}
      emptyText="No supplements match that search."
    >
      {filtered.map(item => (
        <RefRow key={item.id} isPortal={isPortal} title={item.name} meta={`${item.category} · ${item.rating}`} right={item.dose}>
          <RefField label="What it does" wide>{item.what_it_does}</RefField>
          <RefField label="Dose">{item.dose}</RefField>
          <RefField label="Best time">{item.timing}</RefField>
          <RefField label="Best for" wide>{item.best_for}</RefField>
          {item.stack_with?.length > 0 && <RefField label="Stacks well with">{item.stack_with.join(', ')}</RefField>}
          {item.avoid_with?.length > 0 && <RefField label="Avoid with" tone="danger">{item.avoid_with.join(', ')}</RefField>}
        </RefRow>
      ))}
    </RefShell>
  );
}
