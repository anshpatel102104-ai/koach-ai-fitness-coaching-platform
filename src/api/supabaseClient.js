/**
 * supabaseClient — drop-in facade over @supabase/supabase-js that mirrors the
 * base44Client surface, so cutover is an import swap, not a rewrite:
 *
 *   import { supabase as base44 } from '@/api/supabaseClient';
 *   base44.entities.Client.list('-created_date')      // -> from('clients')...
 *   base44.entities.Client.filter({ id }, '-date', 50)
 *   base44.entities.Client.create(data) / .update(id, data) / .delete(id) / .get(id)
 *   base44.auth.me() / .updateMe(data) / .logout() / .redirectToLogin()
 *   base44.functions.invoke(name, payload)            // -> Edge Function (Step 5)
 *
 * COACH vs PORTAL context (see SCHEMA_MIGRATION.md):
 *   - `supabase`        : coach/admin app pages. Entities map to base tables.
 *   - `supabasePortal`  : client-portal pages ONLY (src/pages/portal/*).
 *     Identical shape, but CheckIn routes through check_ins_portal_view
 *     (CRUD) and Session/CoachingSession through coaching_sessions_portal_view
 *     (read-only) — the base tables are not portal-readable since Step 1.5.
 *
 * Field-name compatibility with Base44 rows:
 *   - outgoing sort/filter/payload keys `created_date`/`updated_date`/
 *     `created_by_id` are translated to created_at/updated_at/created_by;
 *   - returned rows get read-only `created_date`/`updated_date` aliases so
 *     existing page code keeps working during the incremental cutover.
 */
import { createClient } from '@supabase/supabase-js';

// Base44 entity name -> Postgres table (SCHEMA_MIGRATION.md is authoritative)
const ENTITY_TABLES = {
  AIConversation: 'ai_conversations',
  AffiliateApplication: 'affiliate_applications',
  AffiliateCommission: 'affiliate_commissions',
  AffiliateLink: 'affiliate_links',
  AffiliatePayout: 'affiliate_payouts',
  AffiliateProfile: 'affiliate_profiles',
  AutomationLog: 'automation_logs',
  AutomationRule: 'automation_rules',
  BlockedTime: 'blocked_times',
  BufferTime: 'buffer_times',
  BusinessSettings: 'business_settings',
  Challenge: 'challenges',
  CheckIn: 'check_ins',
  CheckInForm: 'check_in_forms',
  Client: 'clients',
  ClientBadge: 'client_badges',
  ClientImportJob: 'client_import_jobs',
  CoachAvailability: 'coach_availability',
  CoachDefaults: 'coach_defaults',
  CoachProfile: 'coach_profiles',
  CoachSettings: 'coach_settings',
  CoachingPackage: 'coaching_packages',
  CommunityGroup: 'community_groups',
  CommunityPost: 'community_posts',
  CommunitySettings: 'community_settings',
  DailyLog: 'daily_logs',
  EmailTemplate: 'email_templates',
  ExerciseLibrary: 'exercise_library',
  FoodItem: 'food_items',
  FoodLog: 'food_logs',
  Goal: 'goals',
  GoalTemplate: 'goal_templates',
  Habit: 'habits',
  HabitCompletion: 'habit_completions',
  InBodyScan: 'in_body_scans',
  Invoice: 'invoices',
  Lead: 'leads',
  MarketingCampaign: 'marketing_campaigns',
  MarketingLink: 'marketing_links',
  MealTemplate: 'meal_templates',
  Message: 'messages',
  Notification: 'notifications',
  NotificationSettings: 'notification_settings',
  NutritionPlan: 'nutrition_plans',
  OnboardingResponse: 'onboarding_responses',
  Payment: 'payments',
  PlanListing: 'plan_listings',
  PostComment: 'post_comments',
  Referral: 'referrals',
  ReferralPayout: 'referral_payouts',
  ReferralProgram: 'referral_programs',
  ReminderSettings: 'reminder_settings',
  Session: 'coaching_sessions',
  CoachingSession: 'coaching_sessions', // alias
  SupplementLibrary: 'supplement_library',
  Team: 'teams',
  TeamMember: 'team_members',
  Testimonial: 'testimonials',
  User: 'profiles',
  WeighIn: 'weigh_ins',
  WhiteLabelSettings: 'white_label_settings',
  WorkoutProgram: 'workout_programs',
  WorkoutSession: 'workout_sessions',
  ZapierLog: 'zapier_logs',
};

// Portal overrides: these entities must NOT hit their base tables from the
// client portal (Step 1.5 Fix 2). readOnly mirrors the view's grants.
const PORTAL_OVERRIDES = {
  CheckIn: { table: 'check_ins_portal_view' },
  Session: { table: 'coaching_sessions_portal_view', readOnly: true },
  CoachingSession: { table: 'coaching_sessions_portal_view', readOnly: true },
  // S6: portal client reads go through the column-restricted view (no
  // notes/lifecycle_notes/monthly_rate/stripe_customer_id/invite token). The
  // base `clients` table no longer grants portal SELECT (migration
  // 20260823000400). Read-only: portal clients don't create/update client rows.
  Client: { table: 'clients_portal_view', readOnly: true },
};

