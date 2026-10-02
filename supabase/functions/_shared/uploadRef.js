/**
 * Storage references for the private `uploads` bucket.
 *
 * The app stores private files as `storage://uploads/<uid>/<name>` (never a
 * URL) and signs them at display time. Edge functions that must read an
 * uploaded file (aiInBodyScan) accept ONLY that shape — or an equivalent
 * Supabase Storage URL on THIS project's host for the `uploads` bucket — and
 * never fetch an arbitrary caller-supplied URL (SSRF / quota abuse / reading
 * other buckets). Dependency-free so node rehearsals can import it.
 */

export const UPLOADS_BUCKET = 'uploads';
const REF_PREFIX = `storage://${UPLOADS_BUCKET}/`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns { ok: true, path, ownerId } or { ok: false, reason }.
 * `supabaseUrl` is this project's URL (https://<ref>.supabase.co).
 */
export function parseUploadRef(fileUrl, supabaseUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl) return { ok: false, reason: 'fileUrl must be a string' };

  let path = null;
  if (fileUrl.startsWith(REF_PREFIX)) {
    path = fileUrl.slice(REF_PREFIX.length);
  } else {
    let u;
    try { u = new URL(fileUrl); } catch { return { ok: false, reason: 'fileUrl must be a storage reference in the uploads bucket' }; }
    let base;
    try { base = new URL(supabaseUrl); } catch { return { ok: false, reason: 'server storage host not configured' }; }
    if (u.protocol !== 'https:' || u.host !== base.host || u.username || u.password) {
      return { ok: false, reason: 'fileUrl must point at this project\'s uploads bucket' };
    }
    const m = u.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/);
    if (!m || m[1] !== UPLOADS_BUCKET) return { ok: false, reason: 'fileUrl must point at the uploads bucket' };
    path = m[2];
  }

  try { path = decodeURIComponent(path); } catch { return { ok: false, reason: 'invalid path encoding' }; }
  const segs = path.split('/');
  if (segs.length < 2 || segs.some((s) => !s || s === '.' || s === '..') || path.includes('\\')) {
    return { ok: false, reason: 'invalid storage path' };
  }
  if (!UUID.test(segs[0])) return { ok: false, reason: 'invalid storage path' };
  return { ok: true, path, ownerId: segs[0].toLowerCase() };
}
