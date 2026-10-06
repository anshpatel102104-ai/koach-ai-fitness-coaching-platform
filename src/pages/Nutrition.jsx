import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Search, Plus, FileUp, X } from 'lucide-react';
import { toast } from 'sonner';

import { sendZapierEvent } from '@/lib/zapier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Page, PageHeader, Panel, Segmented, EmptyState } from '@/components/kit';
import LimitBanner from '@/components/subscription/LimitBanner';
import { useUpgradeModal } from '@/components/layout/AppLayout';
import NutritionForm from '../components/nutrition/NutritionForm';
import NutritionInsightCards from '../components/nutrition/NutritionInsightCards';
import NutritionPlanCard, { PlanTableHead } from '../components/nutrition/NutritionPlanCard';
import AIGeneratorModal from '../components/nutrition/AIGeneratorModal';
import NewPlanLaunchModal from '../components/nutrition/NewPlanLaunchModal';
import UploadPDFModal from '../components/nutrition/UploadPDFModal';
import SupplementsTab from '../components/nutrition/reference/SupplementsTab';
import VitaminsTab from '../components/nutrition/reference/VitaminsTab';
import SaucesTab from '../components/nutrition/reference/SaucesTab';
import SeasoningsTab from '../components/nutrition/reference/SeasoningsTab';
import { planClients } from '../components/nutrition/planUtils';

const MAIN_TABS = [
  { value: 'plans',       label: 'Meal plans' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'vitamins',    label: 'Vitamins' },
  { value: 'sauces',      label: 'Sauces' },
  { value: 'seasonings',  label: 'Seasonings' },
];

