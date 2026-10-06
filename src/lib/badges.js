export const BADGE_CONFIG = {

  // ─── FIRST TIMES (fire once, early) ───
  first_checkin:       { label: 'First check-in',          tier: 'bronze',   desc: 'Sent the first check-in', auto: true, category: 'Milestones' },
  first_meal_logged:   { label: 'First meal logged',       tier: 'bronze',   desc: 'Logged the first meal', auto: true, category: 'Milestones' },
  first_workout:       { label: 'First workout',           tier: 'bronze',   desc: 'Completed the first workout', auto: true, category: 'Milestones' },
  first_photo:         { label: 'First progress photo',    tier: 'bronze',   desc: 'Uploaded the first progress photo', auto: true, category: 'Milestones' },
  first_pr:            { label: 'First PR',                tier: 'silver',   desc: 'Hit the first personal record', auto: true, category: 'Milestones' },
  first_week:          { label: 'First week done',         tier: 'bronze',   desc: 'Completed the first full week', auto: true, category: 'Milestones' },
  first_month:         { label: 'First month done',        tier: 'silver',   desc: 'One full month in the program', auto: true, category: 'Milestones' },
  profile_complete:    { label: 'Profile complete',        tier: 'bronze',   desc: 'Filled in the whole profile', auto: true, category: 'Milestones' },

  // ─── CHECK-IN COUNTS ───
  checkin_3:           { label: '3 check-ins',             tier: 'bronze',   desc: '3 check-ins completed', auto: true, category: 'Check-ins' },
  checkin_5:           { label: '5 check-ins',             tier: 'bronze',   desc: '5 check-ins completed', auto: true, category: 'Check-ins' },
  checkin_10:          { label: '10 check-ins',            tier: 'bronze',   desc: '10 check-ins completed', auto: true, category: 'Check-ins' },
  checkin_25:          { label: '25 check-ins',            tier: 'silver',   desc: '25 check-ins completed', auto: true, category: 'Check-ins' },
  checkin_50:          { label: '50 check-ins',            tier: 'gold',     desc: '50 check-ins completed', auto: true, category: 'Check-ins' },
  checkin_100:         { label: '100 check-ins',           tier: 'platinum', desc: '100 check-ins completed', auto: true, category: 'Check-ins' },

  // ─── STREAKS ───
  streak_3:            { label: '3-day streak',            tier: 'bronze',   desc: '3 days in a row', auto: true, category: 'Streaks' },
  streak_7:            { label: '7 in a row',              tier: 'bronze',   desc: '7 consecutive check-ins', auto: true, category: 'Streaks' },
  streak_14:           { label: '14-day streak',           tier: 'silver',   desc: '14 days in a row', auto: true, category: 'Streaks' },
  streak_21:           { label: '21-day streak',           tier: 'silver',   desc: '21 days in a row', auto: true, category: 'Streaks' },
  streak_30:           { label: '30-day streak',           tier: 'gold',     desc: '30 days in a row', auto: true, category: 'Streaks' },
  streak_60:           { label: '60-day streak',           tier: 'platinum', desc: '60 days in a row', auto: true, category: 'Streaks' },
  streak_90:           { label: '90-day streak',           tier: 'elite',    desc: '90 days in a row', auto: true, category: 'Streaks' },

  // ─── COMPLIANCE ───
  compliance_80:       { label: '80% week',                tier: 'bronze',   desc: 'Hit 80% compliance or better', auto: true, category: 'Compliance' },
  compliance_90:       { label: '90% week',                tier: 'silver',   desc: 'Hit 90% compliance or better', auto: true, category: 'Compliance' },
  compliance_100:      { label: 'Full compliance',         tier: 'silver',   desc: 'Hit 100% compliance', auto: true, category: 'Compliance' },
  perfect_week:        { label: 'Four strong check-ins',   tier: 'gold',     desc: '4 check-ins in a row at 80% or better', auto: true, category: 'Compliance' },
  perfect_month:       { label: 'Strong month',            tier: 'gold',     desc: 'A full month above 80%', auto: true, category: 'Compliance' },
  comeback:            { label: 'Comeback',                tier: 'silver',   desc: 'Bounced back after a tough week', auto: true, category: 'Compliance' },

  // ─── NUTRITION ───
  protein_hit:         { label: 'Protein target',          tier: 'bronze',   desc: 'Hit the protein target', auto: true, category: 'Nutrition' },
  nutrition_3days:     { label: '3 days logged',           tier: 'bronze',   desc: 'Logged meals 3 days in a row', auto: true, category: 'Nutrition' },
  nutrition_7days:     { label: '7 days logged',           tier: 'silver',   desc: 'Logged meals 7 days in a row', auto: true, category: 'Nutrition' },
  nutrition_king:      { label: '14 days on macros',       tier: 'gold',     desc: 'Hit all macros for 14 days', auto: true, category: 'Nutrition' },
  macro_master:        { label: '30 days on macros',       tier: 'gold',     desc: 'Hit macros for 30 days', auto: true, category: 'Nutrition' },
  hydration_hero:      { label: 'Water goal',              tier: 'bronze',   desc: 'Hit the water goal', auto: true, category: 'Nutrition' },
  calorie_goal:        { label: 'Calorie target',          tier: 'bronze',   desc: 'Hit the calorie target', auto: true, category: 'Nutrition' },
  no_cheat_week:       { label: 'Week on plan',            tier: 'silver',   desc: 'A full week eating to plan', auto: true, category: 'Nutrition' },

  // ─── SLEEP & RECOVERY ───
  sleep_7hrs:          { label: '7 hours of sleep',        tier: 'bronze',   desc: 'Logged 7 or more hours of sleep', auto: true, category: 'Recovery' },
  sleep_8hrs:          { label: '8 hours of sleep',        tier: 'bronze',   desc: 'Logged 8 or more hours of sleep', auto: true, category: 'Recovery' },
  sleep_streak_5:      { label: '5 good nights',           tier: 'silver',   desc: '5 nights of good sleep', auto: true, category: 'Recovery' },
  recovery_week:       { label: 'Recovery week',           tier: 'silver',   desc: 'Kept recovery on plan all week', auto: true, category: 'Recovery' },

  // ─── MOOD & MINDSET ───
  mood_great:          { label: 'Great day',               tier: 'bronze',   desc: 'Logged a great mood', auto: true, category: 'Mindset' },
  mood_streak_5:       { label: '5 great days',            tier: 'bronze',   desc: '5 days of great mood', auto: true, category: 'Mindset' },
  energy_high:         { label: 'High energy',             tier: 'bronze',   desc: 'Logged high energy', auto: true, category: 'Mindset' },
  energy_streak:       { label: '5 high-energy days',      tier: 'silver',   desc: '5 days of high energy', auto: true, category: 'Mindset' },
  mindset_warrior:     { label: 'Steady mindset',          tier: 'silver',   desc: 'Consistently positive mood', auto: true, category: 'Mindset' },
  stress_managed:      { label: 'Stress managed',          tier: 'bronze',   desc: 'Kept stress under control this week', auto: true, category: 'Mindset' },

  // ─── BODY TRANSFORMATION ───
  weight_logged:       { label: 'Weight logged',           tier: 'bronze',   desc: 'Logged body weight', auto: true, category: 'Transformation' },
  weight_loss_1:       { label: 'First pound',             tier: 'bronze',   desc: 'Lost the first pound', auto: true, category: 'Transformation' },
  weight_loss_5:       { label: 'Down 5 lb',               tier: 'silver',   desc: 'Lost 5 lb', auto: true, category: 'Transformation' },
  weight_loss_10:      { label: 'Down 10 lb',              tier: 'gold',     desc: 'Lost 10 lb', auto: true, category: 'Transformation' },
  weight_loss_20:      { label: 'Down 20 lb',              tier: 'platinum', desc: 'Lost 20 lb', auto: true, category: 'Transformation' },
  halfway_there:       { label: 'Halfway',                 tier: 'silver',   desc: 'Reached 50% of the goal', auto: true, category: 'Transformation' },
  goal_reached:        { label: 'Goal reached',            tier: 'gold',     desc: 'Hit the target', auto: true, category: 'Transformation' },
  transformation:      { label: 'Transformation',          tier: 'elite',    desc: 'Completed a full body transformation', auto: true, category: 'Transformation' },

  // ─── PERFORMANCE ───
  pr_hit:              { label: 'New PR',                  tier: 'gold',     desc: 'Broke a personal record', auto: true, category: 'Performance' },
  steps_5k:            { label: '5k steps',                tier: 'bronze',   desc: 'Hit 5,000 steps', auto: true, category: 'Performance' },
  steps_10k:           { label: '10k steps',               tier: 'silver',   desc: 'Hit 10,000 steps', auto: true, category: 'Performance' },
  steps_15k:           { label: '15k steps',               tier: 'gold',     desc: 'Hit 15,000 steps', auto: true, category: 'Performance' },
  workout_3:           { label: '3 workouts',              tier: 'bronze',   desc: '3 workouts completed', auto: true, category: 'Performance' },
  workout_10:          { label: '10 workouts',             tier: 'silver',   desc: '10 workouts completed', auto: true, category: 'Performance' },
  workout_25:          { label: '25 workouts',             tier: 'gold',     desc: '25 workouts completed', auto: true, category: 'Performance' },
  workout_50:          { label: '50 workouts',             tier: 'platinum', desc: '50 workouts completed', auto: true, category: 'Performance' },

  // ─── SPECIAL / COACH AWARDED ───
  most_improved:       { label: 'Most improved',           tier: 'gold',     desc: 'Biggest improvement this month', auto: false, category: 'Special' },
  client_of_month:     { label: 'Client of the month',     tier: 'elite',    desc: 'Top performer this month', auto: false, category: 'Special' },
  coachable:           { label: 'Coachable',               tier: 'silver',   desc: 'Always applies feedback', auto: false, category: 'Special' },
  never_quit:          { label: 'Never quit',              tier: 'gold',     desc: 'Pushed through a hard stretch', auto: false, category: 'Special' },
  team_player:         { label: 'Team player',             tier: 'silver',   desc: 'Positive presence in the community', auto: false, category: 'Special' },
  early_bird:          { label: 'Early bird',              tier: 'bronze',   desc: 'Consistent morning training', auto: false, category: 'Special' },
  night_owl:           { label: 'Night owl',               tier: 'bronze',   desc: 'Consistent evening training', auto: false, category: 'Special' },
  consistency_king:    { label: 'Most consistent',         tier: 'elite',    desc: 'Most consistent client', auto: false, category: 'Special' },
};

// Tier names. Badges are shown as plain tiles (label + tier name); the tw_*
// classes are neutral design tokens for any caller that wants a tier chip.
export const TIER_STYLES = {
  bronze: { label: 'Bronze', tw_bg: 'bg-secondary', tw_border: 'border-border', tw_text: 'text-foreground' },
  silver: { label: 'Silver', tw_bg: 'bg-secondary', tw_border: 'border-border', tw_text: 'text-foreground' },
  gold: { label: 'Gold', tw_bg: 'bg-secondary', tw_border: 'border-border', tw_text: 'text-foreground' },
  platinum: { label: 'Platinum', tw_bg: 'bg-secondary', tw_border: 'border-border', tw_text: 'text-foreground' },
  elite: { label: 'Elite', tw_bg: 'bg-foreground', tw_border: 'border-foreground', tw_text: 'text-background' },
};