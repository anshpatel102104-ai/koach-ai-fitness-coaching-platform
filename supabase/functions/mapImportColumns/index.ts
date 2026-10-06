// Supabase Edge Function: mapImportColumns  (Migration Step 5d)
//
// Re-platform of base44/functions/mapImportColumns — CSV header → KOACH field
// mapping for the client import wizard. The deterministic rule mapper and the
// AI-merge policy (AI may only fill nulls, never override a deterministic
// match) are extracted VERBATIM to _shared/importMapping.js; the best-effort
// AI enhancement pass uses the shared Anthropic client with the same
// fast/cheap model class Base44 pinned (haiku).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { guardAiUse } from '../_shared/aiMetering.js';
import { KOACH_FIELDS, deterministicMap, mergeResults } from '../_shared/importMapping.js';
import { invokeClaude, anthropicConfigured, normalizeModelId } from '../_shared/anthropic.js';
import { serve } from '../_shared/observe.js';

// Sanitized like ANTHROPIC_MODEL (a pasted secret with a trailing '.' made every call 404).
const HAIKU_MODEL = normalizeModelId(Deno.env.get('ANTHROPIC_FAST_MODEL')) || 'claude-haiku-4-5-20251001';

async function aiEnhanceMapping(allHeaders: string[], sample_rows: unknown[], deterministicResult: { mapping: Record<string, unknown> }) {
  // A CSV with hundreds of columns must not become an unbounded prompt.
  const headers = allHeaders.slice(0, 150).map((h) => String(h).slice(0, 120));
  if (!anthropicConfigured()) return null;

  const fieldsDescription = KOACH_FIELDS.map((f) => `"${f.key}" (${f.label}: ${f.description})`).join(', ');
  const sampleJson = JSON.stringify((sample_rows || []).slice(0, 3));
  const currentMapping = JSON.stringify(deterministicResult.mapping, null, 2);

  const prompt = `You are a data migration assistant for KOACH AI, a fitness coaching platform.

A coach is importing clients. Here are the CSV headers:
${JSON.stringify(headers)}

Sample rows (3 rows, as JSON objects keyed by header):
${sampleJson}

A deterministic mapper has already proposed this mapping (CSV column → KOACH field or null):
${currentMapping}

The available KOACH fields are: ${fieldsDescription}

Your job is to REVIEW and IMPROVE the mapping, but only change mappings where you are highly confident of a better answer. Key rules:
1. Do NOT change any mapping that is already set to a valid KOACH field — only fix null/unmapped entries.
2. For "__last_name__" mapped columns, keep them as "__last_name__" (they are handled specially).
3. For columns mapped to null, see if they should map to any KOACH field based on sample values.
4. Trainer/Coach columns should remain null (they are not client fields).
5. Never map two headers to the same KOACH field.

Respond ONLY with a JSON object:
{
  "mapping": { "<csv_header>": "<koach_field_or_null>" },
  "confidence": { "<csv_header>": "high" | "medium" | "low" | "unmapped" }
}

Include ALL ${headers.length} headers in both objects.`;

  const llm = await invokeClaude({ prompt, model: HAIKU_MODEL, maxTokens: 1024, expectJson: true, thinking: null });
  if (!llm.ok) return null;
  return llm.parsed;
}

serve('mapImportColumns', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const blocked = await guardAiUse(serviceClient(), caller, 'mapImportColumns');
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    const { headers, sample_rows } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      return jsonResponse({ error: 'headers array is required' }, 400);
    }

    // Step 1: deterministic mapping (always succeeds)
    const base = deterministicMap(headers);

    // Step 2: AI enhancement for unmapped columns (best-effort, never
    // downgrades deterministic matches)
    const ai = await aiEnhanceMapping(headers, sample_rows, base).catch(() => null);

    // Step 3: merge
    const final = mergeResults(base, ai, headers);

    return jsonResponse({
      mapping: final.mapping,
      confidence: final.confidence,
      koach_fields: KOACH_FIELDS,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
