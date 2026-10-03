#!/usr/bin/env node
// Offline checks for the structured-output plumbing (no network): the tolerant
// tool-argument parser and the tool schemas. The first cases are the exact
// failure modes seen live from claude-sonnet-5-5: a nested object returned as
// a JSON *string* that is missing its final closing brace.
import assert from 'node:assert/strict';
globalThis.Deno = globalThis.Deno ?? { env: { get: () => undefined } };
const { parseLenientJson, coerceBySchema } = await import('../supabase/functions/_shared/anthropic.js');
const tools = await import('../supabase/functions/_shared/aiTools.js');

// valid JSON passes through untouched
assert.deepEqual(parseLenientJson('{"a":[1,2]}'), { a: [1, 2] });
// raw control chars inside strings, trailing commas
assert.deepEqual(parseLenientJson('{"a":"x\ny\tz","b":[1,2,],}'), { a: 'x\ny\tz', b: [1, 2] });
assert.deepEqual(parseLenientJson('{"a":"keep, } inside"}'), { a: 'keep, } inside' });
// missing closing brackets / unterminated string (live failure)
const missing = '{"meals":[{"id":"meal_1","calories":390,"foods":[{"name":"x","calories":390,"protein":8.1,"carbs":84,"fats":0.9}]}]';
assert.equal(parseLenientJson(missing).meals[0].foods[0].fats, 0.9);
assert.deepEqual(parseLenientJson('{"a":[1,2,{"b":3}'), { a: [1, 2, { b: 3 }] });
assert.deepEqual(parseLenientJson('{"a":"unterminated'), { a: 'unterminated' });
assert.throws(() => parseLenientJson('{"a":')); // genuinely unrecoverable

const num = { type: 'number' };
const sch = { type: 'object', properties: { training_day: { type: 'object', properties: { meals: { type: 'array', items: { type: 'object', properties: { calories: num, foods: { type: 'array', items: { type: 'object', properties: { amount: num } } } } } } } }, shopping_list: { type: 'array', items: { type: 'string' } } } };
const notes = [];
const out = coerceBySchema({ training_day: missing.replace('"calories":390,"foods"', '"calories":"390","foods"'), shopping_list: '["a","b"]' }, sch, '', notes);
assert.equal(notes.length, 0);
assert.equal(out.training_day.meals[0].calories, 390);
assert.deepEqual(out.shopping_list, ['a', 'b']);
const bad = [];
coerceBySchema({ training_day: '{"meals":[{"calories":' }, sch, '', bad);
assert.equal(bad.length, 1); // reported, not thrown

// every exported tool is a well-formed schema
for (const [k, t] of Object.entries(tools)) {
  if (k === 'TOOL_SYSTEM') continue;
  assert.ok(t.name && t.description && t.input_schema, k);
  assert.equal(t.input_schema.type, 'object', k);
  for (const r of t.input_schema.required ?? []) assert.ok(r in t.input_schema.properties, `${k}.${r}`);
}
console.log('verify-ai-structured: all checks passed');
