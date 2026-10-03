import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { ShoppingBag, DollarSign, BarChart2, Star, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
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

function StatCard({ dark, title, value, icon: Icon, subtitle }) {
  if (dark) {
    return (
      <div className="bg-sidebar rounded-xl p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</p>
          {Icon && <Icon className="w-4 h-4 text-white/30" />}
        </div>
        <p className="text-3xl font-bold mt-3 text-white leading-none">{value}</p>
        {subtitle && <p className="text-xs text-white/40 mt-1.5">{subtitle}</p>}
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {Icon && <div className="p-2 rounded-lg bg-muted"><Icon className="w-4 h-4 text-foreground" /></div>}
      </div>
      <p className="text-3xl font-bold mt-3 text-foreground leading-none">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
    </div>
  );
}

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

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Dark header */}
      <div className="bg-sidebar rounded-xl p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--kc-w-10)] flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white leading-tight">Plan Store</h1>
            <p className="text-sm text-white/50 mt-0.5">Sell your training plans, nutrition programs, and coaching packages</p>
          </div>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-card text-foreground rounded-lg text-sm font-semibold hover:bg-[var(--kc-w-90)] transition-colors">
          + Create Product
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard dark title="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} subtitle="All time earnings" />
        <StatCard title="Products Listed" value={listings.length} icon={Package} subtitle={`${listings.filter(l => l.is_published).length} published`} />
        <StatCard dark title="Total Sales" value={stats.totalSales} icon={BarChart2} subtitle="Across all products" />
        <StatCard title="Avg Rating" value={stats.avgRating === '—' ? '—' : `★ ${stats.avgRating}`} icon={Star} subtitle={`${listings.filter(l => l.rating).length} rated`} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              filter === tab.key
                ? 'bg-sidebar text-white'
                : 'bg-card border border-border text-foreground hover:border-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className={cn('ml-1.5 text-[10px]', filter === tab.key ? 'text-white/60' : 'text-muted-foreground')}>
                {listings.filter(l => l.category === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-72 bg-card rounded-xl border border-border animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-xl">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">No products {filter !== 'all' ? `in ${filter}` : 'yet'}</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first product to start selling</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors">
            + Create Product
          </button>
        </div>
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
    </div>
  );
}