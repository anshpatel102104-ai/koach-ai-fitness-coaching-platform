/**
 * Request tracing + structured logging for every edge function.
 *
 *   import { serve } from '../_shared/observe.js';
 *   serve('stripeWebhook', async (req, ctx) => { ... });   // instead of Deno.serve
 *
 * What the wrapper does, with no change to the handler's own logic:
 *   - request id: reuses the browser's `x-request-id` (sent by the facade in
 *     src/api/supabaseClient.js) or mints `req_<random>`; handlers get it as
 *     ctx.requestId and it is echoed in the `x-request-id` response header, so
 *     one id links the browser error, this log line and any ai_usage_events row.
 *   - every 5xx response and every unhandled throw is logged as ONE JSON line
 *     ({ level, fn, request_id, status, error_type, message, duration_ms, ... })
 *     that can be filtered in Supabase → Logs → Edge Functions. Before this,
 *     several functions returned 500 without logging anything.
 *   - unhandled throws become a generic 500 (no stack or internals to the client).
 *   - slow requests (> SLOW_MS) are logged as warnings.
 *   - the handler runs inside the request context (requestContext.js), so AI
 *     helpers can write ledger rows; if an AI credit was charged and the
 *     response is a failure (>= 400, or a throw), the credit is refunded — the
 *     coach never pays for a generation they did not receive.
 *
 * Never log secrets, tokens, passwords, payment details or request bodies here.
 */
import { cors as defaultCors } from './edgeClients.js';
import { runWithRequest } from './requestContext.js';
import { refundCurrentRequest } from './aiLedger.js';

const SLOW_MS = 10_000;
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

export function newRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return 'req_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Error taxonomy shared by logs and the AI usage ledger. A thrown error can
 * set `err.errorType` explicitly; otherwise it is inferred from its shape.
 */
export const ERROR_TYPES = [
  'AUTH_ERROR', 'PERMISSION_ERROR', 'VALIDATION_ERROR', 'DATABASE_ERROR',
  'NETWORK_ERROR', 'AI_PROVIDER_ERROR', 'AI_TIMEOUT', 'AI_OUTPUT_INVALID',
  'RATE_LIMIT', 'QUOTA_EXCEEDED', 'BILLING_ERROR', 'WEBHOOK_ERROR', 'CONFIG_ERROR',
  'UNKNOWN_ERROR',
];

export function classifyError(err, status) {
  if (err?.errorType && ERROR_TYPES.includes(err.errorType)) return err.errorType;
  const msg = String(err?.message ?? err ?? '');
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || /timed? ?out/i.test(msg)) {
    return /anthropic|claude|model/i.test(msg) ? 'AI_TIMEOUT' : 'NETWORK_ERROR';
  }
  if (typeof err?.type === 'string' && err.type.startsWith('Stripe')) return 'BILLING_ERROR';
  if (/anthropic|claude/i.test(msg)) return 'AI_PROVIDER_ERROR';
  if (/not configured|is not set|required$|missing .*(key|secret)/i.test(msg)) return 'CONFIG_ERROR';
  // Postgres SQLSTATE (5 chars) or PostgREST codes.
  if (typeof err?.code === 'string' && (/^[0-9A-Z]{5}$/.test(err.code) || err.code.startsWith('PGRST'))) {
    return err.code === '42501' ? 'PERMISSION_ERROR' : 'DATABASE_ERROR';
  }
  if (err instanceof TypeError && /fetch|network|connect/i.test(msg)) return 'NETWORK_ERROR';
  if (status === 401) return 'AUTH_ERROR';
  if (status === 403) return 'PERMISSION_ERROR';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMIT';
  return 'UNKNOWN_ERROR';
}

/** One structured log line. `fields` must not contain secrets or PII bodies. */
export function logEvent(level, fields) {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Log a caught error that the handler is about to turn into a response. */
export function logError(ctx, err, extra = {}) {
  logEvent('error', {
    fn: ctx?.fnName,
    request_id: ctx?.requestId,
    error_type: classifyError(err, extra.status),
    message: String(err?.message ?? err).slice(0, 500),
    stack: err?.stack ? String(err.stack).split('\n').slice(0, 6).join('\n') : undefined,
    ...extra,
  });
}

function withTraceHeaders(res, requestId) {
  const headers = new Headers(res.headers);
  headers.set('x-request-id', requestId);
  headers.set('Access-Control-Expose-Headers', 'x-request-id');
  const allow = headers.get('Access-Control-Allow-Headers');
  if (allow && !/x-request-id/i.test(allow)) headers.set('Access-Control-Allow-Headers', `${allow}, x-request-id`);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/**
 * @param {string} fnName
 * @param {(req: Request, ctx: { fnName: string, requestId: string }) => Response | Promise<Response>} handler
 */
export function serve(fnName, handler) {
  Deno.serve(async (req) => {
    const started = Date.now();
    const incoming = req.headers.get('x-request-id');
    const requestId = incoming && REQUEST_ID_RE.test(incoming) ? incoming : newRequestId();
    const ctx = { fnName, requestId };
    return runWithRequest(ctx, () => handle(req, ctx, started));
  });

  async function handle(req, ctx, started) {
    const { requestId } = ctx;
    let res;
    try {
      res = await handler(req, ctx);
    } catch (err) {
      logError(ctx, err, { status: 500, duration_ms: Date.now() - started, unhandled: true });
      await refundCurrentRequest(classifyError(err, 500));
      res = new Response(
        JSON.stringify({ error: 'Something went wrong on our side. Please try again.', request_id: requestId }),
        { status: 500, headers: { ...defaultCors, 'Content-Type': 'application/json' } },
      );
      return withTraceHeaders(res, requestId);
    }

    const duration = Date.now() - started;
    if (res.status >= 400 && ctx.ai?.charged) {
      await refundCurrentRequest(res.status >= 500 ? 'AI_PROVIDER_ERROR' : classifyError(null, res.status));
    }
    if (res.status >= 500) {
      // The handler caught the error itself; record what it returned.
      // Only the `error` string of a JSON body: never the rest of the payload.
      let detail = '';
      try {
        const text = await res.clone().text();
        try { detail = String(JSON.parse(text)?.error ?? '').slice(0, 300); } catch { detail = text.slice(0, 120); }
      } catch { /* unreadable body */ }
      logEvent('error', {
        fn: fnName, request_id: requestId, status: res.status, duration_ms: duration,
        error_type: classifyError({ message: detail }, res.status), message: detail,
      });
    } else if (duration > SLOW_MS) {
      logEvent('warn', { fn: fnName, request_id: requestId, status: res.status, duration_ms: duration, event: 'slow_request' });
    }
    return withTraceHeaders(res, requestId);
  }
}
