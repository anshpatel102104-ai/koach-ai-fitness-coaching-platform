import { db } from '@/api/supabaseClient';

/**
 * Export everything the signed-in coach can read as one JSON file, downloaded
 * in the browser. Reads go through RLS, so it contains exactly the caller's own
 * (and their team's) data — nothing is assembled server-side.
 */
const ENTITIES = [
  'Client', 'WorkoutProgram', 'NutritionPlan', 'CheckIn', 'WorkoutSession', 'Message',
  'Habit', 'HabitCompletion', 'Goal', 'WeighIn', 'DailyLog', 'FoodLog', 'InBodyScan',
  'CoachingSession', 'Invoice', 'Payment', 'Lead', 'CoachingPackage', 'CheckInForm',
  'ExerciseLibrary', 'MealTemplate', 'AutomationRule',
];

export async function exportMyData(user) {
  const out = {
    exported_at: new Date().toISOString(),
    account: { id: user?.id, email: user?.email, full_name: user?.full_name },
    data: {},
    errors: {},
  };
  for (const name of ENTITIES) {
    try {
      out.data[name] = await db.entities[name].list('-created_date', 10000);
    } catch (e) {
      out.errors[name] = e?.message || 'could not be read';
    }
  }
  if (!Object.keys(out.errors).length) delete out.errors;
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `koach-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return out;
}
