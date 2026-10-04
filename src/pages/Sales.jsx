import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, TrendingUp, DollarSign, Target, Users, LayoutGrid, List, BarChart2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FunnelView from '../components/sales/FunnelView';
import PaymentTracker from '../components/sales/PaymentTracker';
import OfferTiers from '../components/sales/OfferTiers';
import UpsellPrompts from '../components/sales/UpsellPrompts';
import KanbanBoard from '../components/sales/KanbanBoard';
import LeadListView from '../components/sales/LeadListView';
import LeadDetailDrawer from '../components/sales/LeadDetailDrawer';
import AddLeadModal from '../components/sales/AddLeadModal';
import { cn } from '@/lib/utils';

const PIPELINE_VIEWS = [
  { key: 'funnel',  label: 'Funnel',  icon: BarChart2 },
  { key: 'kanban',  label: 'Kanban',  icon: LayoutGrid },
  { key: 'list',    label: 'List',    icon: List },
];

export default function Sales() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [pipelineView, setPipelineView] = useState(() => {
    const saved = localStorage.getItem('sales_pipeline_view');
    // Mobile defaults to list
    const isMobile = window.innerWidth < 768;
    return saved || (isMobile ? 'list' : 'kanban');
  });
  const [showAddLead, setShowAddLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [initialStage, setInitialStage] = useState('new_lead');
  const [selectedStage, setSelectedStage] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Remember view preference
  useEffect(() => {
    localStorage.setItem('sales_pipeline_view', pipelineView);
  }, [pipelineView]);

  // Real-time updates
  useEffect(() => {
    const unsub = db.entities.Lead.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    });
    return unsub;
  }, [queryClient]);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => db.entities.Lead.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => db.entities.WorkoutProgram.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d) => db.entities.Lead.create(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Lead.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Keep viewing drawer in sync
      if (viewingLead && updated?.id === viewingLead.id) {
        setViewingLead(updated);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Lead.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const handleSubmit = (data) => {
    if (editingLead) updateMutation.mutate({ id: editingLead.id, data });
    else createMutation.mutate(data);
    setEditingLead(null);
  };

  const handleUpdate = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const openAddLead = (stage = 'new_lead') => {
    setEditingLead(null);
    setInitialStage(stage);
    setShowAddLead(true);
  };

  const openView = (lead) => setViewingLead(lead);

  // Stats
  const activeLeads = leads.filter(l => !['closed_won', 'lost', 'active_client'].includes(l.stage));
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.deal_value || 0), 0);
  const closedValue = leads.filter(l => l.stage === 'closed_won' || l.stage === 'active_client').reduce((s, l) => s + (l.deal_value || 0), 0);
  const conversionRate = leads.length ? Math.round((leads.filter(l => l.stage === 'closed_won' || l.stage === 'active_client').length / leads.length) * 100) : 0;

  // Filtered leads for funnel/list
  const filteredLeads = leads.filter(l => {
    const matchStage = !selectedStage || l.stage === selectedStage;
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="rounded-2xl p-4 sm:p-5 text-white mb-4 sm:mb-5" style={{ background: 'var(--tc-sidebar)' }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Sales & Pipeline</h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'color-mix(in srgb, white 50%, transparent)' }}>Track leads, manage your pipeline and close more clients</p>
          </div>
          <button
            onClick={() => openAddLead()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold min-h-[44px] flex-shrink-0"
            style={{ background: 'var(--tc-card)', color: 'var(--tc-foreground)' }}
          >
            <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Add Lead</span><span className="xs:hidden">Add</span>
          </button>
        </div>
        <div className="flex rounded-lg p-1 w-fit" style={{ background: 'color-mix(in srgb, white 10%, transparent)' }}>
          {['pipeline', 'payments'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all min-h-[36px]"
              style={activeTab === tab ? { background: 'var(--tc-card)', color: 'var(--tc-foreground)' } : { color: 'color-mix(in srgb, white 60%, transparent)' }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Leads', value: leads.length, icon: Users },
          { label: 'Pipeline Value', value: `$${pipelineValue.toLocaleString()}`, icon: TrendingUp },
          { label: 'Closed Revenue', value: `$${closedValue.toLocaleString()}`, icon: DollarSign },
          { label: 'Close Rate', value: `${conversionRate}%`, icon: Target },
        ].map(s => (
          <div key={s.label} className="bg-sidebar rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, white 8%, transparent)' }}>
              <s.icon className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-xl font-black leading-none text-white">{s.value}</p>
              <p className="text-xs mt-1 text-white/50">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* View toggle */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
              {PIPELINE_VIEWS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setPipelineView(v.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    pipelineView === v.key
                      ? 'bg-sidebar text-white shadow-sm'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <v.icon className="w-3.5 h-3.5" />
                  <span className={v.key === 'kanban' ? 'hidden sm:inline' : ''}>{v.label}</span>
                </button>
              ))}
            </div>

            {/* Search (list/funnel) */}
            {pipelineView !== 'kanban' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm w-52"
                />
              </div>
            )}
          </div>

          {/* Pipeline views */}
          {pipelineView === 'funnel' && (
            <>
              <FunnelView leads={leads} onStageClick={setSelectedStage} selectedStage={selectedStage} />
              {selectedStage && (
                <button onClick={() => setSelectedStage(null)} className="text-xs text-muted-foreground hover:text-foreground underline mb-3 block">
                  Clear stage filter
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                {filteredLeads.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No leads. Add your first lead to get started.</p>
                  </div>
                ) : filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => openView(lead)}
                    className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: ['var(--tc-primary)', 'var(--tc-warning)', 'var(--tc-primary)', 'var(--tc-ai)', 'var(--tc-success)', 'var(--kc-ec4899)'][lead.name.charCodeAt(0) % 6] }}
                      >
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{lead.name}</p>
                        {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                      </div>
                    </div>
                    {lead.deal_value > 0 && <p className="text-sm font-bold text-success">${lead.deal_value.toLocaleString()}/mo</p>}
                    {lead.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lead.notes}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {pipelineView === 'kanban' && (
            <KanbanBoard
              leads={leads}
              onUpdate={handleUpdate}
              onView={openView}
              onAddLead={openAddLead}
            />
          )}

          {pipelineView === 'list' && (
            <LeadListView
              leads={leads}
              onView={openView}
              onUpdate={handleUpdate}
              onDelete={(id) => deleteMutation.mutate(id)}
              search={search}
              onSearchChange={setSearch}
            />
          )}

          {/* Upsell & Offer sections */}
          <div className="mt-6 space-y-5">
            <UpsellPrompts clients={clients} programs={programs} />
            <OfferTiers leads={leads} />
          </div>
        </>
      ) : (
        <PaymentTracker clients={clients} />
      )}

      {/* Lead detail drawer */}
      <LeadDetailDrawer
        lead={viewingLead}
        open={!!viewingLead}
        onClose={() => setViewingLead(null)}
        onUpdate={handleUpdate}
        onDelete={(id) => { deleteMutation.mutate(id); setViewingLead(null); }}
      />

      {/* Add/Edit lead modal */}
      <AddLeadModal
        open={showAddLead}
        onOpenChange={setShowAddLead}
        onSubmit={handleSubmit}
        lead={editingLead}
        initialStage={initialStage}
      />
    </div>
  );
}