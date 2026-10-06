// Supabase Edge Function: seedExerciseLibrary  (Migration Step 5e)
//
// Faithful port of base44/functions/seedExerciseLibrary — seeds up to 100
// exercises from the open free-exercise-db dataset into the CALLER's library.
// The "already seeded" guard and every mapping function are verbatim; rows
// are created with created_by = caller (Base44 used the user context).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const DATA_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// Map dataset muscle names → our enum values (verbatim)
function mapMuscle(muscles: string[] = [], category = '') {
  const all = [...muscles].map((m) => m.toLowerCase());
  const cat = category.toLowerCase();

  if (all.some((m) => m.includes('pectoralis') || m.includes('chest')) || cat.includes('chest')) return 'chest';
  if (all.some((m) => m.includes('latissimus') || m.includes('trapezius') || m.includes('rhomboid') || m.includes('erector')) || cat.includes('back')) return 'back';
  if (all.some((m) => m.includes('deltoid') || m.includes('shoulder')) || cat.includes('shoulder')) return 'shoulders';
  if (all.some((m) => m.includes('bicep')) || cat.includes('bicep')) return 'biceps';
  if (all.some((m) => m.includes('tricep')) || cat.includes('tricep')) return 'triceps';
  if (all.some((m) => m.includes('gluteus') || m.includes('glute')) || cat.includes('glute')) return 'glutes';
  if (all.some((m) => m.includes('quadricep') || m.includes('hamstring') || m.includes('calf') || m.includes('gastrocnemius') || m.includes('soleus')) || cat.includes('leg') || cat.includes('quad') || cat.includes('hamstring')) return 'legs';
  if (all.some((m) => m.includes('abdominal') || m.includes('oblique') || m.includes('core')) || cat.includes('core') || cat.includes('ab')) return 'core';
  if (cat.includes('cardio') || cat.includes('olympic')) return 'cardio';
  return 'full_body';
}

function mapEquipment(equipment = '') {
  const e = equipment.toLowerCase();
  if (e.includes('barbell') || e.includes('ez-bar') || e.includes('ez curl')) return 'barbell';
  if (e.includes('dumbbell')) return 'dumbbell';
  if (e.includes('cable')) return 'cable';
  if (e.includes('machine') || e.includes('lever')) return 'machine';
  if (e.includes('kettlebell')) return 'kettlebell';
  if (e.includes('resistance band') || e.includes('band')) return 'resistance_band';
  if (e.includes('trx') || e.includes('suspension')) return 'trx';
  if (!equipment || e.includes('body') || e.includes('none')) return 'bodyweight';
  return 'other';
}

function mapDifficulty(level = '') {
  const l = level.toLowerCase();
  if (l.includes('beginner') || l.includes('novice')) return 'beginner';
  if (l.includes('expert') || l.includes('advanced')) return 'advanced';
  return 'intermediate';
}

function buildImageUrl(images?: string[]) {
  if (!images || images.length === 0) return '';
  return IMAGE_BASE + images[0];
}

serve('seedExerciseLibrary', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    const userId = caller.auth.id;

    // Already seeded? (scoped to the caller's library)
    const { data: existing } = await svc.from('exercise_library')
      .select('id').eq('created_by', userId).limit(60);
    if (existing && existing.length >= 50) {
      return jsonResponse({ message: 'Library already seeded', count: existing.length });
    }

    const res = await fetch(DATA_URL);
    if (!res.ok) return jsonResponse({ error: 'Failed to fetch exercise dataset' }, 500);

    const raw = await res.json();
    if (!Array.isArray(raw)) return jsonResponse({ error: 'Unexpected dataset format' }, 500);

    const subset = raw
      .filter((ex) => ex.name && ex.instructions && ex.instructions.length > 0)
      .slice(0, 100);

    const created = [];
    for (let i = 0; i < subset.length; i++) {
      const ex = subset[i];
      const record = {
        name: ex.name,
        muscle_group: mapMuscle(ex.primaryMuscles || [], ex.category || ''),
        secondary_muscles: (ex.secondaryMuscles || []).slice(0, 5),
        equipment: mapEquipment(ex.equipment || ''),
        category: ex.category || '',
        difficulty: mapDifficulty(ex.level || ''),
        instructions: (ex.instructions || []).slice(0, 10),
        image_url: buildImageUrl(ex.images),
        video_url: '',
        form_cues: [],
        common_mistakes: [],
        default_rest_seconds: 90,
        description: ex.mechanic ? `${ex.mechanic} · ${ex.force || ''}`.trim().replace(/·\s*$/, '') : '',
        is_coach_branded: false,
        created_by: userId,
      };

      const { data: result, error } = await svc.from('exercise_library')
        .insert(record).select('id').single();
      if (error) return jsonResponse({ error: error.message, created: created.length }, 500);
      created.push({ id: result.id, name: ex.name });
    }

    return jsonResponse({ success: true, count: created.length });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
