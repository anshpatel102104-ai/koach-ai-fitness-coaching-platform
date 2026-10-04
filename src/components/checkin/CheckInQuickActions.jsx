import React, { useState } from 'react';
import {
  MessageSquare, Flame, Footprints, ClipboardCheck,
  Sparkles, Check, Loader2, ChevronUp, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

/* ── Tiny inline confirmation pill ── */
function ConfirmPill({ onConfirm, onCancel, label = 'Confirm?' }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <button
        onClick={onConfirm}
        className="text-[11px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full hover:bg-success/20 transition-colors"
      >
        Yes
      </button>
      <button
        onClick={onCancel}
        className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full hover:bg-secondary/70 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

/* ── Calorie adjuster sub-panel ── */
function CaloriesPanel({ checkIn, client, onDone }) {
  const [saving, setSaving] = useState(false);

  const adjust = async (delta) => {
    if (!client?.assigned_nutrition_id) {
      toast.error('No nutrition plan assigned to this client');
      return;
    }
    setSaving(true);
    // Optimistic close + show result immediately
    const optimisticLabel = delta > 0 ? `+${delta} kcal` : `${delta} kcal`;
    onDone(optimisticLabel);
    toast.success(`Calories ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)} kcal ✓`);

    const plans = await db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id });
    const plan = plans[0];
    if (plan) {
      const newCals = Math.max(1000, (plan.calories || 2000) + delta);
      Promise.all([
        db.entities.NutritionPlan.update(plan.id, { calories: newCals }),
        db.entities.Message.create({
          client_id: checkIn.client_id,
          client_name: checkIn.client_name,
          sender: 'coach',
          content: `Your daily calorie target has been updated to ${newCals} kcal (${delta > 0 ? '+' : ''}${delta} adjustment based on your check-in).`,
          tag: 'nutrition',
          is_read: false,
        }),
      ]);
    }
    setSaving(false);
  };

  return (
    <div className="mt-2 p-3 bg-orange-500/8 border border-orange-500/20 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-orange-400">Adjust daily calories</p>
      <div className="flex gap-2">
        {[[-250, '−250'], [-150, '−150'], [+150, '+150'], [+250, '+250']].map(([delta, label]) => (
          <button
            key={delta}
            onClick={() => adjust(delta)}
            disabled={saving}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-bold border transition-all active:scale-[0.96]',
              delta < 0
                ? 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20'
                : 'bg-success/10 border-success/20 text-success hover:bg-success/20'
            )}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Cardio adjuster sub-panel ── */
function CardioPanel({ checkIn, client, onDone }) {
  const [saving, setSaving] = useState(false);

  const adjust = async (direction) => {
    setSaving(true);
    const msg = direction === 'up'
      ? 'Your cardio has been increased — add 1 extra session or 20 min to your current sessions this week.'
      : 'Your cardio has been reduced — drop 1 session or reduce session duration by 15–20 min this week.';

    // Optimistic
    onDone(direction === 'up' ? '+1 session' : '−1 session');
    toast.success(`Cardio ${direction === 'up' ? 'increased' : 'reduced'} ✓`);

    const existing = checkIn.coach_notes || '';
    Promise.all([
      db.entities.CheckIn.update(checkIn.id, {
        coach_notes: existing ? existing + '\n[Cardio] ' + msg : '[Cardio] ' + msg,
      }),
      db.entities.Message.create({
        client_id: checkIn.client_id,
        client_name: checkIn.client_name,
        sender: 'coach',
        content: msg,
        tag: 'training',
        is_read: false,
      }),
    ]);
    setSaving(false);
  };

  return (
    <div className="mt-2 p-3 bg-primary/8 border border-primary/20 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-primary">Adjust steps / cardio</p>
      <div className="flex gap-2">
        <button
          onClick={() => adjust('up')}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold border bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 active:scale-[0.96] transition-all"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ChevronUp className="w-3.5 h-3.5" /> Increase</>}
        </button>
        <button
          onClick={() => adjust('down')}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold border bg-secondary border-border text-muted-foreground hover:bg-secondary/70 active:scale-[0.96] transition-all"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ChevronDown className="w-3.5 h-3.5" /> Decrease</>}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function CheckInQuickActions({
  checkIn, client, allClientCIs = [],
  onSendFeedback, onMarkReviewed, isReviewed, saving
}) {
  const [openPanel, setOpenPanel] = useState(null); // 'calories' | 'cardio'
  const [calResult, setCalResult] = useState(null);
  const [cardioResult, setCardioResult] = useState(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const togglePanel = (name) => setOpenPanel(p => p === name ? null : name);

  const handleApplyAI = async () => {
    if (aiDone || aiSaving) return;
    setAiSaving(true);
    const result = (await db.functions.invoke('aiMessageAssistant', {
      action: 'generateCheckInResponse', client, checkIn, recentCheckIns: allClientCIs,
    })).data?.message || '';

    // Optimistic: mark done immediately, fire-and-forget saves
    setAiDone(true);
    setAiSaving(false);
    toast.success('AI feedback sent! ✨', { duration: 2500 });

    const existing = checkIn.coach_notes ? checkIn.coach_notes + '\n\n' : '';
    Promise.all([
      db.entities.CheckIn.update(checkIn.id, {
        coach_notes: existing + result,
        coach_responded: true,
      }),
      db.entities.Message.create({
        client_id: checkIn.client_id,
        client_name: checkIn.client_name,
        sender: 'coach',
        content: result,
        tag: 'check_in',
        is_read: false,
      }),
    ]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</p>

      {/* ── 4 primary action buttons ── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Send AI Feedback */}
        <button
          onClick={handleApplyAI}
          disabled={aiSaving || aiDone}
          className={cn(
            'flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97]',
            aiDone
              ? 'bg-ai/10 border-ai/20 text-ai opacity-60 cursor-default'
              : 'bg-ai/10 border-ai/20 text-ai hover:bg-ai/20'
          )}
        >
          {aiSaving
            ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            : aiDone
              ? <Check className="w-4 h-4 flex-shrink-0" />
              : <Sparkles className="w-4 h-4 flex-shrink-0" />
          }
          <span className="leading-tight">{aiDone ? 'Feedback Sent' : 'Send AI Feedback'}</span>
        </button>

        {/* Write Custom Feedback */}
        <button
          onClick={onSendFeedback}
          className="flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight">Write Feedback</span>
        </button>

        {/* Calories */}
        <button
          onClick={() => togglePanel('calories')}
          className={cn(
            'flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97]',
            calResult
              ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 opacity-60 cursor-default'
              : openPanel === 'calories'
                ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
          )}
          disabled={!!calResult}
        >
          <Flame className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight">{calResult ? `Calories ${calResult}` : 'Adjust Calories'}</span>
        </button>

        {/* Cardio */}
        <button
          onClick={() => togglePanel('cardio')}
          className={cn(
            'flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97]',
            cardioResult
              ? 'bg-primary/10 border-primary/20 text-primary opacity-60 cursor-default'
              : openPanel === 'cardio'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
          )}
          disabled={!!cardioResult}
        >
          <Footprints className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight">{cardioResult ? `Cardio ${cardioResult}` : 'Adjust Cardio'}</span>
        </button>
      </div>

      {/* ── Inline sub-panels (expand below buttons) ── */}
      {openPanel === 'calories' && (
        <CaloriesPanel
          checkIn={checkIn}
          client={client}
          onDone={(result) => { setCalResult(result); setOpenPanel(null); }}
        />
      )}
      {openPanel === 'cardio' && (
        <CardioPanel
          checkIn={checkIn}
          client={client}
          onDone={(result) => { setCardioResult(result); setOpenPanel(null); }}
        />
      )}

      {/* ── Mark Reviewed ── */}
      <button
        onClick={onMarkReviewed}
        disabled={isReviewed}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 active:scale-[0.97]',
          isReviewed
            ? 'bg-success/15 border-success/30 text-success cursor-default scale-[1.01]'
            : 'bg-success/10 border-success/20 text-success hover:bg-success/20 hover:scale-[1.01]'
        )}
      >
        {saving
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : isReviewed
            ? <><Check className="w-4 h-4 animate-[scale-in_0.2s_ease]" /> Marked as Reviewed</>
            : <><ClipboardCheck className="w-4 h-4" /> Mark as Reviewed</>
        }
      </button>
    </div>
  );
}