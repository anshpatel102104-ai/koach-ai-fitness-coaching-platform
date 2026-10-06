/**
 * Smart Coaching Templates
 * Each template creates: WorkoutProgram + NutritionPlan + AutomationRules
 * and configures the client's check-in schedule.
 */

export const COACHING_TEMPLATES = [
  {
    id: 'fat_loss',
    label: 'Fat Loss',
    color: 'bg-secondary border-border text-foreground',
    accentColor: 'bg-foreground',
    description: 'Calorie deficit + cardio-forward training + high check-in frequency.',
    tags: ['fat_loss', 'cardio', 'deficit'],
    clientGoal: 'weight_loss',
    stats: ['5 days/week', '~45min sessions', 'Weekly check-ins', '3 auto rules'],

    program: {
      title: 'Fat Loss Blueprint',
      description: 'High-frequency training combining resistance and cardio to maximise calorie burn while preserving muscle.',
      difficulty: 'intermediate',
      category: 'fat_loss',
      duration_weeks: 12,
      days_per_week: 5,
      is_template: true,
      workouts: [
        {
          day_name: 'Day 1 – Upper Resistance',
          day_number: 1,
          exercises: [
            { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest_seconds: 60 },
            { name: 'Cable Row', sets: 4, reps: '10-12', rest_seconds: 60 },
            { name: 'Lateral Raises', sets: 3, reps: '15', rest_seconds: 45 },
            { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest_seconds: 45 },
            { name: 'Bicep Curls', sets: 3, reps: '12-15', rest_seconds: 45 },
          ],
        },
        {
          day_name: 'Day 2 – Lower Resistance',
          day_number: 2,
          exercises: [
            { name: 'Goblet Squat', sets: 4, reps: '12-15', rest_seconds: 60 },
            { name: 'Romanian Deadlift', sets: 4, reps: '10-12', rest_seconds: 60 },
            { name: 'Walking Lunges', sets: 3, reps: '12 each', rest_seconds: 45 },
            { name: 'Leg Press', sets: 3, reps: '15', rest_seconds: 60 },
            { name: 'Calf Raises', sets: 4, reps: '20', rest_seconds: 30 },
          ],
        },
        {
          day_name: 'Day 3 – HIIT Cardio',
          day_number: 3,
          exercises: [
            { name: 'Jump Rope', sets: 5, reps: '60s on / 30s off', rest_seconds: 30 },
            { name: 'Burpees', sets: 4, reps: '10', rest_seconds: 30 },
            { name: 'Mountain Climbers', sets: 4, reps: '30s', rest_seconds: 20 },
            { name: 'Bike Sprint Intervals', sets: 8, reps: '20s on / 40s off', rest_seconds: 40 },
          ],
        },
        {
          day_name: 'Day 4 – Full Body Circuit',
          day_number: 4,
          exercises: [
            { name: 'Dumbbell Thrusters', sets: 4, reps: '12', rest_seconds: 45 },
            { name: 'Kettlebell Swings', sets: 4, reps: '15', rest_seconds: 45 },
            { name: 'Push-Ups', sets: 3, reps: 'AMRAP', rest_seconds: 45 },
            { name: 'TRX Row', sets: 3, reps: '12', rest_seconds: 45 },
            { name: 'Plank', sets: 3, reps: '45s', rest_seconds: 30 },
          ],
        },
        {
          day_name: 'Day 5 – Steady State Cardio',
          day_number: 5,
          exercises: [
            { name: 'Treadmill Walk (incline 8%)', sets: 1, reps: '45 min', rest_seconds: 0 },
          ],
        },
      ],
    },

    nutrition: {
      title: 'Fat Loss Nutrition Plan',
      description: 'Moderate calorie deficit with high protein to preserve lean muscle during weight loss.',
      tracking_mode: 'macros',
      calories: 1800,
      protein_g: 175,
      carbs_g: 160,
      fats_g: 50,
      is_template: true,
      meals: [
        {
          meal_name: 'Breakfast',
          time: '7:00 AM',
          foods: [
            { food_name: 'Egg whites (6)', portion: '180g', calories: 95, protein: 20, carbs: 2, fats: 0 },
            { food_name: 'Oats', portion: '50g dry', calories: 190, protein: 7, carbs: 34, fats: 3 },
            { food_name: 'Blueberries', portion: '100g', calories: 55, protein: 1, carbs: 14, fats: 0 },
          ],
        },
        {
          meal_name: 'Lunch',
          time: '12:30 PM',
          foods: [
            { food_name: 'Grilled chicken breast', portion: '175g', calories: 290, protein: 55, carbs: 0, fats: 6 },
            { food_name: 'Brown rice', portion: '150g cooked', calories: 165, protein: 4, carbs: 35, fats: 1 },
            { food_name: 'Mixed greens + cucumber', portion: '200g', calories: 30, protein: 2, carbs: 5, fats: 0 },
          ],
        },
        {
          meal_name: 'Pre-Workout',
          time: '4:30 PM',
          foods: [
            { food_name: 'Greek yogurt (0%)', portion: '200g', calories: 120, protein: 20, carbs: 9, fats: 0 },
            { food_name: 'Apple', portion: '1 medium', calories: 80, protein: 0, carbs: 21, fats: 0 },
          ],
        },
        {
          meal_name: 'Dinner',
          time: '7:00 PM',
          foods: [
            { food_name: 'White fish (cod/tilapia)', portion: '200g', calories: 200, protein: 44, carbs: 0, fats: 2 },
            { food_name: 'Sweet potato', portion: '150g', calories: 130, protein: 2, carbs: 30, fats: 0 },
            { food_name: 'Broccoli + asparagus', portion: '200g', calories: 60, protein: 5, carbs: 10, fats: 0 },
          ],
        },
      ],
      notes: 'Refeed day on Day 5: increase carbs by +100g. Keep protein high every day regardless of calorie target.',
    },

    automationRules: [
      {
        name: 'Fat Loss – Missed Check-in Alert',
        condition_type: 'missed_checkin',
        condition_threshold: 7,
        action_type: 'send_message',
        action_message: "Hey, I haven't seen your check-in this week. Even a quick update helps me keep your plan on track. How are you doing?",
        is_active: true,
      },
      {
        name: 'Fat Loss – Low Adherence Warning',
        condition_type: 'low_adherence',
        condition_threshold: 60,
        action_type: 'notify_coach',
        action_message: 'Client adherence has dropped below 60%. Consider scheduling a check-in call.',
        is_active: true,
      },
      {
        name: 'Fat Loss – Weight Plateau',
        condition_type: 'weight_plateau',
        condition_threshold: 14,
        action_type: 'adjust_calories',
        action_calorie_delta: -100,
        action_message: 'Weight has plateaued for 2 weeks. Reducing calories by 100 and reviewing cardio volume.',
        is_active: true,
      },
    ],
  },

  {
    id: 'muscle_gain',
    label: 'Muscle Gain',
    color: 'bg-secondary border-border text-foreground',
    accentColor: 'bg-foreground',
    description: 'Progressive overload focus with calorie surplus and bi-weekly check-ins.',
    tags: ['muscle_gain', 'strength', 'surplus'],
    clientGoal: 'muscle_gain',
    stats: ['4 days/week', '~60min sessions', 'Bi-weekly check-ins', '3 auto rules'],

    program: {
      title: 'Muscle Gain Blueprint',
      description: 'Progressive overload hypertrophy program using a push/pull/legs split to maximise muscle growth.',
      difficulty: 'intermediate',
      category: 'hypertrophy',
      duration_weeks: 16,
      days_per_week: 4,
      is_template: true,
      workouts: [
        {
          day_name: 'Day 1 – Push (Chest / Shoulders / Triceps)',
          day_number: 1,
          exercises: [
            { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest_seconds: 90, notes: 'Add weight each week' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest_seconds: 75 },
            { name: 'Overhead Press', sets: 4, reps: '6-8', rest_seconds: 90 },
            { name: 'Cable Lateral Raise', sets: 4, reps: '12-15', rest_seconds: 45 },
            { name: 'Skullcrushers', sets: 3, reps: '10-12', rest_seconds: 60 },
            { name: 'Tricep Dips', sets: 3, reps: 'AMRAP', rest_seconds: 60 },
          ],
        },
        {
          day_name: 'Day 2 – Pull (Back / Biceps)',
          day_number: 2,
          exercises: [
            { name: 'Barbell Deadlift', sets: 4, reps: '4-6', rest_seconds: 120, notes: 'Focus on form and progressive overload' },
            { name: 'Weighted Pull-Ups', sets: 4, reps: '6-8', rest_seconds: 90 },
            { name: 'Seated Cable Row', sets: 4, reps: '8-10', rest_seconds: 75 },
            { name: 'Face Pulls', sets: 3, reps: '15', rest_seconds: 45 },
            { name: 'Barbell Curls', sets: 4, reps: '8-10', rest_seconds: 60 },
            { name: 'Hammer Curls', sets: 3, reps: '12', rest_seconds: 45 },
          ],
        },
        {
          day_name: 'Day 3 – Legs (Quad Dominant)',
          day_number: 3,
          exercises: [
            { name: 'Back Squat', sets: 5, reps: '5', rest_seconds: 120, notes: 'Linear progression' },
            { name: 'Leg Press', sets: 4, reps: '10-12', rest_seconds: 90 },
            { name: 'Hack Squat', sets: 3, reps: '10-12', rest_seconds: 75 },
            { name: 'Leg Extension', sets: 4, reps: '12-15', rest_seconds: 45 },
            { name: 'Standing Calf Raise', sets: 5, reps: '15', rest_seconds: 45 },
          ],
        },
        {
          day_name: 'Day 4 – Legs (Posterior Chain)',
          day_number: 4,
          exercises: [
            { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest_seconds: 90 },
            { name: 'Hip Thrust', sets: 4, reps: '10-12', rest_seconds: 75 },
            { name: 'Leg Curl', sets: 4, reps: '10-12', rest_seconds: 60 },
            { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest_seconds: 60 },
            { name: 'Seated Calf Raise', sets: 4, reps: '20', rest_seconds: 30 },
          ],
        },
      ],
    },

    nutrition: {
      title: 'Muscle Gain Nutrition Plan',
      description: 'Clean calorie surplus with periodised carb loading around training to fuel muscle protein synthesis.',
      tracking_mode: 'macros',
      calories: 2800,
      protein_g: 190,
      carbs_g: 330,
      fats_g: 75,
      is_template: true,
      meals: [
        {
          meal_name: 'Breakfast',
          time: '7:30 AM',
          foods: [
            { food_name: 'Whole eggs (3) + egg whites (4)', portion: 'as stated', calories: 310, protein: 34, carbs: 2, fats: 16 },
            { food_name: 'Oats with banana', portion: '80g oats + 1 banana', calories: 420, protein: 12, carbs: 80, fats: 6 },
          ],
        },
        {
          meal_name: 'Lunch',
          time: '1:00 PM',
          foods: [
            { food_name: 'Chicken breast', portion: '200g', calories: 330, protein: 62, carbs: 0, fats: 7 },
            { food_name: 'White rice', portion: '200g cooked', calories: 260, protein: 5, carbs: 57, fats: 0 },
            { food_name: 'Olive oil drizzle', portion: '10ml', calories: 90, protein: 0, carbs: 0, fats: 10 },
          ],
        },
        {
          meal_name: 'Pre-Workout',
          time: '4:00 PM',
          foods: [
            { food_name: 'Protein shake', portion: '1 scoop', calories: 130, protein: 25, carbs: 5, fats: 2 },
            { food_name: 'Bagel with PB', portion: '1 bagel + 15g PB', calories: 380, protein: 12, carbs: 65, fats: 10 },
          ],
        },
        {
          meal_name: 'Post-Workout',
          time: '6:30 PM',
          foods: [
            { food_name: 'Rice cakes + honey', portion: '4 cakes + 1 tbsp', calories: 170, protein: 2, carbs: 40, fats: 0 },
            { food_name: 'Protein shake', portion: '1 scoop in water', calories: 130, protein: 25, carbs: 5, fats: 2 },
          ],
        },
        {
          meal_name: 'Dinner',
          time: '8:00 PM',
          foods: [
            { food_name: 'Salmon', portion: '200g', calories: 410, protein: 44, carbs: 0, fats: 25 },
            { food_name: 'Potato', portion: '200g', calories: 160, protein: 4, carbs: 36, fats: 0 },
            { food_name: 'Vegetables', portion: '200g', calories: 60, protein: 4, carbs: 10, fats: 0 },
          ],
        },
      ],
      notes: 'Increase calories by 200 every 3 weeks if weight is not increasing by 0.25-0.5kg/week.',
    },

    automationRules: [
      {
        name: 'Muscle Gain – No Progress Alert',
        condition_type: 'no_progress',
        condition_threshold: 21,
        action_type: 'notify_coach',
        action_message: 'Client has shown no measurable progress for 3 weeks. Review training volume and nutrition surplus.',
        is_active: true,
      },
      {
        name: 'Muscle Gain – Low Nutrition Compliance',
        condition_type: 'low_nutrition',
        condition_threshold: 70,
        action_type: 'send_message',
        action_message: "Hitting your calories matters as much as the training. A surplus is what builds muscle, so let's make sure you're eating enough this week.",
        is_active: true,
      },
      {
        name: 'Muscle Gain – Missed Workout Check',
        condition_type: 'missed_workouts',
        condition_threshold: 2,
        action_type: 'send_message',
        action_message: "Looks like you've missed a couple sessions. Life happens — let's get you back on track. Want to reschedule or modify this week's plan?",
        is_active: true,
      },
    ],
  },

  {
    id: 'hybrid',
    label: 'Hybrid',
    color: 'bg-secondary border-border text-foreground',
    accentColor: 'bg-foreground',
    description: 'Strength + cardio balance for athletes wanting performance and aesthetics.',
    tags: ['hybrid', 'athletic', 'performance'],
    clientGoal: 'general_fitness',
    stats: ['5 days/week', '~55min sessions', 'Weekly check-ins', '3 auto rules'],

    program: {
      title: 'Hybrid Performance Blueprint',
      description: 'Balanced strength and conditioning program for athletes wanting both performance and body composition improvements.',
      difficulty: 'advanced',
      category: 'athletic',
      duration_weeks: 12,
      days_per_week: 5,
      is_template: true,
      workouts: [
        {
          day_name: 'Day 1 – Strength (Lower)',
          day_number: 1,
          exercises: [
            { name: 'Back Squat', sets: 5, reps: '3-5', rest_seconds: 150, notes: 'Heavy. 85% 1RM' },
            { name: 'Romanian Deadlift', sets: 4, reps: '6', rest_seconds: 90 },
            { name: 'Box Jumps', sets: 4, reps: '5', rest_seconds: 90, notes: 'Explosive, full reset' },
            { name: 'Sled Push', sets: 4, reps: '20m', rest_seconds: 90 },
          ],
        },
        {
          day_name: 'Day 2 – Conditioning',
          day_number: 2,
          exercises: [
            { name: 'Row Erg', sets: 1, reps: '2000m for time', rest_seconds: 0 },
            { name: 'KB Snatch', sets: 5, reps: '5 each side', rest_seconds: 60 },
            { name: 'Battle Ropes', sets: 4, reps: '30s', rest_seconds: 30 },
            { name: 'Assault Bike', sets: 6, reps: '15s sprint / 45s easy', rest_seconds: 0 },
          ],
        },
        {
          day_name: 'Day 3 – Strength (Upper)',
          day_number: 3,
          exercises: [
            { name: 'Overhead Press', sets: 5, reps: '3-5', rest_seconds: 150 },
            { name: 'Weighted Pull-Ups', sets: 5, reps: '5', rest_seconds: 120 },
            { name: 'Barbell Row', sets: 4, reps: '6', rest_seconds: 90 },
            { name: 'Dips', sets: 3, reps: 'AMRAP', rest_seconds: 75 },
          ],
        },
        {
          day_name: 'Day 4 – Hypertrophy',
          day_number: 4,
          exercises: [
            { name: 'Incline Press', sets: 4, reps: '8-10', rest_seconds: 75 },
            { name: 'Cable Row', sets: 4, reps: '10-12', rest_seconds: 60 },
            { name: 'Leg Press', sets: 4, reps: '12', rest_seconds: 60 },
            { name: 'Face Pulls', sets: 3, reps: '15', rest_seconds: 45 },
            { name: 'Farmer Carries', sets: 4, reps: '30m', rest_seconds: 60 },
          ],
        },
        {
          day_name: 'Day 5 – Aerobic Base',
          day_number: 5,
          exercises: [
            { name: 'Zone 2 Run or Bike', sets: 1, reps: '40-50 min at low HR', rest_seconds: 0 },
          ],
        },
      ],
    },

    nutrition: {
      title: 'Hybrid Performance Nutrition',
      description: 'Body recomposition approach — carb cycling around training to build muscle and reduce fat simultaneously.',
      tracking_mode: 'macros',
      calories: 2400,
      protein_g: 200,
      carbs_g: 240,
      fats_g: 70,
      is_template: true,
      meals: [
        {
          meal_name: 'Breakfast',
          time: '7:00 AM',
          foods: [
            { food_name: 'Eggs (3 whole + 2 whites)', portion: 'as stated', calories: 265, protein: 28, carbs: 2, fats: 14 },
            { food_name: 'Sourdough toast', portion: '2 slices', calories: 200, protein: 8, carbs: 38, fats: 2 },
            { food_name: 'Avocado', portion: '½', calories: 120, protein: 1, carbs: 6, fats: 11 },
          ],
        },
        {
          meal_name: 'Lunch',
          time: '12:00 PM',
          foods: [
            { food_name: 'Ground turkey', portion: '175g', calories: 285, protein: 40, carbs: 0, fats: 13 },
            { food_name: 'Quinoa', portion: '150g cooked', calories: 180, protein: 7, carbs: 32, fats: 3 },
            { food_name: 'Mixed veg', portion: '200g', calories: 50, protein: 3, carbs: 8, fats: 0 },
          ],
        },
        {
          meal_name: 'Pre-Workout (Training days)',
          time: '4:30 PM',
          foods: [
            { food_name: 'Rice + chicken', portion: '150g rice + 120g chicken', calories: 420, protein: 36, carbs: 55, fats: 5 },
          ],
        },
        {
          meal_name: 'Dinner',
          time: '7:30 PM',
          foods: [
            { food_name: 'Lean beef or salmon', portion: '180g', calories: 360, protein: 40, carbs: 0, fats: 20 },
            { food_name: 'Vegetables (roasted)', portion: '250g', calories: 80, protein: 4, carbs: 14, fats: 1 },
          ],
        },
      ],
      notes: 'High carb on training days (Days 1, 3, 4). Low carb on conditioning/rest days. Keep protein at 200g every day.',
    },

    automationRules: [
      {
        name: 'Hybrid – Declining Trend',
        condition_type: 'declining_trend',
        condition_threshold: 14,
        action_type: 'notify_coach',
        action_message: 'Hybrid athlete showing declining performance trend over 2 weeks. Review recovery and workload balance.',
        is_active: true,
      },
      {
        name: 'Hybrid – Mood & Energy Low',
        condition_type: 'mood_low',
        condition_threshold: 3,
        action_type: 'send_message',
        action_message: "I noticed your energy/mood has been low recently. Hybrid training is demanding — let's review your recovery, sleep, and whether we need a deload week.",
        is_active: true,
      },
      {
        name: 'Hybrid – Missed Check-in',
        condition_type: 'missed_checkin',
        condition_threshold: 7,
        action_type: 'send_message',
        action_message: "Hey, send me a quick check-in when you get a chance. Even just your weight and how training is feeling this week is enough.",
        is_active: true,
      },
    ],
  },
];