/**
 * Writes to public.ai_usage_events (migration 20261006200000_ai_usage_ledger.sql).
 *
 * Dependency-free (Node verification scripts import the AI helpers): the
 * service client comes from the request context, where guardAiUse puts it.
 * Ledger writes never fail the user's request — a write error is logged and
 * swallowed — but they are awaited so the row exists before the response.
 */
import { currentRequest } from './requestContext.js';

// USD per million tokens. Source: Anthropic pricing (Claude API reference,
// cached 2026-09-25). Cache writes are billed at 1.25x input (5-minute TTL).
// Unknown models get no estimate rather than a wrong one.
const PRICING = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
};

function priceFor(model) {
  if (!model) return null;
  const key = Object.keys(PRICING).find((k) => model === k || model.startsWith(`${k}-`));
  return key ? PRICING[key] : null;
}

/** Estimated USD cost of one call, or null when the model or usage is unknown. */
export function estimateCostUsd(model, usage) {
  const p = priceFor(model);
  if (!p || !usage) return null;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const usd = (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheWrite * p.input * 1.25) / 1e6;
  return Math.round(usd * 1e6) / 1e6;
}

async function insert(svc, row) {
  try {
    const { error } = await svc.from('ai_usage_events').insert(row);
    if (error) console.error(JSON.stringify({ level: 'error', event: 'ai_ledger_write_failed', request_id: row.request_id, message: error.message }));
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', event: 'ai_ledger_write_failed', request_id: row.request_id, message: String(e?.message ?? e) }));
  }
}

/**
 * Called by guardAiUse once the payer is known. Stores what later ledger rows
 * need on the request context. No-op outside a serve() request.
 */
export function bindAiRequest({ svc, feature, userId, payerId }) {
  const ctx = currentRequest();
  if (!ctx) return null;
  ctx.ai = { svc, feature, userId, payerId, charged: false, calls: 0 };
  return ctx;
}

/** A request the plan/billing gate refused (no credit used). */
export async function recordBlocked({ svc, feature, userId, payerId, errorType, httpStatus }) {
  const ctx = currentRequest();
  if (!ctx || !svc) return;
  await insert(svc, {
    request_id: ctx.requestId, kind: 'blocked', feature, user_id: userId ?? null, payer_id: payerId ?? null,
    status: 'blocked', error_type: errorType, credits: 0, http_status: httpStatus ?? null,
  });
}

/** One Anthropic call (success or failure). `call` is invokeClaude's telemetry. */
export async function recordLlmCall(call) {
  const ctx = currentRequest();
  const ai = ctx?.ai;
  const usage = call.usage ?? null;
  const row = {
    request_id: ctx?.requestId ?? 'none',
    kind: 'llm_call',
    feature: ai?.feature ?? ctx?.fnName ?? 'unknown',
    user_id: ai?.userId ?? null,
    payer_id: ai?.payerId ?? null,
    status: call.ok ? 'ok' : 'error',
    error_type: call.ok ? null : call.errorType ?? 'UNKNOWN_ERROR',
    credits: 0,
    provider: 'anthropic',
    model: call.model ?? null,
    input_tokens: usage?.input_tokens ?? null,
    output_tokens: usage?.output_tokens ?? null,
    cache_read_tokens: usage?.cache_read_input_tokens ?? null,
    cache_write_tokens: usage?.cache_creation_input_tokens ?? null,
    latency_ms: call.latencyMs ?? null,
    attempts: call.attempts ?? null,
    stop_reason: call.stopReason ?? null,
    http_status: call.httpStatus ?? null,
    provider_request_id: call.providerRequestId ?? null,
    estimated_cost_usd: estimateCostUsd(call.model, usage),
  };
  // Always leave a searchable log line, even when there is no DB client.
  const log = {
    level: call.ok ? 'info' : 'error', event: 'llm_call', fn: ctx?.fnName, request_id: row.request_id,
    feature: row.feature, model: row.model, status: row.status, error_type: row.error_type,
    input_tokens: row.input_tokens, output_tokens: row.output_tokens, latency_ms: row.latency_ms,
    attempts: row.attempts, cost_usd: row.estimated_cost_usd,
  };
  (call.ok ? console.log : console.error)(JSON.stringify(log));
  if (ai) ai.calls += 1;
  if (ai?.svc) await insert(ai.svc, row);
}

/**
 * Give back the credit of the current request if it was charged (serve() calls
 * this when the response is a failure). Safe to call more than once.
 */
export async function refundCurrentRequest(errorType) {
  const ctx = currentRequest();
  const ai = ctx?.ai;
  if (!ai?.charged || ai.refunded || !ai.svc) return false;
  ai.refunded = true;
  try {
    const { data, error } = await ai.svc.rpc('refund_ai_generation', {
      p_request_id: ctx.requestId, p_error_type: errorType ?? 'UNKNOWN_ERROR',
    });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', event: 'ai_refund_failed', request_id: ctx.requestId, message: String(e?.message ?? e) }));
    return false;
  }
}
