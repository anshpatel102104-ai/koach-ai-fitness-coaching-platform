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
import { collectExerciseNames, findInjuryViolations } from '../_shared/aiSafety.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
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

    const splitGuidance = (() => {
      if (preferredSplit && preferredSplit !== 'Let AI decide') return preferredSplit;
      if (dpw <= 3) return 'Full Body (3x/week) or Upper/Lower (2x/week)';
      if (dpw === 4) return 'Upper/Lower split (2x upper, 2x lower)';
      if (dpw === 5) return 'Push/Pull/Legs + Upper + Lower or PPL + Full Body';
      return 'Push/Pull/Legs or Body Part Split';
    })();

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

    const prompt = `You are an elite strength and conditioning coach with 20 years of experience programming for athletes and general population clients. Generate a highly specific, expert-quality workout program.

CLIENT PROFILE:
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
Split guidance: ${splitGuidance}
Volume guidance: ${levelVolumeGuidance}
Goal-specific prescription: ${goalGuidance}

${libraryContext}

REQUIREMENTS FOR THE PROGRAM:
1. Choose the optimal training split for this client's days/week and goal. Explicitly assign which muscle groups go on which day.
2. Within each training day, sequence exercises correctly: warmup movements first (section: "warmup"), then compound primary lifts (section: "main"), then accessory work (section: "main"), then finisher if appropriate (section: "finisher"), then cooldown if needed (section: "cooldown").
3. For EVERY exercise specify: exact sets (number), rep range as a string (e.g. "4-6", "8-12", "12-15"), rest in seconds (number), and RPE as a string (e.g. "8", "7-8", "9").
4. Write coaching notes for each exercise — a specific technique cue or coaching instruction (e.g. "Drive through heels, brace core throughout ROM").
5. Apply a progression prescription — specify in notes or prescription how this exercise progresses week to week (e.g. "Add 2.5kg when all reps completed at top of range").
6. Generate the TEMPLATE WEEK (a single repeating week that defines the program structure). The program builder will handle repeating it.
7. If injuries or movements to avoid are specified, NEVER include those movements. Substitute with appropriate alternatives.
8. Prioritize exercises from the provided library (match names EXACTLY) so thumbnails and videos carry over. You may add exercises not in the library as needed.
9. Include a coach_rationale object explaining the programming decisions in detail.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "Descriptive program name (e.g. '12-Week Intermediate Upper/Lower Hypertrophy')",
  "description": "2-3 sentence description of the program philosophy and approach",
  "category": "strength | hypertrophy | fat_loss | athletic | mobility | custom",
  "difficulty": "beginner | intermediate | advanced | elite",
  "duration_weeks": <number>,
  "days_per_week": <number>,
  "coach_rationale": {
    "split": "Explain why this split was chosen for this client's days/week and goal",
    "weekly_volume": "List key muscle groups and weekly set count (e.g. Chest: 14 sets, Back: 16 sets, Quads: 18 sets)",
    "rep_range_rationale": "Explain why these rep ranges match the goal and experience level",
    "progression_approach": "Explain how load/volume progresses across the program duration"
  },
  "workouts": [
    {
      "day_name": "Day 1 — Upper Strength (Chest/Back focus)",
      "day_number": 1,
      "workout_notes": "Brief intent for this session",
      "exercises": [
        {
          "name": "Exercise name (match library if possible)",
          "sets": 4,
          "reps": "4-6",
          "rest_seconds": 180,
          "rpe": "8",
          "section": "warmup | main | finisher | cooldown",
          "notes": "Specific coaching cue",
          "prescription": "4 × 4-6 @ RPE 8 — add 2.5kg when reps complete"
        }
      ]
    }
  ]
}`;

    const llm = await invokeClaude({ prompt, maxTokens: 8192, expectJson: true });
    if (!llm.ok) return jsonResponse({ error: llm.error }, llm.status ?? 500);
    const program = llm.parsed;

    // Validate minimum required fields (verbatim)
    if (!program || !program.title || !Array.isArray(program.workouts) || program.workouts.length === 0) {
      return jsonResponse({ error: 'AI returned an invalid program structure. Missing title or workouts.' }, 500);
    }

    // Deterministic contraindication check (B-SAFETY): reject a program that
    // includes a movement the client must avoid, rather than trusting the
    // prompt rule. Coaches regenerate rather than receive an unsafe program.
    const injuryViolations = findInjuryViolations(collectExerciseNames(program), profile.movements_to_avoid);
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
