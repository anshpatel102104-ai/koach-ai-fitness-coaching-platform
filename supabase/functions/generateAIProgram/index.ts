// Supabase Edge Function: generateAIProgram  (Migration Step 5d)
//
// Re-platform of base44/functions/generateAIProgram. The AI-metering guard
// moved to _shared/aiMetering.js (shared with generateMealPlan /
// generateSmartMeals); InvokeLLM → the shared Anthropic client. The exercise
// library read is scoped to the CALLER (Base44's user-context list) and the
// library-enrichment pass is verbatim.
import { getCaller, callerClient, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { meterAiGeneration } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { collectExerciseNames, findInjuryViolations, injuryAvoidTerms, parseTermList } from '../_shared/aiSafety.js';

// Structured output: the program is generated one training day per structured tool
// call (in parallel), so every response is schema-valid and small, and a
// response cut off at max_tokens is rejected rather than silently truncated.
const str = { type: 'string' };
const WORKOUT = {
  type: 'object',
  required: ['day_name', 'day_number', 'workout_notes', 'exercises'],
  properties: {
    day_name: str, day_number: { type: 'number' }, workout_notes: str,
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'sets', 'reps', 'rest_seconds', 'rpe', 'section', 'notes', 'prescription'],
        properties: {
          name: str, sets: { type: 'number' }, reps: str, rest_seconds: { type: 'number' }, rpe: str,
          section: { type: 'string', enum: ['warmup', 'main', 'finisher', 'cooldown'] },
          notes: str, prescription: str,
        },
      },
    },
  },
};
const META = {
  type: 'object',
  required: ['title', 'description', 'category', 'difficulty', 'coach_rationale'],
  properties: {
    title: str, description: str,
    category: { type: 'string', enum: ['strength', 'hypertrophy', 'fat_loss', 'athletic', 'mobility', 'custom'] },
    difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'elite'] },
    coach_rationale: {
      type: 'object', required: ['split', 'weekly_volume', 'rep_range_rationale', 'progression_approach'],
      properties: { split: str, weekly_volume: str, rep_range_rationale: str, progression_approach: str },
    },
  },
};
const dayTool = (withMeta: boolean) => ({
  name: 'submit_training_day',
  description: 'Submit one training day' + (withMeta ? ' plus the program-level title, description and coach rationale.' : '.'),
  input_schema: {
    type: 'object',
    required: withMeta ? ['workout', 'program'] : ['workout'],
    properties: { workout: WORKOUT, ...(withMeta ? { program: META } : {}) },
  },
});
const SPLIT_TOOL = {
  name: 'submit_split',
  description: 'Submit the ordered list of training-day focuses.',
  input_schema: {
    type: 'object', required: ['days'],
    properties: { days: { type: 'array', items: { type: 'string' } } },
  },
};

