import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Download, AlertCircle } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { SignedLink, SignedIframe } from '@/components/shared/SignedImage';

function weekNutritionCompliance(checkIns, weekStart, weekEnd) {
  const inRange = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return d >= weekStart && d <= weekEnd;
  });
  if (!inRange.length) return 0;
  return Math.round(inRange.reduce((s, ci) => s + (ci.compliance_nutrition ?? 0), 0) / inRange.length);
}

function Ring({ pct = 0, label, size = 72, active = false }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(pct / 100, 1)) * circ;
  const activeColor = 'var(--tc-primary)';
  const inactiveColor = 'var(--tc-muted-foreground)';

  return (
    <div className={cn('flex flex-col items-center gap-1.5', active && 'scale-105')}>
      <div className="relative rounded-full">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tc-border)" strokeWidth={active ? 7 : 5} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={pct > 0 ? (active ? activeColor : inactiveColor) : 'var(--tc-border)'}
            strokeWidth={active ? 7 : 5}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold tabular-nums leading-none', active ? 'text-sm' : 'text-xs')}
            style={{ color: active ? activeColor : 'var(--tc-muted-foreground)' }}>
            {pct}%
          </span>
        </div>
      </div>
      <p className="text-[10px] font-semibold leading-tight" style={{ color: active ? 'var(--tc-foreground)' : 'var(--tc-muted-foreground)' }}>
        {label}
      </p>
    </div>
  );
}

