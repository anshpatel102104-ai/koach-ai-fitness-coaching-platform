// deno test --config supabase/functions/deno.json --allow-env --allow-net supabase/functions/_shared/aiLedger_test.js
//
// End-to-end through the real serve() wrapper, guardAiUse and invokeClaude,
// with a fake service client (records inserts/RPCs) and a stubbed Anthropic fetch.
import { assertEquals, assert } from 'jsr:@std/assert@1';
import { serve } from './observe.js';
import { guardAiUse } from './aiMetering.js';
import { invokeClaude } from './anthropic.js';
import { estimateCostUsd as estimateCostUsdForTest } from './aiLedger.js';

const PAYER = { id: '00000000-0000-0000-0000-0000000000a1', subscription_tier: 'pro', billing_status: 'active' };

function fakeSvc() {
  const log = { inserts: [], rpcs: [] };
  const chain = (table) => {
    const q = {
      select: () => q, eq: () => q, limit: () => q, in: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (res) => res({ data: [], error: null }),
      insert: async (row) => { log.inserts.push({ table, row }); return { error: null }; },
    };
    return q;
  };
  return {
    log,
    from: (t) => chain(t),
    rpc: async (name, args) => {
      log.rpcs.push({ name, args });
      if (name === 'charge_ai_generation') return { data: [{ allowed: true, used: 1, duplicate: false }], error: null };
      if (name === 'refund_ai_generation') return { data: true, error: null };
      return { data: null, error: null };
    },
  };
}

function capture(name, handler) {
  let registered;
  const orig = Deno.serve;
  // @ts-ignore test stub
  Deno.serve = (h) => { registered = h; };
  try { serve(name, handler); } finally { Deno.serve = orig; }
  return registered;
}

function stubAnthropic(responder) {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => responder();
  Deno.env.set('ANTHROPIC_API_KEY', 'test-key');
  return () => { globalThis.fetch = orig; };
}

const quiet = () => { const o = { log: console.log, error: console.error, warn: console.warn }; console.log = console.error = console.warn = () => {}; return () => Object.assign(console, o); };

Deno.test('counted request: provider failure is recorded and the credit is refunded', async () => {
  const svc = fakeSvc();
  const restore = stubAnthropic(() => new Response('overloaded', { status: 529 }));
  const unquiet = quiet();
  try {
    const h = capture('generateAIProgram', async () => {
      const blocked = await guardAiUse(svc, { auth: { id: PAYER.id }, profile: PAYER }, 'generateAIProgram');
      assertEquals(blocked, null);
      const r = await invokeClaude({ prompt: 'x', maxTokens: 100 });
      return new Response(JSON.stringify({ error: r.error }), { status: r.status });
    });
    const res = await h(new Request('http://x', { headers: { 'x-request-id': 'req_test_fail1' } }));
    assertEquals(res.status, 529);
  } finally { restore(); unquiet(); }

  const charge = svc.log.rpcs.find((r) => r.name === 'charge_ai_generation');
  assertEquals(charge.args.p_request_id, 'req_test_fail1');
  assertEquals(charge.args.p_feature, 'generateAIProgram');
  const call = svc.log.inserts.find((i) => i.row.kind === 'llm_call');
  assertEquals(call.row.status, 'error');
  assertEquals(call.row.error_type, 'AI_PROVIDER_ERROR');
  assertEquals(call.row.attempts, 2); // one retry on 5xx
  assertEquals(call.row.request_id, 'req_test_fail1');
  assertEquals(call.row.payer_id, PAYER.id);
  const refund = svc.log.rpcs.find((r) => r.name === 'refund_ai_generation');
  assert(refund, 'credit refunded');
  assertEquals(refund.args.p_request_id, 'req_test_fail1');
});

Deno.test('counted request: success records tokens + cost and keeps the credit', async () => {
  const svc = fakeSvc();
  const restore = stubAnthropic(() => new Response(JSON.stringify({
    model: 'claude-sonnet-5-5', stop_reason: 'end_turn',
    usage: { input_tokens: 1000, output_tokens: 500 },
    content: [{ type: 'text', text: 'hello' }],
  }), { status: 200, headers: { 'request-id': 'req_anthropic_123' } }));
  const unquiet = quiet();
  try {
    const h = capture('generateMealPlan', async () => {
      await guardAiUse(svc, { auth: { id: PAYER.id }, profile: PAYER }, 'generateMealPlan');
      const r = await invokeClaude({ prompt: 'x', maxTokens: 100 });
      return new Response(JSON.stringify({ ok: r.ok }), { status: 200 });
    });
    const res = await h(new Request('http://x'));
    assertEquals(res.status, 200);
  } finally { restore(); unquiet(); }

  const call = svc.log.inserts.find((i) => i.row.kind === 'llm_call').row;
  assertEquals(call.status, 'ok');
  assertEquals(call.input_tokens, 1000);
  assertEquals(call.output_tokens, 500);
  assertEquals(call.provider_request_id, 'req_anthropic_123');
  assertEquals(call.estimated_cost_usd, 0.007); // 1000*$2/M + 500*$10/M
  assert(!svc.log.rpcs.some((r) => r.name === 'refund_ai_generation'), 'no refund on success');
});

Deno.test('plan refusal is recorded as blocked; no model call, no charge', async () => {
  const svc = fakeSvc();
  const unquiet = quiet();
  let blocked;
  try {
    const h = capture('claudeAssistant', async () => {
      blocked = await guardAiUse(svc, { auth: { id: PAYER.id }, profile: PAYER }, 'claudeAssistant'); // Elite+ feature, payer is Pro
      return new Response(JSON.stringify(blocked.body), { status: blocked.status });
    });
    await h(new Request('http://x'));
  } finally { unquiet(); }
  assertEquals(blocked.status, 403);
  const row = svc.log.inserts.find((i) => i.row.kind === 'blocked').row;
  assertEquals(row.feature, 'claudeAssistant');
  assertEquals(row.error_type, 'PERMISSION_ERROR');
  assert(!svc.log.rpcs.some((r) => r.name === 'charge_ai_generation'));
});

Deno.test('cost estimate: unknown model gives null, not a guess', () => {
  assertEquals(estimateCostUsdForTest('some-future-model', { input_tokens: 10, output_tokens: 10 }), null);
  assertEquals(estimateCostUsdForTest('claude-haiku-4-5', { input_tokens: 1e6, output_tokens: 0 }), 1);
});
