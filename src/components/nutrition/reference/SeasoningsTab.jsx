import React, { useState, useMemo } from 'react';
import { SEASONINGS, SEASONING_CUISINES } from '@/lib/nutritionReferenceData';
import { RefShell, RefRow, RefField } from './RefList';

export default function SeasoningsTab({ isPortal = false }) {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');

  const filtered = useMemo(() => {
    return SEASONINGS.filter(s => {
      const matchCuisine = cuisine === 'All' || s.cuisine === cuisine;
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.flavor.toLowerCase().includes(search.toLowerCase()) ||
        s.best_proteins.join(' ').toLowerCase().includes(search.toLowerCase());
      return matchCuisine && matchSearch;
    });
  }, [search, cuisine]);

  return (
    <RefShell
      search={search} onSearch={setSearch} placeholder="Search seasonings"
      filters={SEASONING_CUISINES} active={cuisine} onFilter={setCuisine}
      count={filtered.length} noun={filtered.length === 1 ? 'seasoning' : 'seasonings'}
      emptyText="No seasonings match that search."
    >
      {filtered.map(item => (
        <RefRow key={item.id} isPortal={isPortal} title={item.name} meta={`${item.cuisine} · ${item.flavor}`}>
          <RefField label="Best proteins">{item.best_proteins.slice(0, 4).join(', ')}</RefField>
          <RefField label="Best carbs">{item.best_carbs.slice(0, 4).join(', ')}</RefField>
          <RefField label="Recipe ideas" wide>
            <ul className="list-disc pl-4 space-y-0.5">
              {item.recipe_ideas.map(r => <li key={r}>{r}</li>)}
            </ul>
          </RefField>
          <RefField label="Pairs well with" wide>{item.pairs_with.join(', ')}</RefField>
        </RefRow>
      ))}
    </RefShell>
  );
}