function PDFViewer({ pdfUrl, fileName }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Plan Document</h3>
        <SignedLink
          href={pdfUrl}
          download={fileName || 'nutrition-plan.pdf'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </SignedLink>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card" style={{ height: '600px' }}>
        <SignedIframe
          src={pdfUrl}
          title="Nutrition Plan PDF"
          className="w-full h-full"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}

function MealSection({ title, meals = [] }) {
  if (!meals || meals.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--tc-muted-foreground)' }}>
        {title}
      </h4>
      <div className="space-y-2">
        {meals.map((meal, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3 text-sm">
            <p className="font-semibold text-foreground mb-1">{meal.name || `Meal ${i + 1}`}</p>
            {meal.foods && meal.foods.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-2">
                {meal.foods.map((food, j) => (
                  <li key={j} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-[10px]">•</span>
                    <span>{food.name} {food.quantity && `(${food.quantity}${food.unit || ''})`}</span>
                  </li>
                ))}
              </ul>
            )}
            {meal.calories && (
              <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                ≈ {meal.calories} kcal
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientNutritionTab({ client, nutritionPlan, checkIns = [] }) {
  const navigate = useNavigate();

  const now = new Date();
  const weeks = useMemo(() => [
    { label: '2 Wks Ago', start: startOfWeek(subWeeks(now, 2)), end: endOfWeek(subWeeks(now, 2)) },
    { label: '1 Wk Ago', start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) },
    { label: 'This Week', start: startOfWeek(now), end: endOfWeek(now), active: true },
  ], []);

  const recentCompliance = useMemo(() => {
    const recent = checkIns.slice(0, 4);
    return recent.length ? Math.round(recent.reduce((s, c) => s + (c.compliance_nutrition ?? 50), 0) / recent.length) : null;
  }, [checkIns]);

  if (!nutritionPlan) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <p className="font-semibold text-foreground mb-1">No Nutrition Plan Assigned</p>
          <p className="text-xs text-muted-foreground mb-4">This client doesn't have a meal plan yet.</p>
          <button
            onClick={() => navigate('/nutrition')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground transition-all"
            style={{ background: 'var(--tc-primary)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Create Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5 bg-muted">
      {/* Header with title and plan type */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{nutritionPlan.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: nutritionPlan.plan_type === 'pdf' ? 'var(--tc-ai)' : 'var(--tc-accent)',
                  color: nutritionPlan.plan_type === 'pdf' ? 'var(--tc-ai)' : 'var(--tc-primary)',
                }}>
                {nutritionPlan.plan_type === 'pdf' ? '📄 PDF Plan' : '🍽️ Structured Plan'}
              </span>
              {nutritionPlan.tracking_mode && (
                <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-card border border-border">
                  {nutritionPlan.tracking_mode === 'macros' ? '📊 Macro Tracking' : '✓ Habit Mode'}
                </span>
              )}
            </div>
          </div>
          {nutritionPlan.plan_type === 'structured' && (
            <button
              onClick={() => navigate(`/nutrition`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary transition-colors flex-shrink-0"
              title="Edit plan meals and structure"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
        {nutritionPlan.description && (
          <p className="text-xs text-muted-foreground">{nutritionPlan.description}</p>
        )}
      </div>

      {/* Daily Macro Targets */}
      {nutritionPlan.plan_type === 'structured' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--tc-muted-foreground)' }}>
            Daily Targets
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Calories', value: nutritionPlan.calories, unit: 'kcal', icon: '🔥', color: 'var(--kc-ea580c)' },
              { label: 'Protein', value: nutritionPlan.protein_g, unit: 'g', icon: '💪', color: 'var(--tc-primary)' },
              { label: 'Carbs', value: nutritionPlan.carbs_g, unit: 'g', icon: '🌾', color: 'var(--tc-warning)' },
              { label: 'Fats', value: nutritionPlan.fats_g, unit: 'g', icon: '🥑', color: 'var(--tc-destructive)' },
            ].map(({ label, value, unit, icon, color }) => (
              <div key={label} className="rounded-lg p-3 bg-gradient-to-br from-card to-muted border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{icon}</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                    {label}
                  </p>
                </div>
                <p className="text-base font-bold text-foreground">{value || '—'}</p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Trends */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tc-muted-foreground)' }}>
            Adherence
          </h3>
          {recentCompliance !== null && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: recentCompliance >= 75 ? 'var(--tc-success)' : recentCompliance >= 50 ? 'var(--tc-warning)' : 'var(--tc-destructive)',
                color: recentCompliance >= 75 ? 'var(--tc-success)' : recentCompliance >= 50 ? 'var(--tc-warning)' : 'var(--tc-destructive)',
              }}>
              {recentCompliance}% Avg
            </span>
          )}
        </div>
        <div className="flex items-end justify-around gap-2">
          {weeks.map((w, i) => {
            const pct = weekNutritionCompliance(checkIns, w.start, w.end);
            return (
              <Ring
                key={i}
                pct={pct}
                label={w.label}
                active={!!w.active}
                size={w.active ? 82 : 68}
              />
            );
          })}
        </div>
      </div>

      {/* Meal Plan Overview (Structured Plans) */}
      {nutritionPlan.plan_type === 'structured' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--tc-muted-foreground)' }}>
            Meal Plan
          </h3>
          {nutritionPlan.meals && nutritionPlan.meals.length > 0 ? (
            <div className="space-y-4">
              <MealSection title="Training Days" meals={nutritionPlan.meals} />
              {nutritionPlan.rest_day_meals && nutritionPlan.rest_day_meals.length > 0 && (
                <MealSection title="Rest Days" meals={nutritionPlan.rest_day_meals} />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No meal details configured yet</p>
          )}
        </div>
      )}

      {/* Supplements & Hydration */}
      {nutritionPlan.plan_type === 'structured' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hydration */}
          {nutritionPlan.hydration && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--tc-primary)' }}>
                💧 Hydration Protocol
              </h3>
              <div className="text-xs text-foreground space-y-1.5">
                {typeof nutritionPlan.hydration === 'string' ? (
                  <p>{nutritionPlan.hydration}</p>
                ) : (
                  <div>
                    {nutritionPlan.hydration.daily_intake && (
                      <p><span className="font-semibold">Daily:</span> {nutritionPlan.hydration.daily_intake}</p>
                    )}
                    {nutritionPlan.hydration.pre_workout && (
                      <p><span className="font-semibold">Pre-Workout:</span> {nutritionPlan.hydration.pre_workout}</p>
                    )}
                    {nutritionPlan.hydration.intra_workout && (
                      <p><span className="font-semibold">During Workout:</span> {nutritionPlan.hydration.intra_workout}</p>
                    )}
                    {nutritionPlan.hydration.post_workout && (
                      <p><span className="font-semibold">Post-Workout:</span> {nutritionPlan.hydration.post_workout}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supplements */}
          {nutritionPlan.supplements && nutritionPlan.supplements.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--tc-ai)' }}>
                💊 Supplements
              </h3>
              <ul className="space-y-2">
                {nutritionPlan.supplements.map((s, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    {s.dosage && <p className="text-muted-foreground text-[10px]">{s.dosage}</p>}
                    {s.timing && <p className="text-muted-foreground text-[10px]">{s.timing}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Shopping List */}
      {nutritionPlan.shopping_list && nutritionPlan.shopping_list.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--tc-muted-foreground)' }}>
            🛒 Shopping List
          </h3>
          <ul className="grid grid-cols-2 gap-2">
            {nutritionPlan.shopping_list.map((item, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-[10px] mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coach Notes */}
      {nutritionPlan.coach_notes && (
        <div className="bg-accent border border-accent rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--tc-primary)' }}>
            📝 Coach Notes
          </h3>
          {typeof nutritionPlan.coach_notes === 'string' ? (
            <p className="text-xs text-primary">{nutritionPlan.coach_notes}</p>
          ) : (
            <div className="text-xs text-primary space-y-1.5">
              {Object.entries(nutritionPlan.coach_notes).map(([key, value]) => (
                <p key={key}><span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {value}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer (for PDF plans) */}
      {nutritionPlan.plan_type === 'pdf' && nutritionPlan.pdf_file_url && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <PDFViewer pdfUrl={nutritionPlan.pdf_file_url} fileName={`${nutritionPlan.title}.pdf`} />
        </div>
      )}

      {/* Summary for PDF plans */}
      {nutritionPlan.plan_type === 'pdf' && nutritionPlan.client_notes && (
        <div className="bg-warning/10 border border-warning rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--tc-warning)' }}>
            📋 Plan Summary
          </h3>
          <p className="text-xs text-warning leading-relaxed">{nutritionPlan.client_notes}</p>
        </div>
      )}
    </div>
  );
}