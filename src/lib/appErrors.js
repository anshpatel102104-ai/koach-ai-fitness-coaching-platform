/**
 * One error shape for everything the data layer throws, so screens never show
 * raw database / PostgREST / edge-function text to coaches or clients.
 *
 *   err.message    — plain-language text safe to show in a toast
 *   err.errorType  — taxonomy (AUTH_ERROR, PERMISSION_ERROR, VALIDATION_ERROR,
 *                    DATABASE_ERROR, NETWORK_ERROR, AI_PROVIDER_ERROR, AI_TIMEOUT,
 *                    RATE_LIMIT, QUOTA_EXCEEDED, BILLING_ERROR, NOT_FOUND, UNKNOWN_ERROR)
 *   err.technical  — the original message (for logs / support only)
 *   err.requestId  — edge-function request id when there is one (matches the
 *                    server log line and the AI usage ledger row)
 *   err.code / err.status / err.details — passed through for callers that branch on them
 */

export class AppError extends Error {
  constructor(message, { errorType = 'UNKNOWN_ERROR', technical, requestId, code, status, details, cause } = {}) {
    super(message);
    this.name = 'AppError';
    this.errorType = errorType;
    this.technical = technical ?? message;
    this.requestId = requestId ?? null;
    this.code = code;
    this.status = status;
    this.details = details;
    if (cause) this.cause = cause;
  }
}

const NETWORK_RE = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i;

/** Map a Postgres / PostgREST / Supabase error object to an AppError. */
export function fromDbError(error) {
  const code = error?.code;
  const technical = error?.message || String(error);
  const base = { technical, code, details: error?.details };
  if (NETWORK_RE.test(technical)) {
    return new AppError("We couldn't reach the server. Check your connection and try again.", { ...base, errorType: 'NETWORK_ERROR' });
  }
  if (code === 'PGRST301' || code === 'PGRST303' || /jwt expired|invalid jwt|not authenticated/i.test(technical)) {
    return new AppError('Your session has expired. Please sign in again.', { ...base, errorType: 'AUTH_ERROR' });
  }
  if (code === '42501' || /row-level security|permission denied|not allowed|only assign your own/i.test(technical)) {
    // Our own trigger messages are already written for people; keep those.
    const friendly = /you can only|can only be changed|not allowed to/i.test(technical)
      ? technical.charAt(0).toUpperCase() + technical.slice(1)
      : "You don't have permission to do that.";
    return new AppError(friendly, { ...base, errorType: 'PERMISSION_ERROR' });
  }
  if (code === '23505') return new AppError('That already exists.', { ...base, errorType: 'VALIDATION_ERROR' });
  if (code === '23503') {
    return /still referenced/i.test(technical)
      ? new AppError("This can't be deleted because other records depend on it (for example invoices or payments).", { ...base, errorType: 'VALIDATION_ERROR' })
      : new AppError('This is linked to a record that no longer exists. Refresh and try again.', { ...base, errorType: 'VALIDATION_ERROR' });
  }
  if (code === '23502' || code === '23514' || code === '22P02' || code === '22007' || code === '22003') {
    return new AppError('Some of the information is missing or not in the right format.', { ...base, errorType: 'VALIDATION_ERROR' });
  }
  if (code === 'P0001') {
    // RAISE EXCEPTION from our own triggers (e.g. the client cap) — written for people.
    return new AppError(technical, { ...base, errorType: /limit|cap/i.test(technical) ? 'QUOTA_EXCEEDED' : 'VALIDATION_ERROR' });
  }
  return new AppError('Something went wrong saving your changes. Please try again.', { ...base, errorType: 'DATABASE_ERROR' });
}

/** Map an edge-function failure (HTTP status + parsed JSON body) to an AppError. */
export function fromFunctionError({ name, status, body, requestId, technical }) {
  const serverMsg = typeof body?.message === 'string' ? body.message : null;
  const serverErr = typeof body?.error === 'string' ? body.error : null;
  const base = { status, requestId: body?.request_id || requestId, technical: technical || serverErr || serverMsg || `${name} failed (${status})` };
  if (status === 0 || status == null) {
    return new AppError("We couldn't reach the server. Check your connection and try again.", { ...base, errorType: 'NETWORK_ERROR' });
  }
  if (status === 401) return new AppError('Your session has expired. Please sign in again.', { ...base, errorType: 'AUTH_ERROR' });
  if (status === 402) return new AppError(serverMsg || 'This needs an active subscription.', { ...base, errorType: 'BILLING_ERROR' });
  if (status === 403) return new AppError(serverMsg || "You don't have permission to do that.", { ...base, errorType: 'PERMISSION_ERROR' });
  if (status === 404) return new AppError('That feature is not available right now.', { ...base, errorType: 'NOT_FOUND' });
  if (status === 409) return new AppError(serverMsg || serverErr || 'This request is already being processed.', { ...base, errorType: 'VALIDATION_ERROR' });
  if (status === 429) return new AppError('Too many requests right now. Wait a moment and try again.', { ...base, errorType: 'RATE_LIMIT' });
  if (status === 504) return new AppError('This took too long and was stopped. Please try again.', { ...base, errorType: 'AI_TIMEOUT' });
  if (status >= 500) return new AppError('Something went wrong on our side. Please try again.', { ...base, errorType: 'UNKNOWN_ERROR' });
  // 400/422: the server's message is meant for the user (validation, safety checks).
  return new AppError(serverMsg || serverErr || 'Please check the details and try again.', { ...base, errorType: 'VALIDATION_ERROR' });
}

/** Text to show for any thrown value. */
export function userMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (err instanceof AppError) return err.message;
  const msg = String(err?.message ?? err);
  if (NETWORK_RE.test(msg)) return "We couldn't reach the server. Check your connection and try again.";
  // Plain short sentences from our own code are fine; long technical strings are not.
  if (msg.length > 0 && msg.length <= 140 && !/[{}<>]|\bat\s+\w+\.|supabase|postgrest|pgrst|jwt|uuid|syntax|relation|column/i.test(msg)) return msg;
  return fallback;
}

/** "… (ref req_abc123)" suffix for support conversations. */
export function withReference(message, err) {
  const ref = err?.requestId;
  return ref ? `${message} (ref ${ref})` : message;
}

export function newRequestId() {
  const bytes = new Uint8Array(9);
  (globalThis.crypto ?? window.crypto).getRandomValues(bytes);
  return 'req_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