// Default day-by-day split by training frequency (used when the coach leaves the split to the AI).
const DEFAULT_SPLITS: Record<number, string[]> = {
  1: ['Full Body'],
  2: ['Upper Body', 'Lower Body'],
  3: ['Full Body A', 'Full Body B', 'Full Body C'],
  4: ['Upper Strength', 'Lower Strength', 'Upper Hypertrophy', 'Lower Hypertrophy'],
  5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
  7: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Conditioning / Active Recovery'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const t0 = Date.now();
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const meter = await meterAiGeneration(serviceClient(), caller.profile);
    if (!meter.allowed) return jsonResponse(meter.body, meter.status);

    const { profile, preferences } = await req.json();

    // Fetch the coach's exercise library (RLS-scoped) to ground the AI
    const { data: exerciseLibrary } = await callerClient(req)
      .from('exercise_library').select('*').limit(500);
    const libraryByName: Record<string, Record<string, unknown>> = {};
    (exerciseLibrary ?? []).forEach((e) => { if (e.name) libraryByName[e.name.toLowerCase()] = e; });
    const libraryNames = (exerciseLibrary ?? []).map((e) => e.name).filter(Boolean);

    const dpw = Number(profile.days_per_week) || 4;
    const preferredSplit = profile.preferred_split || 'Let AI decide';

    const levelVolumeGuidance = (() => {
      const level = profile.fitness_level;
      if (level === 'complete_beginner' || level === 'beginner') {
        return 'Total weekly sets per muscle group: 8-12. Use compound movements predominantly. Keep rep ranges 8-15. RPE 6-8.';
      }
      if (level === 'intermediate') {
        return 'Total weekly sets per muscle group: 12-18. Mix compounds and accessories. Strength days: 4-6 reps RPE 8-9. Hypertrophy: 8-12 reps RPE 7-8.';
      }
      return 'Total weekly sets per muscle group: 16-22. Periodize rep ranges. Include intensity techniques (dropsets, supersets). Strength blocks: 1-5 reps RPE 9. Hypertrophy: 6-12 reps RPE 8-9.';
    })();

    const goalGuidance = (() => {
      const g = profile.goal;
      if (g === 'strength') return 'Prioritize compound lifts at 1-6 reps, RPE 8-10. Accessories at 6-10 reps. Minimal cardio. Linear load progression each week.';
      if (g === 'muscle_gain') return 'Main lifts 4-8 reps RPE 8. Accessories 8-15 reps RPE 7-8. Volume drives hypertrophy. Progress by adding reps then weight.';
      if (g === 'fat_loss') return 'Maintain strength with compounds at 6-10 reps. Higher rep accessories 12-20 for metabolic effect. Supersets where possible. Include conditioning.';
      if (g === 'athletic') return 'Mix power (2-5 reps explosive), strength (3-6 reps), and hypertrophy (8-12 reps). Include sport-specific movement patterns.';
      return 'Balanced volume across rep ranges 8-15. Prioritize consistency and movement quality.';
    })();

    const strengthContext = (() => {
      const parts = [];
      if (profile.current_squat) parts.push(`Squat: ${profile.current_squat}`);
      if (profile.current_bench) parts.push(`Bench: ${profile.current_bench}`);
      if (profile.current_deadlift) parts.push(`Deadlift: ${profile.current_deadlift}`);
      if (profile.current_ohp) parts.push(`OHP: ${profile.current_ohp}`);
      return parts.length > 0 ? parts.join(', ') : 'not provided';
    })();

    const libraryContext = libraryNames.length > 0
      ? `EXERCISE LIBRARY (use these names EXACTLY where appropriate — they have demo videos and thumbnails attached):\n${libraryNames.slice(0, 100).join(', ')}`
      : '';

    // Hard avoid list = explicit movements + patterns implied by recorded injuries.
    const avoidTerms = [
      ...parseTermList(profile.movements_to_avoid),
      ...injuryAvoidTerms(profile.injuries),
    ];
    const avoidLine = avoidTerms.length
      ? `HARD RULE — NEVER include any of these movements or close variations (a program containing one is rejected): ${[...new Set(avoidTerms)].join(', ')}. Substitute with safe alternatives (e.g. for a knee injury use hip-hinge, leg curl, hip thrust, glute bridge, upper-body work).`
      : '';

    // Day-by-day split: deterministic for "Let AI decide"; a small outline call only for a custom split.
    let dayFocuses: string[];
    if (preferredSplit === 'Let AI decide') {
      dayFocuses = DEFAULT_SPLITS[Math.min(Math.max(dpw, 1), 7)];
    } else {
      const outline = await invokeClaude({
        prompt: `List the ${dpw} training-day focuses, in order, for this split: ${preferredSplit}. Respond only by calling the submit_split tool.`,
        tool: SPLIT_TOOL, maxTokens: 1024, timeoutMs: 30_000,
      });
      if (!outline.ok) return jsonResponse({ error: outline.error, diagnostics: outline.diagnostics }, outline.status ?? 500);
      dayFocuses = (outline.parsed.days as string[]).slice(0, dpw);
      if (dayFocuses.length < dpw) return jsonResponse({ error: 'AI returned an invalid split outline' }, 500);
    }

    const context = `CLIENT PROFILE:
- Primary Goal: ${profile.goal}
- Experience Level: ${profile.fitness_level} (${profile.years_lifting ? profile.years_lifting + ' years lifting' : 'years unspecified'})
- Age: ${profile.age || 'not specified'}, Gender: ${profile.gender || 'not specified'}
- Training Days: ${dpw}x/week
- Session Length: ${profile.session_length} minutes
- Equipment Available: ${(Array.isArray(profile.equipment) ? profile.equipment.join(', ') : profile.equipment) || 'full gym'}
- Injuries / Limitations: ${profile.injuries || 'none'}
- Movements to Avoid: ${profile.movements_to_avoid || 'none'}
- Priority Muscles: ${(Array.isArray(profile.priority_muscles) ? profile.priority_muscles.join(', ') : profile.priority_muscles) || 'balanced'}
- Preferred Split: ${preferredSplit}
- Current Strength (1RM or working): ${strengthContext}

PROGRAM PREFERENCES:
- Duration: ${preferences.duration} weeks
- Progression Model: ${preferences.progression_style}
- Deload: ${preferences.include_deload ? 'yes, ' + (preferences.deload_frequency || 'every 4 weeks').replace(/_/g, ' ') : 'no'}
- Cardio: ${preferences.include_cardio ? `yes — types: ${(preferences.cardio_types || []).join(', ') || 'general conditioning'}` : 'no'}
- Extra coaching notes: ${preferences.extra_notes || 'none'}

PROGRAMMING GUIDELINES:
Weekly split (in order): ${dayFocuses.map((d, i) => `Day ${i + 1} — ${d}`).join(' | ')}
Volume guidance: ${levelVolumeGuidance}
Goal-specific prescription: ${goalGuidance}

${libraryContext}

${avoidLine}`;

    const dayRequirements = `REQUIREMENTS:
1. Sequence exercises correctly: warmup (section "warmup"), compound primary lifts (section "main"), accessory work (section "main"), finisher if appropriate ("finisher"), cooldown if needed ("cooldown").
2. For EVERY exercise: exact sets (number), rep range string (e.g. "4-6"), rest in seconds (number), RPE string (e.g. "8").
3. A specific coaching cue in "notes" and a week-to-week progression in "prescription" (e.g. "4 × 4-6 @ RPE 8 — add 2.5kg when reps complete").
4. Prioritize exercises from the provided library (match names EXACTLY) so thumbnails and videos carry over; you may add others.
5. Weekly set volume across the whole split should follow the volume guidance; this day should only train its own focus.
6. Keep text fields brief (notes ≤ 20 words, prescription ≤ 15 words). Tool arguments must be real JSON objects/arrays — never JSON encoded inside a string.`;

    // One structured tool call per training day, in parallel. Day 1 also returns the program-level fields.
    const dayResults = await Promise.all(dayFocuses.map((focus, i) => invokeClaude({
      prompt: `Generate training day ${i + 1} of ${dayFocuses.length} ("${focus}") of an expert workout program by calling the submit_training_day tool (respond with that tool call only).${i === 0 ? ' Also provide the program title, description, category, difficulty and a detailed coach_rationale covering the whole split.' : ''}

${context}

${dayRequirements}
Use day_number ${i + 1} and a descriptive day_name starting with "Day ${i + 1} — ${focus}".`,
      tool: dayTool(i === 0), maxTokens: 8000, timeoutMs: i === 0 ? 125_000 : 115_000,
    })));
    for (const r of dayResults) {
      if (!r.ok) return jsonResponse({ error: r.error, diagnostics: r.diagnostics }, r.status ?? 500);
    }
    const metaOut = dayResults[0].parsed.program;
    if (!metaOut || !dayResults.every((r) => r.parsed?.workout?.exercises?.length)) {
      const preview = (o: unknown) => JSON.stringify(o ?? null)?.slice(0, 300);
      console.error('generateAIProgram: invalid structure', preview(dayResults[0].parsed));
      return jsonResponse({
        error: 'AI returned an invalid program structure',
        diagnostics: { coerce_notes: dayResults.flatMap((r) => r.coerceNotes ?? []), keys: dayResults.map((r) => Object.keys(r.parsed ?? {})), preview: preview(dayResults[0].parsed), stop_reasons: dayResults.map((r) => r.stopReason), output_tokens: dayResults.map((r) => r.outputTokens) },
      }, 500);
    }
    const program = {
      title: metaOut.title,
      description: metaOut.description,
      category: metaOut.category,
      difficulty: metaOut.difficulty,
      duration_weeks: Number(preferences.duration) || null,
      days_per_week: dpw,
      coach_rationale: metaOut.coach_rationale,
      workouts: dayResults.map((r, i) => ({ ...r.parsed.workout, day_number: i + 1 })),
      _meta: { elapsed_ms: Date.now() - t0, calls: dayResults.length + (preferredSplit === 'Let AI decide' ? 0 : 1), output_tokens: dayResults.map((r) => r.outputTokens), stop_reasons: dayResults.map((r) => r.stopReason) },
    } as Record<string, unknown> & { workouts: Record<string, unknown>[] };

    // Validate minimum required fields (verbatim)
    if (!program || !program.title || !Array.isArray(program.workouts) || program.workouts.length === 0) {
      return jsonResponse({ error: 'AI returned an invalid program structure. Missing title or workouts.' }, 500);
    }

    // Deterministic contraindication check (B-SAFETY): reject a program that
    // includes a movement the client must avoid, rather than trusting the
    // prompt rule. Coaches regenerate rather than receive an unsafe program.
    // Avoid list = explicit movements_to_avoid PLUS the patterns implied by any
    // recorded injury, so "knee injury" alone still blocks squats/lunges/jumps.
    const injuryViolations = findInjuryViolations(collectExerciseNames(program), avoidTerms);
    if (injuryViolations.length) {
      return jsonResponse({ error: 'contraindicated_exercise', violations: injuryViolations }, 422);
    }

    // Enrich exercises with library metadata (thumbnail, video) where names match
    program.workouts = program.workouts.map((workout: Record<string, unknown>) => ({
      ...workout,
      exercises: ((workout.exercises as Record<string, unknown>[]) || []).map((ex) => {
        const libMatch = libraryByName[(ex.name as string)?.toLowerCase()];
        if (libMatch) {
          return {
            ...ex,
            library_id: libMatch.id,
            image_url: libMatch.thumbnail_url || libMatch.image_url || ex.image_url,
            video_url: libMatch.video_url || ex.video_url,
            muscle_group: libMatch.muscle_group || ex.muscle_group,
          };
        }
        return ex;
      }),
    }));

    return jsonResponse(program);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
