// Supabase Edge Function: aiInBodyScan  (Migration Step 7 — frontend cutover)
//
// Per-purpose replacement for the vision `integrations.Core.InvokeLLM` call in
// components/progress/InBodyScanner. Takes the public Storage URL of an uploaded
// InBody scan image and extracts its metrics via Claude vision (imageUrls on the
// shared Anthropic client). Prompt ported verbatim from the frontend.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { meterInsightCall } from '../_shared/aiMetering.js';
import { parseUploadRef, UPLOADS_BUCKET } from '../_shared/uploadRef.js';

const EXTRACT_PROMPT = `Extract all metrics from this InBody scan image and return ONLY a JSON object with no markdown fences:
{
  "scan_date": "YYYY-MM-DD or null",
  "weight_lbs": number or null,
  "weight_kg": number or null,
  "body_fat_percent": number or null,
  "fat_mass_lbs": number or null,
  "lean_mass_lbs": number or null,
  "muscle_mass_lbs": number or null,
  "bmi": number or null,
  "bmr": number or null,
  "visceral_fat_level": number or null,
  "total_body_water": number or null,
  "protein_kg": number or null,
  "minerals_kg": number or null,
  "right_arm_muscle": number or null,
  "left_arm_muscle": number or null,
  "trunk_muscle": number or null,
  "right_leg_muscle": number or null,
  "left_leg_muscle": number or null,
  "right_arm_fat": number or null,
  "left_arm_fat": number or null,
  "trunk_fat": number or null,
  "right_leg_fat": number or null,
  "left_leg_fat": number or null,
  "inbody_score": number or null,
  "raw_text": "brief 1-sentence summary of what was found on the scan"
}
Return null for any field not visible in the scan. Do not include markdown or code fences.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { fileUrl } = await req.json();
    if (!fileUrl) return jsonResponse({ error: 'Missing fileUrl' }, 400);

    // Only OUR private `uploads` bucket is accepted (no arbitrary URLs), and only
    // a file the caller may read: their own folder, or a folder belonging to a
    // portal client of theirs. Checked before metering so rejections are free.
    const ref = parseUploadRef(fileUrl, Deno.env.get('SUPABASE_URL'));
    if (!ref.ok) return jsonResponse({ error: ref.reason }, 400);
    const svc = serviceClient();
    if (ref.ownerId !== caller.auth.id) {
      const { data: owned } = await svc.from('clients').select('id')
        .eq('portal_user_id', ref.ownerId)
        .or(`user_id.eq.${caller.auth.id},created_by.eq.${caller.auth.id}`)
        .limit(1);
      if (!owned?.length) return jsonResponse({ error: 'Forbidden: file is not yours' }, 403);
    }

    // Short-lived signed URL, only ever handed to the vision call.
    const { data: signed, error: signErr } = await svc.storage.from(UPLOADS_BUCKET).createSignedUrl(ref.path, 120);
    if (signErr || !signed?.signedUrl) return jsonResponse({ error: 'File not found' }, 404);

    const blocked = await meterInsightCall(svc, caller);
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    const result = await invokeClaude({ expectJson: true, imageUrls: [signed.signedUrl], prompt: EXTRACT_PROMPT });
    if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
    return jsonResponse(result.parsed);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
