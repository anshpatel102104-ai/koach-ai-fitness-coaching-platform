import React, { useState, useMemo } from 'react';
import { VITAMINS, VITAMIN_TYPES } from '@/lib/nutritionReferenceData';
import { RefShell, RefRow, RefField } from './RefList';

export default function VitaminsTab({ isPortal = false }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');

  const filtered = useMemo(() => {
    return VITAMINS.filter(v => {
      const matchType = type === 'All' || v.type === type;
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.what_it_does.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [search, type]);

  return (
    <RefShell
      search={search} onSearch={setSearch} placeholder="Search vitamins and minerals"
      filters={VITAMIN_TYPES} active={type} onFilter={setType}
      count={filtered.length} noun="vitamins and minerals"
      emptyText="No vitamins or minerals match that search."
    >
      {filtered.map(item => (
        <RefRow key={item.id} isPortal={isPortal} title={item.name} meta={item.type} right={`RDA ${item.rda}`}>
          <RefField label="What it does" wide>{item.what_it_does}</RefField>
          <RefField label="Daily amount">{item.rda}</RefField>
          {item.upper && <RefField label="Upper limit">{item.upper}</RefField>}
          <RefField label="Best time">{item.timing}{item.with_food ? ', with food' : ', fine on an empty stomach'}</RefField>
          <RefField label="Best food sources">{item.sources}</RefField>
          <RefField label="Signs of deficiency" tone="danger">{item.deficiency}</RefField>
          <RefField label="Most at risk">{item.at_risk}</RefField>
        </RefRow>
      ))}
    </RefShell>
  );
}