export default function Nutrition() {
  const { me } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [mainTab, setMainTab] = useState('plans');
  const [pendingMeals, setPendingMeals] = useState(null);
  const queryClient = useQueryClient();
  const { openUpgradeModal } = useUpgradeModal();
  const clientFilter = searchParams.get('client');
  const openPlanId = searchParams.get('plan'); // deep link: /nutrition?plan=<id> opens that plan

  useEffect(() => {
    me().then(setCurrentUser).catch(() => {});
  }, []);

  // "New meal plan" from the topbar Create menu lands here with ?new=1.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setMainTab('plans');
      setShowLaunchModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['nutrition'],
    queryFn: () => db.entities.NutritionPlan.list('-created_date'),
  });

  // Same query (and cache) the insight panel uses, to put names on plans.
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-insights'],
    queryFn: () => db.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.NutritionPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-client'] });
    },
    onError: (err) => {
      console.error('Create plan error:', err);
      toast.error('Failed to save plan: ' + err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.NutritionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-client'] });
    },
    onError: (err) => {
      console.error('Update plan error:', err);
      toast.error('Failed to update plan: ' + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.NutritionPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition'] }),
  });

  const duplicatePlan = (plan) => {
    const { id, created_date, updated_date, created_by, ...rest } = plan;
    createMutation.mutate({ ...rest, title: `${rest.title} (Copy)` });
  };

  // Nutrition plans are unlimited on all tiers — no cap enforced
  const atLimit = false;

  const openCreate = (initialData = {}) => {
    setEditing(null);
    setShowForm(true);
    if (initialData.meals) setPendingMeals(initialData.meals);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    const result = editing && editing.id
      ? await updateMutation.mutateAsync({ id: editing.id, data })
      : await createMutation.mutateAsync(data);
    setPendingMeals(null);
    setEditing(null);
    toast.success('Plan saved');
    if (result?.id && !(editing && editing.id)) {
      sendZapierEvent('nutrition_plan.created', {
        plan_id: result.id,
        plan_title: result.title,
        calories: result.calories,
      });
    }
    return result;
  };

  const handleAIApply = (result) => {
    setEditing(null);
    setPendingMeals(result.meals || null);
    setShowAIModal(false);
    setShowForm(true);
  };

  const filterClient = clientFilter ? clients.find(c => c.id === clientFilter) : null;

  const counts = useMemo(() => ({
    All: plans.length,
    'Macro Tracking': plans.filter(p => p.tracking_mode !== 'habits').length,
    'Habit Mode': plans.filter(p => p.tracking_mode === 'habits').length,
    Templates: plans.filter(p => p.is_template).length,
  }), [plans]);

  const filtered = plans.filter(p => {
    const q = search.trim().toLowerCase();
    const owners = planClients(p, clients);
    const matchesSearch = !q
      || p.title?.toLowerCase().includes(q)
      || owners.some(c => c.name?.toLowerCase().includes(q));
    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Macro Tracking' && p.tracking_mode !== 'habits') ||
      (activeTab === 'Habit Mode' && p.tracking_mode === 'habits') ||
      (activeTab === 'Templates' && p.is_template);
    const matchesClient = !clientFilter || owners.some(c => c.id === clientFilter);
    return matchesSearch && matchesTab && matchesClient;
  });

  const assignedCount = plans.filter(p => planClients(p, clients).length > 0).length;
  const subtitle = plans.length === 0
    ? 'Meal plans, supplements and the reference lists your clients cook from.'
    : `${plans.length} meal plan${plans.length === 1 ? '' : 's'}, ${assignedCount} assigned to clients.`;

  const clearClientFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('client');
    setSearchParams(next, { replace: true });
  };

  return (
    <Page>
      <PageHeader
        title="Nutrition"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowPDFModal(true)}>
              <FileUp /> Upload PDF
            </Button>
            <Button variant="outline" onClick={() => setShowAIModal(true)}>
              Generate with AI
            </Button>
            <Button onClick={() => setShowLaunchModal(true)}>
              <Plus /> New meal plan
            </Button>
          </>
        }
      />

      <LimitBanner limitKey="max_nutrition_plans" currentCount={plans.length} label="nutrition plans" featureKey="clients" />

      <Segmented options={MAIN_TABS} value={mainTab} onChange={setMainTab} className="mb-5" />

      {/* ── Reference lists ── */}
      {mainTab === 'supplements' && <SupplementsTab />}
      {mainTab === 'vitamins'    && <VitaminsTab />}
      {mainTab === 'sauces'      && <SaucesTab />}
      {mainTab === 'seasonings'  && <SeasoningsTab />}

      {mainTab === 'plans' && (
        <div className="space-y-5">
          <NutritionInsightCards />

          <Panel className="overflow-hidden">
            <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <Segmented
                size="sm"
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'All', label: 'All', count: counts.All },
                  { value: 'Macro Tracking', label: 'Macros', count: counts['Macro Tracking'] },
                  { value: 'Habit Mode', label: 'Habits', count: counts['Habit Mode'] },
                  { value: 'Templates', label: 'Templates', count: counts.Templates },
                ]}
              />
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search plans or clients"
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {clientFilter && (
              <div className="flex items-center gap-2 px-4 sm:px-5 pb-3 text-sm text-muted-foreground">
                <span>Showing plans for <span className="font-semibold text-foreground">{filterClient?.name || 'one client'}</span>.</span>
                <button onClick={clearClientFilter} className="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4">
                  <X className="w-3.5 h-3.5" /> Show all
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="border-t border-border">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
                    <div className="h-9 w-9 rounded-full bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-secondary" />
                      <div className="h-3 w-1/2 rounded bg-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="border-t border-border">
                {search || clientFilter || activeTab !== 'All' ? (
                  <EmptyState
                    title={search ? `Nothing matches "${search}".` : 'No plans in this view.'}
                    body="Try another filter or clear the search."
                    action={<Button variant="outline" size="sm" onClick={() => { setSearch(''); setActiveTab('All'); if (clientFilter) clearClientFilter(); }}>Clear filters</Button>}
                  />
                ) : (
                  <EmptyState
                    title="No meal plans yet."
                    body="Build one by hand, or let the AI draft a first version from a client's numbers. You review every meal before it's sent."
                    action={
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setShowLaunchModal(true)}><Plus /> New meal plan</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAIModal(true)}>Generate with AI</Button>
                      </div>
                    }
                  />
                )}
              </div>
            ) : (
              <div role="table" aria-label="Meal plans">
                <PlanTableHead />
                {filtered.map((plan, i) => (
                  <NutritionPlanCard
                    key={plan.id}
                    plan={plan}
                    index={i}
                    clients={planClients(plan, clients)}
                    autoOpen={plan.id === openPlanId}
                    onEdit={() => openEdit(plan)}
                    onDuplicate={() => duplicatePlan(plan)}
                    onDelete={() => deleteMutation.mutate(plan.id)}
                    onAssign={() => openEdit(plan)}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── Modals ── */}
      <NutritionForm
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setPendingMeals(null); }}
        onSubmit={handleSubmit}
        plan={editing}
        initialMeals={pendingMeals}
      />

      <AIGeneratorModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        onApply={handleAIApply}
      />

      <NewPlanLaunchModal
        open={showLaunchModal}
        onOpenChange={setShowLaunchModal}
        onSelectAI={() => { setShowLaunchModal(false); setShowAIModal(true); }}
        onSelectManual={() => { setShowLaunchModal(false); openCreate(); }}
      />

      <UploadPDFModal
        open={showPDFModal}
        onOpenChange={setShowPDFModal}
        onSubmit={() => queryClient.invalidateQueries({ queryKey: ['nutrition'] })}
      />
    </Page>
  );
}
