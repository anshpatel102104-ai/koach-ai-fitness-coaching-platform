/**
 * FitForge Subscription Tier System
 * Single source of truth for tier definitions, limits and feature flags.
 * Prices live in planPricing.js (the only price table). Limits here must match
 * supabase/functions/_shared/subscriptionTiers.js and app.tier_client_cap() in SQL
 * (enforced by scripts/verify-billing-access.mjs).
 */

export const TIERS = {
  starter: {
    key: 'starter',
    name: 'Starter',
    color: 'text-foreground',
    borderColor: 'border-border',
    bgColor: 'bg-secondary',
    gradient: '',
    badge: 'bg-secondary text-foreground border-transparent',
    limits: {
      max_clients: 10,
      max_programs: -1,         // unlimited
      max_nutrition_plans: -1,  // unlimited
      max_ai_generations_per_month: 15,  // counted: program + meal plan + smart-meals generations (see aiPolicy)
    },
    features: {
      // Pages
      clients: true,
      programs: true,
      nutrition: true,
      schedule: true,
      messages: true,
      progress: false,
      store: false,
      assistant: false,
      adherence: false,
      checkin_review: false,
      sales: false,
      community: false,
      challenges: true,
      client_dashboard: false,
      // Granular feature flags
      ai_suggestions: false,
      ai_checkin_summary: false,       // AI check-in summary — Pro+ (not counted)
      analytics: false,
      custom_branding: false,
      api_access: false,
      voice_video_messages: false,
      program_templates: false,
      analytics_graphs: false,
      ai_features: false,
      adherence_scoring: false,
      checkin_automation: false,
      basic_notifications: false,
      // AI ladder
      ai_program_builder: true,          // metered: counts against the monthly AI generations
      ai_meal_plan_builder: true,        // metered: counts against the monthly AI generations
      ai_onboarding: false,              // Pro+ only
      ai_assistant_full: false,
      ai_team_access: false,
    },
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    color: 'text-foreground',
    borderColor: 'border-border',
    bgColor: 'bg-secondary',
    gradient: '',
    badge: 'bg-secondary text-foreground border-transparent',
    popular: true,
    limits: {
      max_clients: 75,
      max_programs: -1,         // unlimited
      max_nutrition_plans: -1,  // unlimited
      max_ai_generations_per_month: 100,
    },
    features: {
      // Pages
      clients: true,
      programs: true,
      nutrition: true,
      schedule: true,
      messages: true,
      progress: true,
      store: false,
      assistant: false,
      adherence: true,
      checkin_review: true,
      sales: false,
      community: false,
      challenges: true,
      client_dashboard: true,
      // Granular
      ai_suggestions: true,        // AI-drafted replies — Pro+
      ai_checkin_summary: true,       // AI check-in summary — Pro+ (not counted)
      analytics: true,
      custom_branding: false,
      api_access: false,
      voice_video_messages: true,
      program_templates: true,
      analytics_graphs: true,
      ai_features: false,
      adherence_scoring: true,
      checkin_automation: true,
      basic_notifications: true,
      // AI ladder
      ai_program_builder: true,          // metered (100/mo)
      ai_meal_plan_builder: true,        // metered (100/mo)
      ai_onboarding: true,               // AI Onboarding — Pro+ (metered)
      ai_assistant_full: false,          // full AI assistant locked to Elite+
      ai_team_access: false,
    },
  },
  elite: {
    key: 'elite',
    name: 'Elite',
    color: 'text-foreground',
    borderColor: 'border-border',
    bgColor: 'bg-secondary',
    gradient: '',
    badge: 'bg-secondary text-foreground border-transparent',
    limits: {
      max_clients: -1,      // unlimited
      max_programs: -1,
      max_nutrition_plans: -1,
      max_ai_generations_per_month: 300,
    },
    features: {
      // Pages
      clients: true,
      programs: true,
      nutrition: true,
      schedule: true,
      messages: true,
      progress: true,
      store: true,
      assistant: true,
      adherence: true,
      checkin_review: true,
      sales: true,
      community: true,
      challenges: true,
      client_dashboard: true,
      // Granular — all Pro features
      ai_suggestions: true,
      ai_checkin_summary: true,       // AI check-in summary — Pro+ (not counted)
      analytics: true,
      custom_branding: true,
      api_access: false,
      voice_video_messages: true,
      program_templates: true,
      analytics_graphs: true,
      ai_features: true,
      adherence_scoring: true,
      checkin_automation: true,
      basic_notifications: true,
      // AI ladder
      ai_program_builder: true,          // metered (300/mo)
      ai_meal_plan_builder: true,        // metered (300/mo)
      ai_onboarding: true,               // AI Onboarding — Pro+ (metered)
      ai_assistant_full: true,           // Full AI Assistant — auto progression, check-in analysis, coaching automation
      ai_team_access: false,
      // Elite-exclusive
      ai_calorie_suggestions: true,
      ai_workout_progression: true,
      ai_checkin_responses: true,
      auto_progression_rules: true,
      trigger_notifications: true,
      revenue_dashboard: true,
    },
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    color: 'text-foreground',
    borderColor: 'border-border',
    bgColor: 'bg-secondary',
    gradient: '',
    badge: 'bg-secondary text-foreground border-transparent',
    limits: {
      max_clients: -1,
      max_programs: -1,
      max_nutrition_plans: -1,
      max_ai_generations_per_month: -1,  // unlimited
    },
    features: {
      clients: true,
      programs: true,
      nutrition: true,
      schedule: true,
      messages: true,
      progress: true,
      store: true,
      assistant: true,
      adherence: true,
      checkin_review: true,
      sales: true,
      community: true,
      challenges: true,
      client_dashboard: true,
      ai_suggestions: true,
      ai_checkin_summary: true,       // AI check-in summary — Pro+ (not counted)
      analytics: true,
      custom_branding: true,
      api_access: true,
      voice_video_messages: true,
      program_templates: true,
      analytics_graphs: true,
      ai_features: true,
      adherence_scoring: true,
      checkin_automation: true,
      basic_notifications: true,
      // AI ladder
      ai_program_builder: true,          // unlimited
      ai_meal_plan_builder: true,        // unlimited
      ai_onboarding: true,               // AI Onboarding — Pro+ (unlimited)
      ai_assistant_full: true,
      ai_team_access: true,              // Team-wide AI access for multiple coaches
      // Enterprise-exclusive
      ai_calorie_suggestions: true,
      ai_workout_progression: true,
      ai_checkin_responses: true,
      auto_progression_rules: true,
      trigger_notifications: true,
      revenue_dashboard: true,
    },
  },
};

