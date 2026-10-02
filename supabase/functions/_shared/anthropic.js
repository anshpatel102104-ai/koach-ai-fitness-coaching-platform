/**
 * Shared Anthropic client (Step 5d) — replaces Base44's
 * `integrations.Core.InvokeLLM` for the AI functions. One place owns the API
 * envelope, model default, and the JSON-extraction behavior InvokeLLM provided
 * (Base44 functions relied on "return ONLY JSON" prompts + parsing).
 *
 * Env: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (optional override of the
 * default model for every call that doesn't pin one).
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
// Default to the latest generally available Sonnet; callers may pin another.
const DEFAULT_MODEL = 'claude-sonnet-5';

export function anthropicConfigured() {
  return Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
}

export function anthropicModel() {
  return Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL;
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
 * One messages-API call. Returns:
 *   { ok: true, text, parsed }   — parsed only meaningful when expectJson
 *   { ok: false, error, status } — API/config errors (never throws)
 */
export async function invokeClaude({ prompt, system, model, maxTokens = 4096, expectJson = false, imageUrls }) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not configured', status: 500 };

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
    messages: [{ role: 'user', content }],
  });

  // One request with a hard timeout (a hung connection otherwise holds the edge
  // function until the platform kills it). Retry ONCE on a network error or a
  // transient 429/5xx.
  const TIMEOUT_MS = 60_000;
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
    try {
      response = await doFetch();
    } catch (e) {
      if (attempt === 0) continue; // network error / timeout → retry once
      const reason = e?.name === 'AbortError' ? 'timed out' : `unreachable: ${e.message}`;
      return { ok: false, error: `Claude API ${reason}`, status: 504 };
    }
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      continue; // transient → retry once
    }
    break;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { ok: false, error: `Claude API error: ${errText.slice(0, 500)}`, status: response.status };
  }

  const data = await response.json().catch(() => null);
  const text = data?.content?.[0]?.text ?? '';
  const parsed = expectJson ? extractJson(text) : null;
  if (expectJson && parsed === null) {
    return { ok: false, error: 'Model response was not parseable JSON', status: 502, text };
  }
  return { ok: true, text, parsed };
}
