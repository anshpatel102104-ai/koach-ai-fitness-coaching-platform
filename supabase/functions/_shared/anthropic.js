/**
 * Shared Anthropic client (Step 5d) — replaces Base44's
 * `integrations.Core.InvokeLLM` for the AI functions. One place owns the API
 * envelope, model default, and the JSON-extraction behavior InvokeLLM provided
 * (Base44 functions relied on "return ONLY JSON" prompts + parsing).
 *
 * Env: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (optional override of the
 * default model for every call that doesn't pin one).
 */

import { recordLlmCall } from './aiLedger.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
// Default to the latest generally available Sonnet; callers may pin another.
const DEFAULT_MODEL = 'claude-sonnet-5-5';

export function anthropicConfigured() {
  return Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
}

/**
 * Normalise a model id read from the environment. A pasted secret routinely
 * carries stray whitespace, wrapping quotes, zero-width characters, a unicode
 * hyphen or trailing punctuation ("claude-sonnet-5-5." was live and made every
 * call 404). A model id never starts or ends with punctuation, so strip it.
 */
export function normalizeModelId(raw) {
  return String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[^A-Za-z0-9]+$/, '');
}

export function anthropicModel() {
  return normalizeModelId(Deno.env.get('ANTHROPIC_MODEL')) || DEFAULT_MODEL;
}

/**
 * Pull the first JSON object/array out of a model response — the same
 * tolerant parse the Base44 functions did by hand (raw JSON, or JSON inside
 * prose/markdown fences).
 */
export function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fall through */ }
  const match = text.match(/[{[][\s\S]*[}\]]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

/**
 * Tolerant JSON.parse for model-produced JSON strings: escapes raw control
 * characters inside string literals and drops trailing commas — the two ways a
 * model's hand-written JSON most often breaks. Throws if still invalid.
 */
export function parseLenientJson(str) {
  try { return JSON.parse(str); } catch { /* repair below */ }
  let out = '';
  let inStr = false;
  let esc = false;
  const closers = []; // expected closing brackets for everything still open
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      const code = ch.charCodeAt(0);
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (code < 0x20) out += '\\u' + code.toString(16).padStart(4, '0');
      else out += ch;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === '{') closers.push('}');
    else if (ch === '[') closers.push(']');
    else if ((ch === '}' || ch === ']') && closers[closers.length - 1] === ch) closers.pop();
    if (ch === ',') {
      let j = i + 1;
      while (j < str.length && /\s/.test(str[j])) j++;
      if (str[j] === '}' || str[j] === ']') continue; // trailing comma
    }
    out += ch;
  }
  // The model sometimes omits the final closing bracket(s) of a string-encoded value:
  // close any unterminated string and every bracket still open.
  if (inStr) out += '"';
  out = out.replace(/[\s,]+$/, '');
  while (closers.length) out += closers.pop();
  return JSON.parse(out);
}

/**
 * Models sometimes return a nested object/array tool argument as a JSON-encoded
 * STRING (or a number as a string). Walk the tool's input_schema and coerce
 * those back to the declared shape (leniently) so callers always receive
 * schema-shaped data. Anything that cannot be coerced is recorded in `notes`.
 */
export function coerceBySchema(value, schema, path = '', notes = []) {
  if (!schema || value === undefined || value === null) return value;
  if (typeof value === 'string' && (schema.type === 'object' || schema.type === 'array')) {
    try { value = parseLenientJson(value); } catch (e) {
      const m = /position (\d+)/.exec(e.message || '');
      const pos = m ? Number(m[1]) : null;
      notes.push({ path, error: String(e.message).slice(0, 160), length: value.length, around: pos === null ? null : value.slice(Math.max(0, pos - 60), pos + 60) });
      return value;
    }
  }
  if (schema.type === 'number' && typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
    for (const k of Object.keys(schema.properties)) {
      if (k in value) value[k] = coerceBySchema(value[k], schema.properties[k], path ? `${path}.${k}` : k, notes);
    }
  } else if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value = value.map((v, i) => coerceBySchema(v, schema.items, `${path}[${i}]`, notes));
  }
  return value;
}

/**
 * One messages-API call. Returns:
 *   { ok: true, text, parsed, stopReason, outputTokens }
 *   { ok: false, error, status, diagnostics? } — API/config/parse errors (never throws)
 *
 * Structured output: pass `tool: { name, description, input_schema }`. The model
 * returns the tool arguments as an already-parsed, schema-shaped object
 * (`parsed`) instead of free text. A response with no tool call is rejected.
 * A response cut off at max_tokens is REJECTED (a truncated tool input would
 * otherwise look valid but be incomplete).
 *
 * `diagnostics` on a failed parse/truncation: { stop_reason, output_tokens,
 * text_length, head, tail } (first/last 300 chars) — also console.error'd so
 * the edge logs carry it.
 */
/**
 * Every call is timed and recorded in the AI usage ledger (aiLedger.js): model,
 * tokens, latency, attempts, outcome and estimated cost. Results are unchanged
 * for callers; `errorType` is added on failures.
 */
export async function invokeClaude(args) {
  const started = Date.now();
  const tel = { model: normalizeModelId(args?.model) || anthropicModel(), attempts: 0, httpStatus: null, usage: null, providerRequestId: null };
  let result;
  try {
    result = await invokeClaudeOnce(args, tel);
  } catch (e) {
    result = { ok: false, error: `Claude call failed: ${e?.message ?? e}`, status: 500, errorType: 'UNKNOWN_ERROR' };
  }
  await recordLlmCall({
    ok: result.ok, errorType: result.errorType, model: tel.model, usage: tel.usage,
    latencyMs: Date.now() - started, attempts: tel.attempts, httpStatus: tel.httpStatus,
    stopReason: result.stopReason ?? result.diagnostics?.stop_reason ?? null, providerRequestId: tel.providerRequestId,
  });
  return result;
}

