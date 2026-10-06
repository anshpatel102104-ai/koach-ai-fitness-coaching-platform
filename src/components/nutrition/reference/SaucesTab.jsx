import React, { useState, useMemo } from 'react';
import { SAUCES, SAUCE_TIERS } from '@/lib/nutritionReferenceData';
import { RefShell, RefRow, RefField } from './RefList';

export default function SaucesTab({ isPortal = false }) {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('All');

  const filtered = useMemo(() => {
    return SAUCES.filter(s => {
      const matchTier = tier === 'All' || s.tier === tier;
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.flavor.join(' ').toLowerCase().includes(search.toLowerCase()) ||
        s.best_with.join(' ').toLowerCase().includes(search.toLowerCase());
      return matchTier && matchSearch;
    });
  }, [search, tier]);

  return (
    <RefShell
      search={search} onSearch={setSearch} placeholder="Search sauces"
      filters={SAUCE_TIERS} active={tier} onFilter={setTier}
      count={filtered.length} noun={filtered.length === 1 ? 'sauce' : 'sauces'}
      emptyText="No sauces match that search."
    >
      {filtered.map(item => (
        <RefRow
          key={item.id}
          isPortal={isPortal}
          title={item.name}
          meta={[item.tier, item.recipe ? 'Make it yourself' : null].filter(Boolean).join(' · ')}
          right={`${item.calories} cal ${item.serving} · ${item.macros}`}
        >
          <RefField label="Per serving" wide><span className="tabular-nums">{item.calories} cal {item.serving} · {item.macros}</span></RefField>
          <RefField label="Flavour">{item.flavor.join(', ')}</RefField>
          <RefField label="Best with">{item.best_with.join(', ')}</RefField>
          {item.recipe && <RefField label="How to make it" wide>{item.recipe}</RefField>}
        </RefRow>
      ))}
    </RefShell>
  );
}
