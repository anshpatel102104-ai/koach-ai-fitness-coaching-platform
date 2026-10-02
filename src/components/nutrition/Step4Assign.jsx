import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase as base44 } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  User, Search, CheckCircle2, CalendarDays, AlertTriangle,
  ChevronDown, BookmarkPlus, FileText, Send, Users, UserPlus,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Client Picker ─────────────────────────────────────────────────────────────
function ClientPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-picker'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
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
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border bg-background hover:border-primary/40 transition-all text-left"
      >
        {selected ? (
          <>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {(selected.full_name || selected.name || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selected.full_name || selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.email || ''}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground flex-1">Select a client…</span>
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
            className="absolute z-50 left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
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
                  placeholder="Search clients…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">No clients found</div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left',
                      value === c.id && 'bg-accent/50'
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {(c.full_name || c.name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.full_name || c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email || ''}</p>
                    </div>
                    {c.nutrition_plan_id && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning shrink-0">Has plan</span>
                    )}
                    {value === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
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
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-lg"
    >
      <p className="text-sm font-bold text-foreground">Save as Template</p>
      <div>
        <Label className="text-xs font-semibold mb-1.5 block">Template Name</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. 12-Week Fat Loss Standard"
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
                'px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                category === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={() => onSave(name, category)} disabled={!name} className="flex-1 bg-gradient-to-r from-primary to-ai text-white border-0">
          Save Template
        </Button>
      </div>
    </motion.div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ clientName, planName, calories, startDate, hasNote, onViewClient, onGenerateAnother }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-6 gap-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
      >
        <CheckCircle2 className="w-10 h-10 text-success" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold font-heading text-foreground mb-1">
          Plan assigned to {clientName}! 🎉
        </h2>
        <p className="text-sm text-muted-foreground">
          {clientName} will see their new plan in the client app
        </p>
      </div>

      <div className="w-full bg-gradient-to-br from-accent to-ai/10 border border-accent rounded-2xl p-4 space-y-2 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base">🥗</span>
          <span className="text-sm font-bold text-foreground">{planName}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-card border border-primary/20 text-primary">
            {calories} kcal/day
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Starts {format(new Date(startDate), 'MMM d, yyyy')}
          </span>
        </div>
        {hasNote && (
          <p className="text-xs text-success font-semibold flex items-center gap-1">
            <Send className="w-3.5 h-3.5" /> Message sent to {clientName} ✓
          </p>
        )}
      </div>

      <div className="w-full space-y-2 pt-1">
        <Button onClick={onViewClient} className="w-full gap-2 bg-gradient-to-r from-primary to-ai text-white border-0">
          View {clientName}'s Profile <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={onGenerateAnother} className="w-full gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Generate Another Plan
        </Button>
      </div>
    </motion.div>
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
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['nutrition'],
    queryFn: () => base44.entities.NutritionPlan.list('-created_date'),
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
      const existingPlans = await base44.entities.NutritionPlan.filter({
        client_id: selectedClientId,
        status: 'active',
      });
      await Promise.all(
        existingPlans.map(p => base44.entities.NutritionPlan.update(p.id, { status: 'inactive' }))
      );

      // 2. Create the new active plan with client_id + status
      const plan = await base44.entities.NutritionPlan.create(buildPlanData({
        client_id: selectedClientId,
        status: 'active',
        start_date: startDate,
      }));

      // 3. Update client's assigned_nutrition_id
      await base44.entities.Client.update(selectedClientId, {
        assigned_nutrition_id: plan.id,
      });

      // 4. Send personal note as a message if provided
      if (personalNote.trim()) {
        await base44.entities.Message.create({
          client_id: selectedClientId,
          sender: 'coach',
          content: personalNote.trim(),
          type: 'text',
        });
      }

      // 5. Create in-app notification for the client (only if they have a portal account)
      if (selectedClient?.portal_user_id) {
        await base44.entities.Notification.create({
          recipient_id: selectedClient.portal_user_id,
          category: 'ai',
          type: 'meal_plan_assigned',
          title: 'Your new meal plan is ready! 🥗',
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
      await base44.entities.NutritionPlan.create(buildPlanData({
        title: templateName || planName,
        is_template: true,
        status: 'template',
        template_category: category,
      }));
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      toast.success(`Template "${templateName || planName}" saved to library!`);
      setShowTemplateForm(false);
    } catch (err) {
      toast.error('Failed to save template: ' + err.message);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await base44.entities.NutritionPlan.create(buildPlanData({
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
        <h2 className="text-xl font-bold font-heading mb-1">Save & Assign Plan</h2>
        <p className="text-sm text-muted-foreground">Name the plan and assign it to a client</p>
      </div>

      {/* Editable plan name */}
      <div>
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Plan Name</Label>
        <input
          type="text"
          value={planName}
          onChange={e => setPlanName(e.target.value)}
          className="w-full text-base font-bold bg-background border border-input rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        {/* Macro badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            🔥 {result.calories} kcal
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive">
            P {result.protein}g
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning">
            C {result.carbs}g
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent text-primary border border-primary">
            F {result.fats}g
          </span>
        </div>
      </div>

      {/* Assign to client card */}
      <div className="bg-gradient-to-br from-accent/60 to-ai/60 border border-accent rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">Who is this plan for?</p>
        </div>

        <ClientPicker value={selectedClientId} onChange={v => { setSelectedClientId(v); setClientError(''); }} />

        {clientError && (
          <p className="text-xs text-destructive font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {clientError}
          </p>
        )}

        {/* Existing plan warning */}
        {clientExistingPlan && (
          <div className="bg-warning/10 border border-warning rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="text-xs font-semibold text-warning">
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
              <span className="text-xs font-semibold text-warning">Replace existing plan</span>
            </label>
            {replaceExisting && (
              <p className="text-[11px] text-warning">⚠️ This will replace <strong>{clientExistingPlan.title}</strong></p>
            )}
          </div>
        )}

        {/* Start date */}
        <div>
          <Label className="text-xs font-semibold mb-1.5 block text-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Start Date
          </Label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Personal note */}
        <div>
          <Label className="text-xs font-semibold mb-1.5 block text-foreground flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Personal Note to Client <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            value={personalNote}
            onChange={e => setPersonalNote(e.target.value)}
            placeholder={`e.g. "Hey ${selectedClient?.full_name?.split(' ')[0] || 'there'}, I built this plan specifically around your schedule — let's get it!"`}
            className="resize-none h-20 text-sm"
          />
          {personalNote && (
            <p className="text-[11px] text-muted-foreground mt-1">This message will be sent to the client when the plan is assigned</p>
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
          className="w-full h-11 gap-2 bg-gradient-to-r from-primary to-ai hover:from-primary hover:to-ai border-0 text-white font-bold text-sm"
        >
          {assigning ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Assigning…
            </span>
          ) : (
            <><User className="w-4 h-4" /> Assign to Client</>
          )}
        </Button>

        {/* Secondary — Save as Template */}
        <Button
          variant="outline"
          onClick={() => setShowTemplateForm(t => !t)}
          className="w-full gap-2"
        >
          <BookmarkPlus className="w-4 h-4" /> Save as Template
        </Button>

        {/* Tertiary — Save as Draft */}
        <button
          type="button"
          onClick={handleSaveDraft}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 py-1"
        >
          <FileText className="w-3.5 h-3.5" /> Save as Draft
        </button>
      </div>
    </div>
  );
}