async function invokeClaudeOnce({ prompt, system, model, maxTokens = 4096, expectJson = false, imageUrls, tool, timeoutMs, thinking = { type: 'between_tools' } }, tel) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not configured', status: 500, errorType: 'CONFIG_ERROR' };

  // Vision: when imageUrls are supplied, the user message becomes a content
  // array of image blocks + the text prompt (the Base44 InvokeLLM `file_urls`
  // equivalent). Text-only calls keep the plain-string content unchanged.
  const content = (Array.isArray(imageUrls) && imageUrls.length)
    ? [...imageUrls.map((url) => ({ type: 'image', source: { type: 'url', url } })), { type: 'text', text: prompt }]
    : prompt;

  const payload = JSON.stringify({
    model: model || anthropicModel(),
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    // Thinking before responding is OFF by default. With the model's default
    // mode, claude-sonnet-5-5 spent the ENTIRE max_tokens budget (8192) on
    // thinking blocks and returned no text at all (stop_reason=max_tokens,
    // text_length=0), which surfaced as "not parseable JSON". For this model the
    // API's "off" setting is {type:'between_tools'} ({type:'disabled'} is rejected).
    ...(thinking ? { thinking } : {}),
    // claude-sonnet-5-5 rejects a forced tool_choice ("type tool/any not supported"), so the
    // single tool is offered with automatic selection; a response that does not call it is rejected below.
    ...(tool ? { tools: [tool] } : {}),
    messages: [{ role: 'user', content }],
  });

  // Non-streaming generation time scales with output size; cap under the edge
  // function's ~150s request limit. Callers may override.
  const TIMEOUT_MS = timeoutMs ?? Math.min(140_000, Math.max(60_000, maxTokens * 17));
  const doFetch = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'content-type': 'application/json',
        },
        body: payload,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    tel.attempts = attempt + 1;
    try {
      response = await doFetch();
    } catch (e) {
      // Retry once on a network error, but NOT after a timeout: a second full
      // wait would exceed the edge function's request limit.
      if (attempt === 0 && e?.name !== 'AbortError') continue;
      const reason = e?.name === 'AbortError' ? 'timed out' : `unreachable: ${e.message}`;
      return { ok: false, error: `Claude API ${reason}`, status: 504, errorType: e?.name === 'AbortError' ? 'AI_TIMEOUT' : 'NETWORK_ERROR' };
    }
    tel.httpStatus = response.status;
    tel.providerRequestId = response.headers?.get?.('request-id') ?? null;
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      continue; // transient → retry once
    }
    break;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const errorType = response.status === 429 ? 'RATE_LIMIT' : 'AI_PROVIDER_ERROR';
    return { ok: false, error: `Claude API error: ${errText.slice(0, 500)}`, status: response.status, errorType };
  }

  const data = await response.json().catch(() => null);
  tel.usage = data?.usage ?? null;
  if (data?.model) tel.model = data.model;
  const stopReason = data?.stop_reason ?? null;
  const outputTokens = data?.usage?.output_tokens ?? null;
  const toolBlock = tool ? data?.content?.find((b) => b?.type === 'tool_use') : null;
  const text = tool ? JSON.stringify(toolBlock?.input ?? null) : (data?.content?.find((b) => b?.type === 'text')?.text ?? data?.content?.[0]?.text ?? '');

  // Log-safe view: structure only, never model text (it can contain client health data).
  const logDiag = () => { const { head: _h, tail: _t, ...rest } = diagnostics(); return JSON.stringify(rest); };
  const diagnostics = () => ({
    stop_reason: stopReason, output_tokens: outputTokens, max_tokens: maxTokens,
    block_types: (data?.content ?? []).map((b) => b?.type),
    text_length: text.length, head: text.slice(0, 300), tail: text.slice(-300),
  });

  if (tool) {
    if (stopReason === 'max_tokens') {
      console.error('invokeClaude: output truncated at max_tokens', logDiag());
      return { ok: false, error: 'Model output was truncated (max_tokens)', status: 502, errorType: 'AI_OUTPUT_INVALID', diagnostics: diagnostics() };
    }
    if (!toolBlock || typeof toolBlock.input !== 'object' || toolBlock.input === null) {
      console.error('invokeClaude: no tool_use block', logDiag());
      return { ok: false, error: 'Model did not return structured output', status: 502, errorType: 'AI_OUTPUT_INVALID', diagnostics: diagnostics() };
    }
    const notes = [];
    const coerced = coerceBySchema(toolBlock.input, tool.input_schema, '', notes);
    return { ok: true, text: JSON.stringify(coerced), parsed: coerced, stopReason, outputTokens, coerceNotes: notes };
  }

  const parsed = expectJson ? extractJson(text) : null;
  if (expectJson && parsed === null) {
    console.error('invokeClaude: unparseable JSON', logDiag());
    return { ok: false, error: 'Model response was not parseable JSON', status: 502, errorType: 'AI_OUTPUT_INVALID', text, diagnostics: diagnostics() };
  }
  return { ok: true, text, parsed, stopReason, outputTokens };
}
