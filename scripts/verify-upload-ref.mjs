#!/usr/bin/env node
// Unit checks for _shared/uploadRef.js (aiInBodyScan fileUrl allow-list). No network/DB.
import assert from 'node:assert/strict';
import { parseUploadRef } from '../supabase/functions/_shared/uploadRef.js';

const SB = 'https://phjmcihgodvhbiaksvyl.supabase.co';
const U = '11111111-2222-3333-4444-555555555555';
const ok = (u) => { const r = parseUploadRef(u, SB); assert.equal(r.ok, true, u); return r; };
const bad = (u) => assert.equal(parseUploadRef(u, SB).ok, false, String(u));

assert.equal(ok(`storage://uploads/${U}/1-a-scan.png`).path, `${U}/1-a-scan.png`);
assert.equal(ok(`${SB}/storage/v1/object/sign/uploads/${U}/x.png?token=t`).ownerId, U);
assert.equal(ok(`${SB}/storage/v1/object/authenticated/uploads/${U}/x.png`).ownerId, U);

bad('https://evil.example.com/x.png');                                  // arbitrary host
bad('http://169.254.169.254/latest/meta-data');                         // SSRF
bad(`${SB}/storage/v1/object/public/branding/${U}/x.png`);              // other bucket
bad(`storage://branding/${U}/x.png`);                                   // other bucket ref
bad(`https://phjmcihgodvhbiaksvyl.supabase.co.evil.com/storage/v1/object/sign/uploads/${U}/x.png`);
bad(`https://user:pw@phjmcihgodvhbiaksvyl.supabase.co/storage/v1/object/sign/uploads/${U}/x.png`);
bad(`storage://uploads/${U}/../${U.replace('1', '2')}/x.png`);          // traversal
bad(`storage://uploads/${U}/%2e%2e/x.png`);
bad('storage://uploads/not-a-uuid/x.png');                              // folder must be a uid
bad(`storage://uploads/${U}`);                                          // no object name
bad(''); bad(null); bad({ a: 1 });
console.log('verify-upload-ref: all checks passed');

// normalizeModelId (anthropic.js) — the live ANTHROPIC_MODEL secret had a trailing '.'
globalThis.Deno = globalThis.Deno ?? { env: { get: () => undefined } };
const { normalizeModelId } = await import('../supabase/functions/_shared/anthropic.js');
assert.equal(normalizeModelId('claude-sonnet-5-5'), 'claude-sonnet-5-5');
assert.equal(normalizeModelId('claude-sonnet-5-5.'), 'claude-sonnet-5-5');
assert.equal(normalizeModelId('  "claude-sonnet-5-5"\n'), 'claude-sonnet-5-5');
assert.equal(normalizeModelId('claude‑sonnet‑5‑5'), 'claude-sonnet-5-5');
assert.equal(normalizeModelId('claude-sonnet-5-5​'), 'claude-sonnet-5-5');
assert.equal(normalizeModelId(undefined), '');
console.log('verify-upload-ref: model-id normalisation passed');
