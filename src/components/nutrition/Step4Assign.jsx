import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  User, Search, Check, AlertTriangle,
  ChevronDown, BookmarkPlus, Users,
  ArrowRight, Loader2,
} from 'lucide-react';
import { Initials } from '@/components/kit';
import { format } from 'date-fns';

// ── Client Picker ─────────────────────────────────────────────────────────────
function ClientPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-picker'],
    queryFn: () => db.entities.Client.list('-created_date', 200),
  });

  const filtered = clients.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = clients.find(c => c.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-input bg-card hover:bg-accent transition-colors text-left"
      >
        {selected ? (
          <>
            <Initials name={selected.full_name || selected.name || '?'} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selected.full_name || selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.email || ''}</p>
            </div>
            <Check className="w-4 h-4 text-foreground shrink-0" />
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground flex-1">Pick a client</span>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-md overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients"
                  className="w-full pl-8 pr-3 h-9 text-sm bg-card rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No clients match that search.</div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left',
                      value === c.id && 'bg-accent'
                    )}
                  >
                    <Initials name={c.full_name || c.name || '?'} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.full_name || c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email || ''}</p>
                    </div>
                    {c.nutrition_plan_id && (
                      <span className="text-xs text-muted-foreground shrink-0">Has a plan</span>
                    )}
                    {value === c.id && <Check className="w-4 h-4 text-foreground shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Save as Template Dialog ───────────────────────────────────────────────────
function TemplateSaveForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const CATEGORIES = ['Fat Loss', 'Muscle Gain', 'Maintenance', 'Performance', 'Recomposition', 'Vegetarian/Vegan', 'Custom'];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Save as a template</p>
      <div>
        <Label className="text-sm font-semibold mb-1.5 block">Template name</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="12-week fat loss"
          autoFocus
        />
      </div>
      <div>
        <Label className="text-xs font-semibold mb-1.5 block">Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'px-2.5 h-8 rounded-md text-[13px] font-medium border transition-colors',
                category === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-input hover:bg-accent'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={() => onSave(name, category)} disabled={!name} className="flex-1">
          Save template
        </Button>
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ clientName, planName, calories, startDate, hasNote, onViewClient, onGenerateAnother }) {
  return (
    <div className="py-4 space-y-5">
      <div>
        <h2 className="text-2xl text-foreground mb-1">Sent to {clientName}</h2>
        <p className="text-sm text-muted-foreground">
          {clientName} will see the plan in their app from the start date.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="text-sm font-semibold text-foreground text-right">{planName}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground">Calories</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">{calories} a day</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground">Starts</span>
          <span className="text-sm font-semibold text-foreground">{format(new Date(startDate), 'MMM d, yyyy')}</span>
        </div>
        {hasNote && (
          <div className="flex items-baseline justify-between gap-3 px-4 py-3">
            <span className="text-sm text-muted-foreground">Your note</span>
            <span className="text-sm font-semibold text-success">Sent as a message</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Button onClick={onViewClient} className="w-full">
          Open {clientName}'s profile <ArrowRight />
        </Button>
        <Button variant="outline" onClick={onGenerateAnother} className="w-full">
          Draft another plan
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Step4Assign({ result, onRegenerate, onOpenChange, onReset }) {
  const queryClient = useQueryClient();

  const [planName, setPlanName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [personalNote, setPersonalNote] = useState('');
  const [clientError, setClientError] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState(null); // { clientName, planName, calories, startDate, hasNote }

  // Build default plan name from result
  useEffect(() => {
    if (result) {
      const goalLabels = {
        fat_loss: 'Fat Loss', muscle_gain: 'Muscle Gain', recomp: 'Recomposition',
        performance: 'Performance', maintenance: 'Maintenance',
      };
      setPlanName(`${goalLabels[result.goal] || 'AI'} Plan — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
    }
  }, [result]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-picker'],
    queryFn: () => db.entities.Client.list('-created_date', 200),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['nutrition'],
    queryFn: () => db.entities.NutritionPlan.list('-created_date'),
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientExistingPlan = selectedClient?.nutrition_plan_id
    ? plans.find(p => p.id === selectedClient.nutrition_plan_id)
    : null;

  const buildMeals = (meals) => (meals || []).map(meal => ({
    name: meal.name,
    meal_name: meal.name,
    time: meal.time,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    instructions: meal.instructions,
    why_this_meal: meal.why_this_meal,
    option_b: meal.option_b,
    option_c: meal.option_c,
    foods: (meal.foods || []).map(f => ({
      name: f.name,
      food_name: f.name,
      amount: f.amount || f.amount_household || f.portion,
      amount_household: f.amount_household || f.amount,
      amount_grams: f.amount_grams || null,
      portion: f.amount || f.amount_household || f.portion,
      prep_method: f.prep_method || '',
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fats: Number(f.fats) || 0,
    })),
  }));

  const buildPlanData = (overrides = {}) => ({
    title: planName,
    tracking_mode: 'macros',
    calories: result.calories,
    protein_g: result.protein,
    carbs_g: result.carbs,
    fats_g: result.fats,
    meals: buildMeals(result.meals),
    rest_day_meals: buildMeals(result.rest_day_meals),
    hydration: result.hydration || null,
    coach_notes: result.coach_notes || null,
    client_notes: result.client_notes || '',
    shopping_list: result.shopping_list || [],
    supplements: (result.supplements || []).filter(s => s !== 'None').map(s =>
      typeof s === 'object' ? s : { name: s, category: 'supplement' }
    ),
    ai_generated: true,
    goal: result.goal,
    diet: result.diet,
    ...overrides,
  });

  const handleAssign = async () => {
    if (!selectedClientId) {
      setClientError('Please select a client first');
      return;
    }
    setClientError('');
    setAssigning(true);

    try {
      // 1. Deactivate any existing active plan for this client
      const existingPlans = await db.entities.NutritionPlan.filter({
        client_id: selectedClientId,
        status: 'active',
      });
      await Promise.all(
        existingPlans.map(p => db.entities.NutritionPlan.update(p.id, { status: 'inactive' }))
      );

      // 2. Create the new active plan with client_id + status
      const plan = await db.entities.NutritionPlan.create(buildPlanData({
        client_id: selectedClientId,
        status: 'active',
        start_date: startDate,
      }));

      // 3. Update client's assigned_nutrition_id
      await db.entities.Client.update(selectedClientId, {
        assigned_nutrition_id: plan.id,
      });

      // 4. Send personal note as a message if provided
      if (personalNote.trim()) {
        await db.entities.Message.create({
          client_id: selectedClientId,
          sender: 'coach',
          content: personalNote.trim(),
          type: 'text',
        });
      }

      // 5. Create in-app notification for the client (only if they have a portal account)
      if (selectedClient?.portal_user_id) {
        await db.entities.Notification.create({
          recipient_id: selectedClient.portal_user_id,
          category: 'ai',
          type: 'meal_plan_assigned',
          title: 'Your new meal plan is ready',
          body: `${planName} — ${result.calories} kcal/day`,
          is_read: false,
          related_client_id: selectedClientId,
          priority: 'high',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition', selectedClientId] });

      setSuccess({
        clientName: selectedClient?.full_name || selectedClient?.name || 'Client',
        planName,
        calories: result.calories,
        startDate,
        hasNote: !!personalNote.trim(),
        clientId: selectedClientId,
      });
    } catch (err) {
      toast.error('Failed to assign plan: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveTemplate = async (templateName, category) => {
    try {
      await db.entities.NutritionPlan.create(buildPlanData({
        title: templateName || planName,
        is_template: true,
        status: 'template',
        template_category: category,
      }));
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      toast.success(`Saved ${templateName || planName} as a template`);
      setShowTemplateForm(false);
    } catch (err) {
      toast.error('Failed to save template: ' + err.message);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await db.entities.NutritionPlan.create(buildPlanData({
        status: 'draft',
        is_draft: true,
      }));
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      toast.success('Saved as draft — find it in Nutrition → Drafts');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save draft: ' + err.message);
    }
  };

  // Success screen
  if (success) {
    return (
      <SuccessScreen
        {...success}
        onViewClient={() => {
          onOpenChange(false);
          // Navigate to client profile via URL
          window.location.href = `/client-profile?id=${success.clientId}`;
        }}
        onGenerateAnother={() => { onReset(); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Plan name header */}
      <div>
        <h2 className="text-2xl mb-1">Save and assign</h2>
        <p className="text-sm text-muted-foreground">Name the plan, pick the client, and add a note if you like.</p>
      </div>

      {/* Editable plan name */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-1.5 block">Plan name</Label>
        <input
          type="text"
          value={planName}
          onChange={e => setPlanName(e.target.value)}
          className="w-full text-[15px] font-semibold bg-card border border-input rounded-md px-3 h-10 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {/* Macro badges */}
        <p className="text-[13px] text-muted-foreground mt-2 tabular-nums">
          <span className="font-semibold text-foreground">{result.calories} kcal</span> · {result.protein} g protein · {result.carbs} g carbs · {result.fats} g fat
        </p>
      </div>

      {/* Assign to client card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Who is this plan for?</p>

        <ClientPicker value={selectedClientId} onChange={v => { setSelectedClientId(v); setClientError(''); }} />

        {clientError && (
          <p className="text-xs text-destructive font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {clientError}
          </p>
        )}

        {/* Existing plan warning */}
        {clientExistingPlan && (
          <div className="bg-warning-soft rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="text-sm text-foreground">
                {selectedClient?.full_name || 'This client'} already has a plan: <strong>{clientExistingPlan.title}</strong>
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setReplaceExisting(r => !r)}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors relative cursor-pointer',
                  replaceExisting ? 'bg-primary' : 'bg-secondary border border-border'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-all',
                  replaceExisting ? 'left-4' : 'left-0.5'
                )} />
              </div>
              <span className="text-sm font-semibold text-foreground">Replace the current plan</span>
            </label>
            {replaceExisting && (
              <p className="text-[13px] text-warning">{clientExistingPlan.title} will be replaced.</p>
            )}
          </div>
        )}

        {/* Start date */}
        <div>
          <Label className="text-xs font-semibold mb-1.5 block text-foreground flex items-center gap-1.5">
            Start date
          </Label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full border border-input rounded-md px-3 h-10 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Personal note */}
        <div>
          <Label className="text-xs font-semibold mb-1.5 block text-foreground flex items-center gap-1.5">
            Note to the client <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            value={personalNote}
            onChange={e => setPersonalNote(e.target.value)}
            placeholder={`${selectedClient?.full_name?.split(' ')[0] || 'Hi'}, this is built around your shift pattern. Start with breakfast and tell me how the portions feel.`}
            className="resize-none h-20 text-sm"
          />
          {personalNote && (
            <p className="text-[13px] text-muted-foreground mt-1">Sent as a message when you assign the plan.</p>
          )}
        </div>
      </div>

      {/* Template save form (inline) */}
      {showTemplateForm && (
        <TemplateSaveForm
          onSave={handleSaveTemplate}
          onCancel={() => setShowTemplateForm(false)}
        />
      )}

      {/* Save options */}
      <div className="space-y-2.5">
        {/* Primary — Assign to Client */}
        <Button
          onClick={handleAssign}
          disabled={assigning}
          className="w-full h-11"
        >
          {assigning ? (
            <><Loader2 className="animate-spin" /> Assigning</>
          ) : (
            <><User /> Assign to client</>
          )}
        </Button>

        {/* Secondary — Save as Template */}
        <Button
          variant="outline"
          onClick={() => setShowTemplateForm(t => !t)}
          className="w-full gap-2"
        >
          <BookmarkPlus /> Save as a template
        </Button>

        {/* Tertiary — Save as Draft */}
        <button
          type="button"
          onClick={handleSaveDraft}
          className="w-full text-sm font-semibold text-foreground underline underline-offset-4 py-1"
        >
          Save as a draft
        </button>
      </div>
    </div>
  );
}