const FIELD_RENAMES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
  created_by_id: 'created_by',
};

const renameField = (key) => FIELD_RENAMES[key] ?? key;

const renameKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[renameField(k)] = v;
  return out;
};

// Add Base44-style timestamp aliases to a returned row (non-destructive).
const aliasRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  if (row.created_at !== undefined && row.created_date === undefined) row.created_date = row.created_at;
  if (row.updated_at !== undefined && row.updated_date === undefined) row.updated_date = row.updated_at;
  if (row.created_by !== undefined && row.created_by_id === undefined) row.created_by_id = row.created_by;
  return row;
};

const aliasRows = (rows) => (Array.isArray(rows) ? rows.map(aliasRow) : rows);

// Lazily create the underlying client so importing this module never throws
// when the Supabase env isn't configured (pages still on base44 must build).
let _client = null;
export function getSupabase() {
  if (_client) return _client;
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see SCHEMA_MIGRATION.md, Step 2).'
    );
  }
  _client = createClient(url, key);
  return _client;
}

// Test seam: lets verification scripts inject a driver without a live
// Supabase project. Not for application code.
export function __setSupabaseClientForTests(client) {
  _client = client;
}

const throwIf = (error) => {
  if (error) {
    const e = new Error(error.message || String(error));
    e.code = error.code;
    e.details = error.details;
    throw e;
  }
};

// '-created_date' -> order created_at desc; 'name' -> order name asc
const applySort = (query, sort) => {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const col = renameField(desc ? sort.slice(1) : sort);
  return query.order(col, { ascending: !desc });
};

const applyCriteria = (query, criteria) => {
  for (const [rawKey, value] of Object.entries(criteria || {})) {
    const key = renameField(rawKey);
    if (value === null || value === undefined) query = query.is(key, null);
    else if (Array.isArray(value)) query = query.in(key, value);
    else query = query.eq(key, value);
  }
  return query;
};

