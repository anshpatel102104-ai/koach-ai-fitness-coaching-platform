import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Panel, Stat, Segmented, EmptyState } from '@/components/kit';
import StoreProductCard from '@/components/store/StoreProductCard';
import ProductFormModal from '@/components/store/ProductFormModal';
import ProductDetailSheet from '@/components/store/ProductDetailSheet';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'workout', label: 'Workout' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'coaching', label: 'Coaching' },
  { key: 'bundle', label: 'Bundle' },
];

export default function Store() {
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewListing, setViewListing] = useState(null);
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: () => db.entities.PlanListing.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.PlanListing.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setShowForm(false);
      return created;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.PlanListing.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['listings'] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.PlanListing.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listings'] }),
  });

  const stats = useMemo(() => {
    const totalRevenue = listings.reduce((s, l) => s + (Number(l.price) * (l.sales_count || 0)), 0);
    const totalSales = listings.reduce((s, l) => s + (l.sales_count || 0), 0);
    const rated = listings.filter(l => l.rating);
    const avgRating = rated.length ? (rated.reduce((s, l) => s + Number(l.rating), 0) / rated.length).toFixed(1) : '—';
    return { totalRevenue, totalSales, avgRating };
  }, [listings]);

  const filtered = useMemo(() => filter === 'all' ? listings : listings.filter(l => l.category === filter), [listings, filter]);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (listing) => { setEditing(listing); setShowForm(true); };

  const published = listings.filter(l => l.is_published).length;
  const drafts = listings.length - published;
  const subtitle = listings.length === 0
    ? 'Sell programs, meal plans and coaching packages from a checkout link.'
    : `${published} published, ${drafts} ${drafts === 1 ? 'draft' : 'drafts'}. ${stats.totalSales} sold so far.`;

  const tabs = FILTER_TABS.map(t => ({
    value: t.key,
    label: t.label,
    count: t.key === 'all' ? listings.length : listings.filter(l => l.category === t.key).length,
  }));

  return (
    <Page>
      <PageHeader
        title="Store"
        subtitle={subtitle}
        actions={<Button onClick={openCreate}><Plus /> New product</Button>}
      />

      <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden bg-border mb-5 [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} sub="all time" />
        <Stat label="Sales" value={stats.totalSales} sub="across all products" />
        <Stat label="Products" value={listings.length} sub={`${published} published`} />
        <Stat label="Average rating" value={stats.avgRating} sub={`${listings.filter(l => l.rating).length} rated`} />
      </Panel>

      <Segmented className="mb-5" options={tabs} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-80 panel animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Panel>
          <EmptyState
            title={filter !== 'all' ? `No ${FILTER_TABS.find(t => t.key === filter)?.label.toLowerCase()} products yet` : 'No products yet'}
            body="Turn a program you already run into something people can buy."
            action={<Button onClick={openCreate}>New product</Button>}
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(listing => (
            <StoreProductCard
              key={listing.id}
              listing={listing}
              onEdit={openEdit}
              onView={setViewListing}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <ProductFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        editing={editing}
        onCreate={(data) => createMutation.mutateAsync(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
      />

      {/* Product detail sheet */}
      <ProductDetailSheet
        listing={viewListing}
        clients={clients}
        open={!!viewListing}
        onClose={() => setViewListing(null)}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </Page>
  );
}