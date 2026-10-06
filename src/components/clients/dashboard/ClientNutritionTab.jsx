import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stat, ComplianceStrip, complianceState } from '@/components/kit';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { SignedLink, SignedIframe } from '@/components/shared/SignedImage';

function weekNutritionCompliance(checkIns, weekStart, weekEnd) {
  const inRange = checkIns.filter(ci => {
    const d = new Date(ci.date);
    return d >= weekStart && d <= weekEnd;
  });
  const vals = inRange.map(ci => ci.compliance_nutrition).filter(v => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function PDFViewer({ pdfUrl, fileName }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Plan document</h3>
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
          title="Nutrition plan PDF"
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
      <h4 className="text-[13px] text-muted-foreground mb-2">
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
                    <span className="mt-0.5 text-[11px]">•</span>
                    <span>{food.name} {food.quantity && `(${food.quantity}${food.unit || ''})`}</span>
                  </li>
                ))}
              </ul>
            )}
            {meal.calories && (
              <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
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
    { label: '3 weeks ago', start: startOfWeek(subWeeks(now, 3)), end: endOfWeek(subWeeks(now, 3)) },
    { label: '2 weeks ago', start: startOfWeek(subWeeks(now, 2)), end: endOfWeek(subWeeks(now, 2)) },
    { label: 'Last week', start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) },
    { label: 'This week', start: startOfWeek(now), end: endOfWeek(now), active: true },
  ], []);

  const recentCompliance = useMemo(() => {
    const recent = checkIns.slice(0, 4);
    return recent.length ? Math.round(recent.reduce((s, c) => s + (c.compliance_nutrition ?? 50), 0) / recent.length) : null;
  }, [checkIns]);

  if (!nutritionPlan) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="font-semibold text-foreground mb-1">No nutrition plan assigned</p>
          <p className="text-xs text-muted-foreground mb-4">This client doesn't have a meal plan yet.</p>
          <Button onClick={() => navigate('/nutrition')}>Create a meal plan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Header with title and plan type */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h2 className="text-[24px] text-foreground">{nutritionPlan.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground">
                {nutritionPlan.plan_type === 'pdf' ? 'PDF plan' : 'Structured plan'}
              </span>
              {nutritionPlan.tracking_mode && (
                <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-card border border-border">
                  {nutritionPlan.tracking_mode === 'macros' ? 'Macro tracking' : 'Habit mode'}
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
        <div className="panel p-4 sm:p-5">
          <h3 className="text-[18px] text-foreground mb-3">Daily targets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Calories', value: nutritionPlan.calories, unit: 'kcal' },
              { label: 'Protein', value: nutritionPlan.protein_g, unit: 'g' },
              { label: 'Carbs', value: nutritionPlan.carbs_g, unit: 'g' },
              { label: 'Fats', value: nutritionPlan.fats_g, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <Stat key={label} label={label} value={value ? Number(value).toLocaleString('en-US') : '\u2014'} unit={value ? unit : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Compliance trend */}
      <div className="panel p-4 sm:p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[18px] text-foreground">Nutrition compliance</h3>
          {recentCompliance !== null && <span className="text-[13px] text-muted-foreground">{recentCompliance}% over the last 4 check-ins</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {weeks.map((w, i) => {
            const pct = weekNutritionCompliance(checkIns, w.start, w.end);
            return (
              <div key={i} className="min-w-0">
                <p className={cn('text-[13px]', w.active ? 'text-foreground font-medium' : 'text-muted-foreground')}>{w.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <ComplianceStrip weeks={[pct === null ? 'none' : complianceState(pct)]} size="sm" />
                  <span className="num text-[20px] text-foreground">{pct === null ? '\u2014' : `${pct}%`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meal Plan Overview (Structured Plans) */}
      {nutritionPlan.plan_type === 'structured' && (
        <div className="panel p-4 sm:p-5">
          <h3 className="text-[18px] text-foreground mb-3">Meals</h3>
          {nutritionPlan.meals && nutritionPlan.meals.length > 0 ? (
            <div className="space-y-4">
              <MealSection title="Training days" meals={nutritionPlan.meals} />
              {nutritionPlan.rest_day_meals && nutritionPlan.rest_day_meals.length > 0 && (
                <MealSection title="Rest days" meals={nutritionPlan.rest_day_meals} />
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
            <div className="panel p-4 sm:p-5">
              <h3 className="text-[18px] text-foreground mb-2">Hydration protocol</h3>
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
                      <p><span className="font-semibold">During workout:</span> {nutritionPlan.hydration.intra_workout}</p>
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
            <div className="panel p-4 sm:p-5">
              <h3 className="text-[18px] text-foreground mb-2">Supplements</h3>
              <ul className="space-y-2">
                {nutritionPlan.supplements.map((s, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    {s.dosage && <p className="text-muted-foreground text-[11px]">{s.dosage}</p>}
                    {s.timing && <p className="text-muted-foreground text-[11px]">{s.timing}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Shopping List */}
      {nutritionPlan.shopping_list && nutritionPlan.shopping_list.length > 0 && (
        <div className="panel p-4 sm:p-5">
          <h3 className="text-[18px] text-foreground mb-2">Shopping list</h3>
          <ul className="grid grid-cols-2 gap-2">
            {nutritionPlan.shopping_list.map((item, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coach Notes */}
      {nutritionPlan.coach_notes && (
        <div className="panel p-4">
          <h3 className="text-[18px] text-foreground mb-2">Coach notes</h3>
          {typeof nutritionPlan.coach_notes === 'string' ? (
            <p className="text-sm text-foreground/80">{nutritionPlan.coach_notes}</p>
          ) : (
            <div className="text-sm text-foreground/80 space-y-1.5">
              {Object.entries(nutritionPlan.coach_notes).map(([key, value]) => (
                <p key={key}><span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {value}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer (for PDF plans) */}
      {nutritionPlan.plan_type === 'pdf' && nutritionPlan.pdf_file_url && (
        <div className="panel p-4 sm:p-5">
          <PDFViewer pdfUrl={nutritionPlan.pdf_file_url} fileName={`${nutritionPlan.title}.pdf`} />
        </div>
      )}

      {/* Summary for PDF plans */}
      {nutritionPlan.plan_type === 'pdf' && nutritionPlan.client_notes && (
        <div className="panel p-4">
          <h3 className="text-[18px] text-foreground mb-2">Plan summary</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{nutritionPlan.client_notes}</p>
        </div>
      )}
    </div>
  );
}