export const TIER_ORDER = ['starter', 'pro', 'elite', 'enterprise'];

/** Feature display info for the upgrade modal */
export const FEATURE_INFO = {
  // Pro-tier features
  progress: {
    name: 'Progress Analytics',
    description: 'Track client body metrics, weight trends, and compliance charts over time.',
    icon: 'TrendingUp',
    minTier: 'pro',
  },
  adherence: {
    name: 'Adherence & Gamification',
    description: 'Track client compliance, award badges, and run leaderboards.',
    icon: 'Trophy',
    minTier: 'pro',
  },
  checkin_review: {
    name: 'Check-in Reviews',
    description: 'Review and respond to structured client check-ins with photos.',
    icon: 'ClipboardList',
    minTier: 'pro',
  },
  client_dashboard: {
    name: 'Client Mobile Dashboard',
    description: 'Give clients a beautiful daily dashboard with rings, streaks, and logs.',
    icon: 'Smartphone',
    minTier: 'pro',
  },
  voice_video_messages: {
    name: 'Voice & Video Messages',
    description: 'Send voice notes and video messages to clients.',
    icon: 'Mic',
    minTier: 'pro',
  },
  program_templates: {
    name: 'Program Templates & Automation',
    description: 'Use pre-built templates and automate program delivery to clients.',
    icon: 'LayoutTemplate',
    minTier: 'pro',
  },
  analytics_graphs: {
    name: 'Analytics & Charts',
    description: 'Visual trend charts for weight, compliance, body composition, and more.',
    icon: 'TrendingUp',
    minTier: 'pro',
  },
  adherence_scoring: {
    name: 'Adherence Scoring',
    description: 'Automated adherence scores and gamification for client motivation.',
    icon: 'Trophy',
    minTier: 'pro',
  },
  checkin_automation: {
    name: 'Check-in Automation',
    description: 'Automate client check-in forms and reminders.',
    icon: 'ClipboardList',
    minTier: 'pro',
  },
  basic_notifications: {
    name: 'Basic Notifications',
    description: 'Alerts for missed workouts and low client compliance.',
    icon: 'Bell',
    minTier: 'pro',
  },
  clients: {
    name: 'More Clients',
    description: 'Upgrade your plan to manage more clients and grow your business.',
    icon: 'Users',
    minTier: 'pro',
  },
  // Elite-tier features
  store: {
    name: 'Digital Store',
    description: 'Sell workout programs and nutrition plans directly to clients online.',
    icon: 'ShoppingBag',
    minTier: 'elite',
  },
  assistant: {
    name: 'Full AI Coach Assistant',
    description: 'Progression rules, check-in analysis and coaching automations that run on your clients\' data.',
    icon: 'Bot',
    minTier: 'elite',
  },
  ai_assistant_full: {
    name: 'Full AI Coach Assistant',
    description: 'Progression rules, check-in analysis and coaching automations that run on your clients\' data.',
    icon: 'Bot',
    minTier: 'elite',
  },
  ai_onboarding: {
    name: 'AI Onboarding',
    description: 'Generate a personalised starting program and meal plan for a client in one click — review and approve before saving.',
    icon: 'Bot',
    minTier: 'pro',
  },
  ai_program_builder: {
    name: 'AI Program Builder',
    description: 'Draft a full workout program for a client from their goals and history, then edit it before assigning.',
    icon: 'Bot',
    minTier: 'starter',
  },
  ai_meal_plan_builder: {
    name: 'AI Meal Plan Builder',
    description: 'Generate precise, macro-accurate nutrition plans tailored to each client.',
    icon: 'Bot',
    minTier: 'starter',
  },
  ai_team_access: {
    name: 'Team-Wide AI Access',
    description: 'Full AI access for multiple coaches in your organization, plus AI API access.',
    icon: 'Bot',
    minTier: 'enterprise',
  },
  ai_features: {
    name: 'Advanced AI Features',
    description: 'AI suggestions, summaries and drafts across the app.',
    icon: 'Bot',
    minTier: 'elite',
  },
  ai_suggestions: {
    name: 'AI Message Suggestions',
    description: 'Get AI-drafted replies when messaging clients and responding to check-ins.',
    icon: 'Bot',
    minTier: 'pro',
  },
  ai_checkin_summary: {
    name: 'AI Check-in Summary',
    description: 'An AI summary of each client check-in with a suggested reply.',
    icon: 'Bot',
    minTier: 'pro',
  },
  ai_calorie_suggestions: {
    name: 'AI Calorie Adjustments',
    description: 'Calorie and macro adjustments suggested from each client\'s progress.',
    icon: 'Bot',
    minTier: 'elite',
  },
  ai_workout_progression: {
    name: 'AI Workout Progression',
    description: 'Automatic workout progression suggestions based on client performance.',
    icon: 'Bot',
    minTier: 'elite',
  },
  ai_checkin_responses: {
    name: 'Auto Check-in Responses',
    description: 'AI-generated personalized responses to client weekly check-ins.',
    icon: 'Bot',
    minTier: 'elite',
  },
  auto_progression_rules: {
    name: 'Auto Progression Rules',
    description: 'Set rules to automatically progress workouts as clients hit milestones.',
    icon: 'Zap',
    minTier: 'elite',
  },
  trigger_notifications: {
    name: 'Trigger-Based Notifications',
    description: 'Set automated alerts based on client behavior and performance triggers.',
    icon: 'Bell',
    minTier: 'elite',
  },
  revenue_dashboard: {
    name: 'Revenue Dashboard',
    description: 'Monitor MRR, active clients, churn risk, and business growth metrics.',
    icon: 'DollarSign',
    minTier: 'elite',
  },
  sales: {
    name: 'Sales Pipeline CRM',
    description: 'Track leads from first contact through close with notes and status management.',
    icon: 'DollarSign',
    minTier: 'elite',
  },
  community: {
    name: 'Community Module',
    description: 'Build a client community with feeds, challenges, and leaderboards.',
    icon: 'Globe',
    minTier: 'elite',
  },
  custom_branding: {
    name: 'White-Label Branding',
    description: 'Customize the platform with your own logo, colors, and domain.',
    icon: 'Palette',
    minTier: 'elite',
  },
  // Enterprise-tier features
  api_access: {
    name: 'API Access',
    description: 'Connect FitForge to your own tools and workflows via REST API.',
    icon: 'Code',
    minTier: 'enterprise',
  },
};

