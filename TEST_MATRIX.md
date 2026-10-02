# TEST_MATRIX.md — Koach AI

_Critical user journeys and their verified status (2026-08-23). "Method": SR = static/code review, DB = live database query, DEP = deployment check, BUILD = build. No end-to-end browser run was possible (production domains unreachable from the audit environment; DB is effectively empty — 0 clients — so runtime E2E would exercise empty states only). Findings are code/DB-verified; each row notes what a live E2E must still confirm._

## Journey A — New coach
| Step | Result | Method | Evidence / blocker |
|---|:-:|:-:|---|
| Landing → signup (`/start`) | ❌ FAIL | SR | never calls `signup()`; stashes password in localStorage (B-auth) |
| Signup (`/signup` direct link) | ⚠️ PASS* | SR | real, but nearly unreachable |
| Login | ✅ PASS | SR | `signInWithPassword` wired |
| Session survives reload | ✅ PASS | SR | supabase-js persist/refresh |
| Protected route enforcement | ❌ FAIL | SR | `ProtectedRoute` never imported; redirect branch dead |
| Onboarding → dashboard | 🟡 PARTIAL | SR | dashboard real; some widgets dead (B1) |
| Create first client | ✅ PASS | SR | RLS insert OK |
| Invite first client | ❌ FAIL | SR | 400 missing clientId (B4) |
| Generate program (AI) | 🟡 PARTIAL | DEP | deployed; no safety validation |
| Edit / assign | ✅ PASS | SR | works |

## Journey B — Client
| Step | Result | Method | Evidence |
|---|:-:|:-:|---|
| Receive invite email | ❌ FAIL | SR | invite send 400s (B4) |
| Open magic link → validate | ✅ PASS | SR/DEP | validateInviteToken deployed & correct |
| Set up account | 🔴 RISK | SR | works but account-takeover P0 (S1) |
| Onboarding | 🟡 PARTIAL | SR | intake function open (S12) |
| Open today's workout | ✅ PASS | SR | portal read OK |
| Complete workout / log sets | ❌ FAIL | SR | `/workout` writes bad client_id (B3); portal path OK |
| Send check-in | ✅ PASS | SR | check_ins insert OK |
| Upload progress photo | ❌ FAIL | DB | no storage bucket live (uploads fail) |
| Message coach | 🟡 PARTIAL | DB | persists; no live update (B7) |

## Journey C — Coach review
| Step | Result | Method | Evidence |
|---|:-:|:-:|---|
| Receive check-in notification | ❌ FAIL | DB/SR | notifications uuid/email bug (B1); Realtime off (B7) |
| Inspect client | ✅ PASS | SR | works |
| See workout history | 🟡 PARTIAL | SR | reads OK; `/workout` writes were failing (B3) |
| Risk/adherence | 🟡 PARTIAL | SR | deterministic, browser-only, not persisted |
| AI summary | ❌ FAIL | DEP | aiProgressInsights undeployed → 404 (B6) |
| Draft response (AI) | ✅ PASS | DEP | aiMessageAssistant deployed |
| Send | 🟡 PARTIAL | DB | persists; no live update |

## Journey D — Billing
| Step | Result | Method | Evidence |
|---|:-:|:-:|---|
| Trial start | 🔴 RISK | SR | infinite trials via `had_trial` self-write (B-TRIAL) |
| Subscription checkout | ✅ PASS | SR/DEP | stripeCheckout wired |
| Webhook → DB | ✅ PASS | SR | sig verified + idempotent |
| Entitlement enforced | ❌ FAIL | SR/DB | paywall open by default (B-PAY); frontend-only gating |
| Cancellation | ❌ FAIL | SR | cancels coach's own plan (B-CANCEL) |
| Cross-tenant data safety | ❌ FAIL | SR | any user reads all Stripe data (B-STRIPE-XT) |

## Journey E — Returning coach
| Step | Result | Method | Evidence |
|---|:-:|:-:|---|
| Login → morning dashboard | ✅ PASS | SR | works |
| Identify at-risk client | 🟡 PARTIAL | SR | computed in-tab, not persisted/surfaced proactively |
| Inspect context | ✅ PASS | SR | works |
| Take action (automation) | 🔴 UNSAFE | SR | browser engine dup-fires; calorie drift (B2) |

## Security / adversarial tests
| Test | Result | Method | Evidence |
|---|:-:|:-:|---|
| Coach A read Coach B rows | ✅ ISOLATED | DB | RLS policies key on auth.uid(); no cross path found |
| Client A read Client B rows | ✅ ISOLATED | DB | is_portal_client scoping sound |
| Self-promote profiles.role=admin | ✅ BLOCKED | DB | protect_profile_privileged_columns trigger (verified) |
| Self-upgrade subscription_tier | ✅ BLOCKED | DB | same trigger |
| Reset own had_trial | ❌ EXPLOITABLE | DB | not in trigger blocklist |
| Account takeover via invite | ❌ EXPLOITABLE | SR | setupPortalAccount password overwrite (S1) |
| Progress photo public access | 🔴 BY DESIGN | DB/SR | public bucket + unscoped read (when bucket exists) |
| Secrets in browser bundle | ❌ EXPOSED | BUILD | VITE_RESEND/CALENDLY/STRIPE keys inlined |
| runAutomations unauth call | ❌ OPEN | DEP/SR | verify_jwt=false, no in-code auth |
| sendEmailNotification relay | ❌ OPEN | SR | any session sends arbitrary mail |

## Infrastructure checks (live)
| Check | Result | Evidence |
|---|:-:|---|
| RLS on all public tables | ✅ | 66/66 tables `rls_enabled=true` |
| Storage bucket exists | ❌ | 0 buckets |
| Realtime publication populated | ❌ | 0 public tables in `supabase_realtime` |
| Cron jobs scheduled | ❌ | `cron.job` empty |
| pgvector (RAG) | ❌ | extension not installed |
| Git history secret scan | ✅ CLEAN | no committed credentials |
| Build | ✅ | `npm run build` succeeds |
| CI quality gates | ❌ | lint/typecheck non-blocking; no tests |

**E2E still required before launch:** seed a realistic tenant (coach + 15–60 clients + history) and run Journeys A–E in a real browser across desktop + mobile viewports; verify each ❌/🟡 above against runtime, not just code.
