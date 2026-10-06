import {
  LayoutDashboard, Users, MessageSquare, Calendar, Dumbbell, Salad, ClipboardList,
  Trophy, BarChart3, UserPlus, ShoppingBag, MessagesSquare, Bot, Settings,
  Activity, Apple, Globe, Flame, LayoutTemplate, Palette, UsersRound, FileText,
  Mail, BookOpen, Shield, CreditCard, CalendarCheck, PenLine, PlusCircle, Sun, Moon,
} from 'lucide-react';

/**
 * Central command registry — the single source of truth for the ⌘K palette and
 * the future Nova action surface. Registering a new command is a one-object
 * addition to COMMANDS below. Keep entries declarative; put side effects in
 * `run(ctx)`, which receives a context object built by the palette.
 *
 * @typedef {Object} CommandCtx
 * @property {(path: string) => void} navigate
 * @property {(pref: 'light'|'dark'|'system') => void} setTheme
 * @property {() => void} close
 * @property {(event: string, props?: Record<string, unknown>) => void} track
 *
 * @typedef {Object} Command
 * @property {string} id            stable id, used for telemetry
 * @property {string} title         label shown in the palette
 * @property {string} section       'AI' | 'Create' | 'Go to'
 * @property {any} icon             lucide icon component
 * @property {string} [keywords]    extra fuzzy-search terms
 * @property {(ctx: CommandCtx) => void} run
 */

const go = (path) => (ctx) => { ctx.navigate(path); ctx.close(); };

/** Navigation targets — every coach route, including the ones demoted from the sidebar. */
const ROUTES = [
  { id: 'go.dashboard', title: 'Today', path: '/', icon: LayoutDashboard, keywords: 'home today dashboard' },
  { id: 'go.clients', title: 'Clients', path: '/clients', icon: Users, keywords: 'roster people' },
  { id: 'go.messages', title: 'Messages', path: '/messages', icon: MessageSquare, keywords: 'chat inbox dm' },
  { id: 'go.calendar', title: 'Calendar', path: '/schedule', icon: Calendar, keywords: 'schedule sessions booking' },
  { id: 'go.programs', title: 'Programs', path: '/programs', icon: Dumbbell, keywords: 'workouts training plans' },
  { id: 'go.nutrition', title: 'Nutrition', path: '/nutrition', icon: Salad, keywords: 'meals macros diet' },
  { id: 'go.checkins', title: 'Check-ins', path: '/checkin-review', icon: ClipboardList, keywords: 'review forms' },
  { id: 'go.adherence', title: 'Adherence', path: '/adherence', icon: Trophy, keywords: 'compliance streaks' },
  { id: 'go.atrisk', title: 'At-risk clients', path: '/at-risk', icon: Shield, keywords: 'churn retention adherence' },
  { id: 'go.business', title: 'Business', path: '/business', icon: BarChart3, keywords: 'revenue analytics finance' },
  { id: 'go.leads', title: 'Leads', path: '/sales', icon: UserPlus, keywords: 'sales pipeline crm prospects' },
  { id: 'go.store', title: 'Store', path: '/store', icon: ShoppingBag, keywords: 'products checkout selling' },
  { id: 'go.assistant', title: 'AI assistant', path: '/assistant', icon: MessagesSquare, keywords: 'nova copilot chat ai' },
  { id: 'go.automations', title: 'Automations', path: '/automations', icon: Bot, keywords: 'workflows rules triggers' },
  { id: 'go.settings', title: 'Settings', path: '/settings', icon: Settings, keywords: 'preferences account' },
  // Demoted from the sidebar — reachable here and in Settings.
  { id: 'go.exercises', title: 'Exercise library', path: '/exercises', icon: Activity, keywords: 'movements demos videos' },
  { id: 'go.foodlibrary', title: 'Food library', path: '/food-library', icon: Apple, keywords: 'foods usda ingredients' },
  { id: 'go.community', title: 'Community', path: '/community', icon: Globe, keywords: 'groups social feed' },
  { id: 'go.challenges', title: 'Challenges', path: '/challenges', icon: Flame, keywords: 'competitions leaderboard' },
  { id: 'go.templates', title: 'Templates', path: '/coaching-templates', icon: LayoutTemplate, keywords: 'presets reuse' },
  { id: 'go.whitelabel', title: 'White label', path: '/white-label', icon: Palette, keywords: 'branding theme colors logo' },
  { id: 'go.team', title: 'Team', path: '/team', icon: UsersRound, keywords: 'staff coaches members' },
  { id: 'go.weeklysummary', title: 'Weekly summary', path: '/weekly-summary', icon: FileText, keywords: 'report digest' },
  { id: 'go.emailcenter', title: 'Email center', path: '/email-center', icon: Mail, keywords: 'broadcast campaigns' },
  { id: 'go.onboarding', title: 'Client intake', path: '/onboarding-manager', icon: BookOpen, keywords: 'intake new clients onboarding manager' },
  { id: 'go.analytics', title: 'Analytics', path: '/analytics', icon: BarChart3, keywords: 'metrics charts' },
  { id: 'go.subscription', title: 'Billing and plan', path: '/subscription', icon: CreditCard, keywords: 'plan upgrade billing' },
];

const ROUTE_COMMANDS = ROUTES.map(r => ({
  id: r.id,
  title: r.title,
  section: 'Go to',
  icon: r.icon,
  keywords: r.keywords,
  run: go(r.path),
}));

/** AI quick-actions and Create shortcuts. These are the extensible Nova actions. */
const ACTION_COMMANDS = [
  {
    id: 'ai.run_my_day',
    title: 'Plan my day',
    section: 'AI',
    icon: CalendarCheck,
    keywords: 'triage priorities morning',
    run: (ctx) => { ctx.track('ai.action', { action: 'run_my_day' }); ctx.navigate('/'); ctx.close(); },
  },
  {
    id: 'ai.draft_checkin_reply',
    title: 'Draft a check-in reply',
    section: 'AI',
    icon: PenLine,
    keywords: 'respond review feedback',
    run: (ctx) => { ctx.track('ai.action', { action: 'draft_checkin_reply' }); ctx.navigate('/checkin-review'); ctx.close(); },
  },
  {
    id: 'create.client',
    title: 'Add client',
    section: 'Create',
    icon: PlusCircle,
    keywords: 'new invite roster',
    run: (ctx) => { ctx.track('create', { entity: 'client' }); ctx.navigate('/clients?new=1'); ctx.close(); },
  },
  {
    id: 'create.program',
    title: 'New program',
    section: 'Create',
    icon: Dumbbell,
    keywords: 'build workout plan',
    run: (ctx) => { ctx.track('create', { entity: 'program' }); ctx.navigate('/program-builder'); ctx.close(); },
  },
  {
    id: 'theme.dark',
    title: 'Switch to dark mode',
    section: 'Create',
    icon: Moon,
    keywords: 'theme appearance night',
    run: (ctx) => { ctx.setTheme('dark'); ctx.close(); },
  },
  {
    id: 'theme.light',
    title: 'Switch to light mode',
    section: 'Create',
    icon: Sun,
    keywords: 'theme appearance day',
    run: (ctx) => { ctx.setTheme('light'); ctx.close(); },
  },
];

/** The full command list. Order defines default display order within a section. */
export const COMMANDS = [...ACTION_COMMANDS, ...ROUTE_COMMANDS];

/** Section render order for the palette. */
export const COMMAND_SECTIONS = ['AI', 'Create', 'Go to'];
