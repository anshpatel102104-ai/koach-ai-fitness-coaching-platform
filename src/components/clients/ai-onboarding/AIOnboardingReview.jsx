import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/kit';

export default function AIOnboardingReview({ client, program: initialProgram, mealPlan: initialMealPlan, onApprove, onBack }) {
  const [program, setProgram] = useState(initialProgram);
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [activeTab, setActiveTab] = useState('program');
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [programTitle, setProgramTitle] = useState(initialProgram?.title || '');

  const handleApprove = async () => {
    setSaving(true);
    const finalProgram = { ...program, title: programTitle };
    await onApprove(finalProgram, mealPlan);
    setSaving(false);
  };

  const trainingMeals = mealPlan?.training_day?.meals || mealPlan?.meals || [];
  const coachNotes = mealPlan?.coach_notes || {};

  return (
    <div className="h-full flex flex-col">
      {/* Sub-nav */}
      <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-border flex-shrink-0 bg-card">
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[{ value: 'program', label: 'Training program' }, { value: 'nutrition', label: 'Meal plan' }]}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        {activeTab === 'program' && (
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
            {/* Program header */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={programTitle}
                    onChange={e => setProgramTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                    className="flex-1 text-base font-bold text-foreground border-b-2 border-primary outline-none bg-transparent"
                  />
                ) : (
                  <h3 className="text-[20px] text-foreground flex-1">{programTitle}</h3>
                )}
                <button onClick={() => setEditingTitle(t => !t)} className="text-muted-foreground hover:text-foreground" aria-label="Rename program">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{program.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {[program.difficulty, program.duration_weeks ? `${program.duration_weeks} weeks` : null, program.days_per_week ? `${program.days_per_week} days a week` : null, program.category]
                  .filter(Boolean).map((label, i) => <Badge key={i} variant="secondary">{label}</Badge>)}
              </div>
              {program.coach_rationale && (
                <div className="mt-4 rounded-lg bg-ai text-ai-foreground p-4">
                  <p className="text-[13px] text-ai-foreground/60 mb-1">Why this split</p>
                  <p className="text-sm text-ai-foreground/90">{program.coach_rationale.split}</p>
                </div>
              )}
            </div>

            {/* Workouts */}
            <div className="space-y-2">
              <p className="text-[13px] text-muted-foreground">
                Training days, {program.workouts?.length || 0}
              </p>
              {(program.workouts || []).map((workout, di) => (
                <div key={di} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedDay(expandedDay === di ? -1 : di)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground">{workout.day_name}</p>
                      {workout.workout_notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{workout.workout_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">{workout.exercises?.length || 0} exercises</span>
                      {expandedDay === di ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {expandedDay === di && (
                    <div className="border-t border-border divide-y divide-muted">
                      {(workout.exercises || []).map((ex, ei) => (
                        <div key={ei} className="px-5 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                              {ex.section && ex.section !== 'main' && (
                                <Badge variant="secondary">{ex.section}</Badge>
                              )}
                            </div>
                            {ex.notes && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{ex.notes}</p>}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-bold text-foreground tabular-nums">{ex.sets} × {ex.reps}</p>
                            {ex.rpe && <p className="text-[11px] text-muted-foreground">RPE {ex.rpe}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
            {/* Meal plan header */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-[20px] text-foreground mb-1">Meal plan for {client.name}</h3>
              {coachNotes.why_these_calories && (
                <p className="text-sm text-muted-foreground mb-3">{coachNotes.why_these_calories}</p>
              )}
              {mealPlan?.weekly_overview && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: 'Average a day', value: `${mealPlan.weekly_overview.avg_daily_calories} kcal` },
                    { label: 'Training days', value: mealPlan.weekly_overview.training_days },
                    { label: 'Weekly protein', value: `${mealPlan.weekly_overview.weekly_protein_target}g` },
                  ].map((s, i) => (
                    <div key={i}>
                      <p className="text-[13px] text-muted-foreground">{s.label}</p>
                      <p className="num text-[20px] text-foreground mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Training day meals */}
            <div className="space-y-2">
              <p className="text-[13px] text-muted-foreground">
                Training day meals, {trainingMeals.length}
              </p>
              {trainingMeals.map((meal, mi) => (
                <div key={mi} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{meal.name}</p>
                      <p className="text-[11px] text-muted-foreground">{meal.time}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-sm font-bold text-foreground">{meal.calories} kcal</p>
                        <p className="text-[11px] text-muted-foreground">P:{meal.protein}g · C:{meal.carbs}g · F:{meal.fats}g</p>
                      </div>
                    </div>
                  </div>
                  {(meal.foods || []).length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-border">
                      {meal.foods.map((food, fi) => (
                        <div key={fi} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{food.name}</span>
                          <span className="text-muted-foreground">{food.amount_household || `${food.amount}${food.unit}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {coachNotes.first_2_weeks && (
              <div className="rounded-xl bg-ai text-ai-foreground p-4">
                <p className="text-[13px] text-ai-foreground/60 mb-1">First two weeks</p>
                <p className="text-sm text-ai-foreground/90">{coachNotes.first_2_weeks}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve footer */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-border bg-card">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back to questions
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-muted-foreground hidden md:block">Check both tabs, then approve.</p>
          <Button onClick={handleApprove} disabled={saving}>
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Saving' : 'Approve and save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
