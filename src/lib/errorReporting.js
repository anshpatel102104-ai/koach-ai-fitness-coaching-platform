/**
 * Frontend error monitoring.
 *
 * Captures render crashes (ErrorBoundary), uncaught errors, unhandled promise
 * rejections, failed lazy-chunk loads and failed edge-function calls, and sends
 * each to public.client_error_events (migration 20261006200200) with route,
 * release, browser and request id. Admins read them; users can only insert
 * their own. Signed-out errors are logged to the console only.
 *
 * Volume control: identical errors are reported once per page load, at most
 * MAX_PER_SESSION reports per page load, and the table caps per-user volume.
 * Never include form contents, tokens or message bodies in reports.
 */
import { RELEASE } from './release.js';

const MAX_PER_SESSION = 25;
let sink = null;
let sent = 0;
const seen = new Set();

/** The data layer registers how reports are stored (avoids an import cycle). */
export function setErrorSink(fn) {
  sink = fn;
}

function clip(s, n) {
  const str = s == null ? '' : String(s);
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

/**
 * Report an error. `context.source` is one of: render, window, promise, chunk,
 * edge_function, query, mutation, manual.
 */
export function reportError(err, context = {}) {
  try {
    const message = clip(err?.technical || err?.message || err, 500);
    const key = `${context.source}|${context.fn || ''}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);

    const report = {
      source: context.source || 'manual',
      error_type: err?.errorType || (context.source === 'chunk' ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'),
      message,
      stack: clip(err?.stack, 2000) || null,
      component_stack: clip(context.componentStack, 2000) || null,
      fn: context.fn || null,
      request_id: err?.requestId || null,
      http_status: typeof err?.status === 'number' ? err.status : null,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      release: RELEASE.commit,
      environment: RELEASE.environment,
      user_agent: typeof navigator !== 'undefined' ? clip(navigator.userAgent, 300) : null,
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
    };

    if (import.meta.env?.DEV) console.error('[koach:error]', report, err);
    if (!sink || sent >= MAX_PER_SESSION) return;
    sent += 1;
    Promise.resolve(sink(report)).catch(() => { /* reporting must never throw */ });
  } catch {
    /* never let reporting break the app */
  }
}

const CHUNK_RE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;

export function isChunkLoadError(err) {
  return CHUNK_RE.test(String(err?.message ?? err ?? ''));
}

/** Install global handlers once (main.jsx). */
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined' || window.__koachErrorsInstalled) return;
  window.__koachErrorsInstalled = true;
  window.addEventListener('error', (e) => {
    // Resource load errors (img/script) have no `error`; ignore those.
    if (!e.error) return;
    reportError(e.error, { source: isChunkLoadError(e.error) ? 'chunk' : 'window' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    // Already reported where it was created (facade), or an expected cancellation.
    if (reason?.name === 'AbortError' || reason?.name === 'CancelledError') return;
    reportError(reason instanceof Error ? reason : new Error(String(reason)), {
      source: isChunkLoadError(reason) ? 'chunk' : 'promise',
    });
  });
}
