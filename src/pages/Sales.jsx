import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Panel, Stat, Segmented } from '@/components/kit';
import { money, isFollowUpOverdue } from '../components/sales/leadMeta';
import { Input } from '@/components/ui/input';
import FunnelView from '../components/sales/FunnelView';
import PaymentTracker from '../components/sales/PaymentTracker';
import OfferTiers from '../components/sales/OfferTiers';
import UpsellPrompts from '../components/sales/UpsellPrompts';
import KanbanBoard from '../components/sales/KanbanBoard';
import LeadListView from '../components/sales/LeadListView';
import LeadDetailDrawer from '../components/sales/LeadDetailDrawer';
import AddLeadModal from '../components/sales/AddLeadModal';

const PIPELINE_VIEWS = [
  { key: 'kanban',  label: 'Board' },
  { key: 'list',    label: 'List' },
  { key: 'funnel',  label: 'Funnel' },
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

  const overdueFollowUps = activeLeads.filter(isFollowUpOverdue).length;
  const subtitle = leads.length === 0
    ? 'No leads yet. Add the people asking about coaching and move them across as you talk.'
    : `${activeLeads.length} open ${activeLeads.length === 1 ? 'lead' : 'leads'} worth ${money(pipelineValue)} a month.` +
      (overdueFollowUps > 0 ? ` ${overdueFollowUps} follow-up${overdueFollowUps === 1 ? ' is' : 's are'} overdue.` : ' No follow-ups overdue.');

  return (
    <Page wide={activeTab === 'pipeline' && pipelineView === 'kanban'}>
      <PageHeader
        title="Sales"
        subtitle={subtitle}
        actions={<Button onClick={() => openAddLead()}><Plus /> Add lead</Button>}
      />

      <Segmented
        className="mb-5"
        value={activeTab}
        onChange={setActiveTab}
        options={[{ value: 'pipeline', label: 'Pipeline', count: activeLeads.length }, { value: 'payments', label: 'Payments' }]}
      />

      <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden bg-border mb-5 [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Leads" value={leads.length} sub={`${activeLeads.length} still open`} />
        <Stat label="Pipeline value" value={money(pipelineValue)} sub="per month, open leads" />
        <Stat label="Closed revenue" value={money(closedValue)} sub="won and active" />
        <Stat label="Close rate" value={`${conversionRate}%`} sub="of all leads" />
      </Panel>

      {activeTab === 'pipeline' ? (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <Segmented
              value={pipelineView}
              onChange={setPipelineView}
              options={PIPELINE_VIEWS.map(v => ({ value: v.key, label: v.label }))}
            />
            {pipelineView !== 'kanban' && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Name or email"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 bg-card"
                  aria-label="Search leads"
                />
              </div>
            )}
          </div>

          {pipelineView === 'funnel' && (
            <>
              <FunnelView leads={leads} onStageClick={setSelectedStage} selectedStage={selectedStage} />
              <LeadListView
                leads={filteredLeads}
                onView={openView}
                onUpdate={handleUpdate}
                onDelete={(id) => deleteMutation.mutate(id)}
                search={search}
                onSearchChange={setSearch}
              />
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

          <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
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
    </Page>
  );
}