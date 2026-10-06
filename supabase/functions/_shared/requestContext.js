/**
 * Per-request context for edge functions, without threading a parameter
 * through every helper. serve() (observe.js) runs each handler inside
 * runWithRequest(ctx, …); shared helpers such as guardAiUse (aiMetering.js) and
 * invokeClaude (anthropic.js) read it with currentRequest() to tag ledger rows
 * with the request id, caller and payer.
 *
 * Dependency-free on purpose: the Node verification scripts import the AI
 * helpers directly. If AsyncLocalStorage is unavailable the helpers simply see
 * no context (ledger rows are skipped, nothing else changes).
 */
let als = null;
try {
  const { AsyncLocalStorage } = await import('node:async_hooks');
  als = new AsyncLocalStorage();
} catch {
  als = null;
}

/** Run fn with ctx as the current request context. */
export function runWithRequest(ctx, fn) {
  return als ? als.run(ctx, fn) : fn();
}

/** The current request context ({ fnName, requestId, ai? }) or null. */
export function currentRequest() {
  return als?.getStore() ?? null;
}