/**
 * Get the tier config for a user. Defaults to 'starter'.
 * Admin and comped (owner/staff) users always get Enterprise-level access.
 */
export function getUserTier(user) {
  if (user?.role === 'admin' || user?.is_comped) return TIERS.enterprise;
  const tierKey = user?.subscription_tier || 'starter';
  return TIERS[tierKey] || TIERS.starter;
}

/**
 * Check if a user's tier has access to a feature.
 */
export function hasFeature(user, featureKey) {
  const tier = getUserTier(user);
  return tier.features[featureKey] === true;
}

/**
 * Check if a user's tier meets a minimum tier requirement.
 */
export function meetsMinTier(user, minTierKey) {
  const userTierIndex = TIER_ORDER.indexOf(user?.subscription_tier || 'starter');
  const minTierIndex = TIER_ORDER.indexOf(minTierKey);
  return userTierIndex >= minTierIndex;
}

/**
 * Get limit value (-1 = unlimited).
 */
export function getLimit(user, limitKey) {
  const tier = getUserTier(user);
  return tier.limits[limitKey] ?? -1;
}

/**
 * Check if a usage count is within the tier limit.
 */
export function withinLimit(user, limitKey, currentCount) {
  const limit = getLimit(user, limitKey);
  if (limit === -1) return true;
  return currentCount < limit;
}

/**
 * Get usage as a percentage (0–100). Returns 0 if unlimited.
 */
export function getUsagePercent(user, limitKey, currentCount) {
  const limit = getLimit(user, limitKey);
  if (limit === -1) return 0;
  return Math.min((currentCount / limit) * 100, 100);
}