# AI_ARCHITECTURE_AUDIT.md — Koach AI

_Audit date: 2026-08-23. Source of truth: repository + live Supabase project `phjmcihgodvhbiaksvyl` ("KOACH AI"). Documentation was not trusted; every claim was verified against code and the running project._

## Executive summary

- All LLM calls route through **one shared helper**, `supabase/functions/_shared/anthropic.js`. Default model `claude-sonnet-5`, key `ANTHROPIC_API_KEY`, raw `fetch` — **no SDK, no timeout, no retry, no token/cost capture**.
- **RAG does not exist.** No pgvector (confirmed: `vector` extension not installed on the live DB), no embeddings, no retrieval. The only grounding is one flat `SELECT * FROM exercise_library LIMIT 500` pasted into the program-generation prompt.
- **5 of the AI functions the frontend calls are NOT deployed** and 404 in production (verified live): `aiBusinessInsights`, `aiCheckInInsights`, `aiProgressInsights`, `aiNutritionInsights`, `aiInBodyScan`. Every "AI insights" surface is therefore dead.
- **AI safety is prompt-only.** No deterministic allergen check, no injury/contraindication check on output, and the main meal generator (`generateSmartMeals`) receives no allergy input at all — yet persists plans to the DB.
- `zod` is a dependency but **unused server-side**; 9 of 11 functions do zero output-shape validation. This is a regression from the legacy Base44 layer, which passed JSON schemas.
- The `src/lib/*Engine.js` files ("riskEngine", "insightEngine", "decisionEngine", "analyticsEngine") are **deterministic, browser-resident, and do not persist** — they are not AI.

## Model / infra layer (`_shared/anthropic.js`)

| Property | State | Evidence |
|---|---|---|
| Model | `claude-sonnet-5` default, `ANTHROPIC_MODEL` override | `_shared/anthropic.js:14,21` |
| Transport | raw `fetch` to `api.anthropic.com/v1/messages` | `:11,55` |
| Timeout / AbortController | **none** — a hung call holds the function until platform kill | `:55-68` |
| Retry / fallback model | **none** | entire file |
| Structured output | `JSON.parse`, else greedy `/[{[][\s\S]*[}\]]/` regex | `:29-35` |
| Cost tracking | `data.usage` **discarded**; no token log, no spend table | `:78-84` |
| Config documentation | `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`/`USDA_API_KEY` absent from `.env.example` | — |

## AI feature inventory (deployment-verified)

### Deployed AND called (functional path)
| Feature | Function | Caller | Context | Output validation | Persists | Metered |
|---|---|---|---|---|---|---|
| AI program generation | `generateAIProgram` | `AIBuilder.jsx:39`, `AIOnboardingModal.jsx:79` | client profile from request body (unverified) + coach's `exercise_library` (≤500 rows / 100 names) + deterministic split/volume guidance | `if(!title||!Array.isArray(workouts))` only | frontend writes on approve | yes |
| AI meal plan (onboarding) | `generateMealPlan` | `AIOnboardingModal.jsx:80` | body; allergies interpolated as text; **hardcoded 8-supplement protocol appended unconditionally** | `if(!training_day)` | frontend | yes |
| AI meal plan (main UI) | `generateSmartMeals` | `AIGeneratorModal.jsx:1071`, `SmartNutritionGenerator.jsx:264,296` | **macros only — no allergy/diet field exists** | **none** | **yes → `nutrition_plans`** | yes |
| Message drafting (8 actions) | `aiMessageAssistant` | 12+ components via `src/lib/aiMessageAssistant.js` | all context from body (profile, last check-in, last 5 msgs, coach tone) | none | no | no |
| Coach assistant (agentic) | `claudeAssistant` | `AssistantClaudeChat.jsx:200` | 10-tool system prompt, ≤6 iterations/request, per-tool `ownsClient` checks | try/catch, bad actions skipped | yes (via tools) | no |
| Exercise library seed | `generateExerciseLibrary` | **no caller** | prompt asks for "REAL YouTube IDs" (hallucination trap) | `Array.isArray` | yes (50 inserts, service role) | no |
| CSV column mapping | `mapImportColumns` | `ImportClientsModal.jsx:44` | deterministic-first, AI fill-nulls-only (best-designed) | robust merge policy | via `commitClientImport` | no |

### Called but NOT deployed → 404 in production (verified via `get_edge_function` → NotFoundException)
| Feature | Function (undeployed) | Callers |
|---|---|---|
| Business insights / at-risk intervention / alerts | `aiBusinessInsights` | `AtRiskClients.jsx:44`, `RiskClientCard.jsx:70`, `BIAIInsights.jsx:34`, `ClientAlerts.jsx:15` |
| Check-in AI review / program suggestions | `aiCheckInInsights` | `CheckInReviewDrawer.jsx:52`, `CheckInEnhancedDrawer.jsx:52`, `AIProgramSuggestions.jsx:59` |
| Progress analysis / summaries | `aiProgressInsights` | `AICheckInSummaryCard.jsx:26`, `AIProgressAnalyzer.jsx:244`, `ClientAnalyticsView.jsx:67` |
| Nutrition insights / client Q&A | `aiNutritionInsights` | `MealPlanViewer.jsx:26`, `portal/WeeklySnapshot.jsx:37`, `portal/nutrition/AIAssistant.jsx:27` |
| InBody scan vision extraction | `aiInBodyScan` | `InBodyScanner.jsx:325` |

## AI context layers (vs. the ideal 6-layer model)

