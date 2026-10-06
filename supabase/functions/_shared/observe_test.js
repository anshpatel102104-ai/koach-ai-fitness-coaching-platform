// deno test --config supabase/functions/deno.json supabase/functions/_shared/observe_test.js
import { assertEquals, assert, assertMatch } from 'jsr:@std/assert@1';
import { serve, classifyError } from './observe.js';

// Capture the handler serve() registers instead of opening a socket.
function capture(name, handler) {
  let registered;
  const orig = Deno.serve;
  // @ts-ignore test stub
  Deno.serve = (h) => { registered = h; };
  try { serve(name, handler); } finally { Deno.serve = orig; }
  return registered;
}

function captureLogs(fn) {
  const lines = [];
  const orig = { error: console.error, warn: console.warn };
  console.error = (l) => lines.push(JSON.parse(l));
  console.warn = (l) => lines.push(JSON.parse(l));
  return Promise.resolve(fn()).then((r) => { Object.assign(console, orig); return [r, lines]; },
    (e) => { Object.assign(console, orig); throw e; });
}

Deno.test('reuses a valid incoming x-request-id and exposes it', async () => {
  const h = capture('t', (_req, ctx) => new Response(JSON.stringify({ id: ctx.requestId })));
  const res = await h(new Request('http://x', { headers: { 'x-request-id': 'req_abc123' } }));
  assertEquals(res.headers.get('x-request-id'), 'req_abc123');
  assertEquals((await res.json()).id, 'req_abc123');
  assertEquals(res.headers.get('Access-Control-Expose-Headers'), 'x-request-id');
});

Deno.test('mints an id when the incoming one is missing or malformed', async () => {
  const h = capture('t', () => new Response('ok'));
  const res = await h(new Request('http://x', { headers: { 'x-request-id': 'bad id; drop table' } }));
  assertMatch(res.headers.get('x-request-id'), /^req_[0-9a-f]{18}$/);
});

Deno.test('adds x-request-id to an existing CORS allow-headers list (preflight)', async () => {
  const h = capture('t', () => new Response('ok', {
    headers: { 'Access-Control-Allow-Headers': 'authorization, content-type' },
  }));
  const res = await h(new Request('http://x', { method: 'OPTIONS' }));
  assertEquals(res.headers.get('Access-Control-Allow-Headers'), 'authorization, content-type, x-request-id');
});

Deno.test('unhandled throw -> generic 500 with request id, one structured error log', async () => {
  const h = capture('boom', () => { throw new Error('secret internals'); });
  const [res, logs] = await captureLogs(() => h(new Request('http://x')));
  assertEquals(res.status, 500);
  const body = await res.json();
  assert(!JSON.stringify(body).includes('secret internals'));
  assertEquals(body.request_id, res.headers.get('x-request-id'));
  assertEquals(logs.length, 1);
  assertEquals(logs[0].fn, 'boom');
  assertEquals(logs[0].unhandled, true);
  assertEquals(logs[0].request_id, body.request_id);
});

Deno.test('a handled 5xx response is logged; 4xx is not', async () => {
  const h500 = capture('w', () => new Response(JSON.stringify({ error: 'processing failed' }), { status: 500 }));
  const [r1, l1] = await captureLogs(() => h500(new Request('http://x')));
  assertEquals(r1.status, 500);
  assertEquals((await r1.json()).error, 'processing failed'); // body still readable after the log clone
  assertEquals(l1.length, 1);
  assertEquals(l1[0].status, 500);

  const h400 = capture('w', () => new Response('bad', { status: 400 }));
  const [, l2] = await captureLogs(() => h400(new Request('http://x')));
  assertEquals(l2.length, 0);
});

Deno.test('redirects keep their status and Location', async () => {
  const h = capture('cb', () => Response.redirect('https://app.koachai.net/settings', 302));
  const res = await h(new Request('http://x'));
  assertEquals(res.status, 302);
  assertEquals(res.headers.get('location'), 'https://app.koachai.net/settings');
});

Deno.test('classifyError taxonomy', () => {
  assertEquals(classifyError({ errorType: 'QUOTA_EXCEEDED' }), 'QUOTA_EXCEEDED');
  assertEquals(classifyError({ code: '23505', message: 'dup' }), 'DATABASE_ERROR');
  assertEquals(classifyError({ code: '42501', message: 'rls' }), 'PERMISSION_ERROR');
  assertEquals(classifyError({ type: 'StripeCardError', message: 'declined' }), 'BILLING_ERROR');
  assertEquals(classifyError({ message: 'Claude API timed out' }), 'AI_TIMEOUT');
  assertEquals(classifyError({ message: 'STRIPE_WEBHOOK_SECRET is not configured' }), 'CONFIG_ERROR');
  assertEquals(classifyError({}, 429), 'RATE_LIMIT');
  assertEquals(classifyError(new Error('???')), 'UNKNOWN_ERROR');
});