function makeEntity(name, { table, readOnly = false }) {
  const assertWritable = (op) => {
    if (readOnly) {
      throw new Error(
        `${name} is read-only in the portal context (${table}); '${op}' is not permitted.`
      );
    }
  };
  return {
    async list(sort = '-created_date', limit) {
      let q = getSupabase().from(table).select('*');
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      throwIf(error);
      return aliasRows(data ?? []);
    },
    async filter(criteria, sort, limit) {
      let q = getSupabase().from(table).select('*');
      q = applyCriteria(q, criteria);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      throwIf(error);
      return aliasRows(data ?? []);
    },
    async get(id) {
      const { data, error } = await getSupabase().from(table).select('*').eq('id', id).maybeSingle();
      throwIf(error);
      return aliasRow(data);
    },
    async create(payload) {
      assertWritable('create');
      const { data, error } = await getSupabase()
        .from(table)
        .insert(renameKeys(payload))
        .select()
        .single();
      throwIf(error);
      return aliasRow(data);
    },
    async update(id, payload) {
      assertWritable('update');
      // Use .select() (array) and assert a row came back. Previously this used
      // .maybeSingle(), which returns null with NO error when an UPDATE matches
      // zero rows (record missing, or RLS/validation denied the write) — so the
      // caller's onSuccess fired and the UI reported "Saved!" while nothing was
      // written (the phantom-save class of bugs). Surface it instead.
      const { data, error } = await getSupabase()
        .from(table)
        .update(renameKeys(payload))
        .eq('id', id)
        .select();
      throwIf(error);
      if (!data || data.length === 0) {
        throw new Error(
          `${name}.update(${id}) affected no rows — the record is missing or the write was not permitted.`,
        );
      }
      return aliasRow(data[0]);
    },
    async delete(id) {
      assertWritable('delete');
      const { error } = await getSupabase().from(table).delete().eq('id', id);
      throwIf(error);
      return { id };
    },
    /**
     * Base44-compatible realtime subscription, backed by Supabase Realtime.
     * Emits `{ type: 'create'|'update'|'delete', id, data }` (the shape Base44's
     * subscribe() callers expect), mapping INSERT/UPDATE/DELETE accordingly.
     * Returns an unsubscribe function. Requires the table to be in the
     * `supabase_realtime` publication (see migration 20260716000200) and RLS to
     * permit the subscriber. Degrades to a harmless no-op if Realtime isn't
     * available (e.g. the injected test driver, or Supabase unconfigured).
     */
    subscribe(callback) {
      let client;
      try {
        client = getSupabase();
      } catch {
        client = null;
      }
      if (!client || typeof client.channel !== 'function') {
        if (import.meta.env?.DEV) {
          console.warn(`[supabaseClient] ${name}.subscribe(): Realtime unavailable — no-op.`);
        }
        return () => {};
      }
      const TYPE = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };
      const rand = Math.random().toString(36).slice(2);
      const channel = client
        .channel(`realtime:${table}:${rand}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
          callback?.({
            type: TYPE[payload?.eventType] || 'update',
            id: row?.id,
            data: aliasRow(row ? { ...row } : null),
          });
        })
        .subscribe();
      return () => {
        try { client.removeChannel(channel); } catch { /* already torn down */ }
      };
    },
  };
}

function buildEntities(overrides = {}) {
  const entities = {};
  for (const [name, table] of Object.entries(ENTITY_TABLES)) {
    entities[name] = makeEntity(name, overrides[name] ?? { table });
  }
  return entities;
}

const auth = {
  /**
   * base44.auth.me() equivalent: Supabase session user merged with the
   * public.profiles row. Shape notes vs Base44 (documented in
   * SCHEMA_MIGRATION.md): id/email/full_name/role/subscription fields all
   * present; `created_date` aliases the profile's created_at. Requires a
   * Supabase Auth session (Step 3) — rejects when signed out, matching
   * base44.auth.me()'s rejection when unauthenticated.
   */
  async me() {
    const sb = getSupabase();
    const { data: { user } = {}, error } = await sb.auth.getUser();
    throwIf(error);
    if (!user) throw new Error('Not authenticated');
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    throwIf(pErr);
    return aliasRow({
      ...(profile ?? {}),
      id: user.id,
      email: profile?.email ?? user.email,
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? '',
    });
  },
  /** base44.auth.updateMe(data) -> update own profiles row (privileged
   *  columns like role/subscription are blocked by a DB trigger). */
  async updateMe(payload) {
    const sb = getSupabase();
    const { data: { user } = {}, error } = await sb.auth.getUser();
    throwIf(error);
    if (!user) throw new Error('Not authenticated');
    const { data, error: uErr } = await sb
      .from('profiles')
      .update(renameKeys(payload))
      .eq('id', user.id)
      .select()
      .single();
    throwIf(uErr);
    return aliasRow(data);
  },
  async logout(nextUrl) {
    await getSupabase().auth.signOut();
    if (typeof window !== 'undefined') window.location.assign('/login');
  },
  /** Route to the in-app login page (Supabase auth, Step 3). */
  redirectToLogin() {
    if (typeof window !== 'undefined') window.location.assign('/login');
  },

  // --- real Supabase Auth session (Step 3a) ---------------------------------

  /** True if there is a live session (used by AuthContext to gate the shell). */
  async hasSession() {
    const { data: { session } } = await getSupabase().auth.getSession();
    return !!session;
  },

  /** Email/password sign-in. Returns me() on success. */
  async login({ email, password }) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    throwIf(error);
    return this.me();
  },

  /**
   * Email/password sign-up. full_name is stored in user_metadata, which the
   * handle_new_user() trigger copies into the new profiles row. If the project
   * requires email confirmation, `session` is null until the user confirms.
   */
  async signup({ email, password, full_name }) {
    const sb = getSupabase();
    const emailRedirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name ?? '' }, emailRedirectTo },
    });
    throwIf(error);
    return { needsConfirmation: !data.session, user: data.user };
  },

  /** Trigger Supabase's built-in password-reset email. */
  async requestPasswordReset(email) {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
    throwIf(error);
    return { sent: true };
  },

  /** Set a new password (during the reset-link session, or while signed in). */
  async updatePassword(newPassword) {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    throwIf(error);
    return { updated: true };
  },

  /** Subscribe to auth-state changes (login/logout/token refresh). */
  onAuthStateChange(cb) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => cb(session));
    return () => data?.subscription?.unsubscribe?.();
  },
};

const functions = {
  /**
   * base44.functions.invoke(name, payload) -> Supabase Edge Function.
   * Returns { data } so existing `res.data.x` call sites keep working.
   * NOTE: the 42 Base44 functions are re-platformed in Step 5; until a
   * function is deployed, invoking it rejects (same as base44 on a missing
   * function) — do not swallow that here.
   */
  async invoke(name, payload) {
    const { data, error } = await getSupabase().functions.invoke(name, { body: payload });
    throwIf(error);
    return { data };
  },
};

// Supabase-native replacement for Base44's `integrations.Core.UploadFile`.
// Deliberately NOT named `integrations.Core.*` — the Base44 integrations surface
// is fully retired from the frontend (LLM/email calls go to ported Edge
// Functions; file upload goes here). Call sites use `base44.uploadFile({ file })`.
const STORAGE_BUCKET = 'uploads';
/**
 * base44.uploadFile({ file }) -> { file_url }. Uploads to the public `uploads`
 * Supabase Storage bucket (provisioned by migration 20260716000100) under a
 * collision-resistant key and returns the public URL. Same call/return shape as
 * the old Base44 Core.UploadFile so call sites only change the method name.
 */
async function uploadFile({ file }) {
  const sb = getSupabase();
  const safeName = (file?.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const rand = Math.random().toString(36).slice(2);
  const path = `${Date.now()}-${rand}-${safeName}`;
  const { data, error } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  throwIf(error);
  const { data: pub } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  return { file_url: pub.publicUrl };
}

export const supabase = {
  entities: buildEntities(),
  auth,
  functions,
  uploadFile,
};

// Client-portal variant — see header. Portal pages ONLY.
export const supabasePortal = {
  entities: buildEntities(PORTAL_OVERRIDES),
  auth,
  functions,
  uploadFile,
};