| Layer | Present? | Notes |
|---|---|---|
| L1 Global system rules | Partial | per-function inline prompt text; no shared safety schema |
| L2 Coach context | Minimal | only `generateAIProgram` reads the coach's exercise library; coaching style/tone assembled **browser-side** for message drafting |
| L3 Client long-term (goals/injuries/allergies/equipment) | Passed as request-body text; **never verified server-side** |
| L4 Client behavioral (adherence, logs, trend) | Partial; computed **in the browser** and passed in body |
| L5 Recent interaction (msgs, last check-in) | Partial; browser-assembled |
| L6 Current task | Yes |

Systemic issue: context is assembled in the browser and passed unverified to functions that trust it. Any authenticated principal (including a portal client) can shape the "client profile" a generation runs against.

## RAG classification: **NOT IMPLEMENTED**

- Repo-wide search for `pgvector|embedding|vector|similarity|semantic|chunk|retrieval|cosine|<->` returns only false positives (prose, CSS token names, `MediaRecorder` audio "chunks").
- Live DB: `vector` extension **not installed**. No embedding column, no `match_*` RPC.
- Closest thing: `generateAIProgram/index.ts:24-28` flat-selects the exercise library and pastes the first 100 names into the prompt — unranked, unfiltered by goal/equipment/injury. This is **direct-DB-context-only**, not retrieval.

## AI safety validation: **prompt-only, not code-enforced**

| Adversarial case | Result |
|---|---|
| Peanut/shellfish allergy → meal plan | **FAIL.** `generateMealPlan` interpolates allergies as prose only; `generateSmartMeals` (the main, DB-persisting generator) has **no allergy field at all**. No post-generation allergen scan anywhere. |
| Shoulder injury → program with overhead press | **FAIL.** Single prompt sentence ("NEVER include those movements"); no code check that returned exercises exclude the avoid-list. |
| 900 kcal/day plan | **PARTIAL.** Input floor `{male:1500, female:1200}` exists only in `AIGeneratorModal.jsx:224`; the onboarding path `estimateCalories()` (`AIOnboardingModal.jsx:255`) has no floor; no output floor. |
| Medical condition kept coach-facing | **FAIL by design of `isClientFacing`** — a request-body boolean selects the coach vs client prompt; a portal client can request the coach-internal churn analysis. |

Deterministic validators do not exist for any safety-critical constraint. **P0/P1.**

## Risk detection (`riskEngine`) reality

Deterministic (9 hand-coded flags + 19-word keyword sentiment), runs in the **browser on every render**, output **never persists**. The only writer of `clients.lifecycle_status='at_risk'` is the LLM tool `flag_client_at_risk`. Three divergent risk formulas coexist (`riskEngine.js` 0–100, `_shared/riskScoring.js`, `insightEngine.js` `coachingPriorityScore` 0–10).

## Findings (severity-ranked)

**P0**
1. 5 AI-insight functions undeployed → all AI insight surfaces 404 (verified live).
2. `generateSmartMeals` has no allergen input and persists plans — allergy-unsafe meal plans can be saved and assigned.
3. Injury/contraindication safety is one prompt sentence with no output verification.
4. No deterministic safety validators anywhere (allergen/injury/calorie-floor/unsafe-output rejection).
5. Denial-of-wallet: 8 of 11 functions unmetered, no rate limit; `claudeAssistant` issues ≤6 Claude calls/request; `aiBusinessInsights` `JSON.stringify`s an unbounded browser-supplied array into the prompt.

**P1**
6. No output-shape validation on 9/11 functions; `zod` unused server-side (regression from Base44 JSON schemas).
7. `isClientFacing` client-facing gate is a caller-supplied boolean → portal clients can pull coach-internal analysis.
8. `aiInBodyScan` writes vision-extracted numbers to two tables with no range validation; input image is a public Storage URL.
9. No timeouts/retries/cost telemetry on any LLM call.
10. `nutritionQA` interpolates raw portal-client free text into the prompt (only direct end-client→LLM surface, least guarded).

**P2**
11. `mapImportColumns` pins likely-invalid model id `claude-haiku-4-5-20251001` and fails silently to deterministic-only.
12. `generateExerciseLibrary` unreachable, unmetered, inserts 50 hallucination-prone rows via service role.
13. `AIProgramSuggestions` "Apply" is a no-op (no `onApply` prop wired).
14. `generateMealPlan` appends a fixed 8-supplement protocol to every plan regardless of client.

**P3**
15. Dead AI layer `base44/functions/*` still in-tree (incl. the only Anthropic-SDK function, `analyzeProgress`, `claude-opus-4-5`, orphaned).
16. "AI" branding on deterministic features (AIInsightsFeed/Page, NeedsAttentionWidget, At-Risk pages).
17. Insight dismissals are localStorage-only.
18. `ai_generation_count`/`ai_generation_month` are outside the privileged-column trigger allowlist → a user can reset their own AI quota.

## Recommendations (in order)
1. Deploy the 5 missing functions (or feature-flag their callers off) — nothing "AI insights" works until then.
2. Add a **deterministic allergen scanner** and **injury/exercise contraindication check** that run on AI output before persist; add an allergy/diet field to `generateSmartMeals`. Do not rely on prompts for health-safety.
3. Meter and rate-limit every AI function; add an `AbortController` timeout, one retry, and capture `usage` into a spend table.
4. Reintroduce `zod` output schemas server-side; reject on parse failure.
5. Make `isClientFacing` server-derived from the caller's role, not the request body.
