// Display-time resolution of private-bucket references.
//
// Private files are stored as `storage://uploads/<uid>/<file>`. Anything else
// (public branding URLs, legacy/external https URLs, data: URLs, blob: URLs,
// empty values) is returned untouched, so call sites can pass ANY stored value.
import { getSupabase, UPLOADS_BUCKET, STORAGE_REF_PREFIX } from '@/api/supabaseClient';

const TTL_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // re-sign 5 min before expiry
const cache = new Map(); // ref -> { url, exp }
const inflight = new Map(); // ref -> Promise<string>

export const isStorageRef = (v) => typeof v === 'string' && v.startsWith(STORAGE_REF_PREFIX);

/** Sync lookup of an already-signed URL (undefined if not resolved yet). */
export function peekSignedUrl(value) {
  if (!isStorageRef(value)) return value || undefined;
  const hit = cache.get(value);
  return hit && hit.exp - Date.now() > REFRESH_MARGIN_MS ? hit.url : undefined;
}

/** Resolve any stored value to something a browser can load. */
export async function resolveFileUrl(value) {
  if (!isStorageRef(value)) return value || undefined;
  const hit = peekSignedUrl(value);
  if (hit) return hit;
  if (inflight.has(value)) return inflight.get(value);
  const path = value.slice(STORAGE_REF_PREFIX.length);
  const p = (async () => {
    const { data, error } = await getSupabase().storage.from(UPLOADS_BUCKET).createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not load file');
    cache.set(value, { url: data.signedUrl, exp: Date.now() + TTL_SECONDS * 1000 });
    return data.signedUrl;
  })().finally(() => inflight.delete(value));
  inflight.set(value, p);
  return p;
}

/**
 * Open a stored file in a new tab. The tab is opened synchronously (so popup
 * blockers allow it) and pointed at the signed URL once it resolves.
 */
export async function openFileUrl(value) {
  if (!value) return;
  if (!isStorageRef(value)) { window.open(value, '_blank', 'noopener'); return; }
  const w = window.open('', '_blank');
  try {
    const url = await resolveFileUrl(value);
    if (w) { w.opener = null; w.location.href = url; } else { window.open(url, '_blank', 'noopener'); }
  } catch (e) {
    if (w) w.close();
    throw e;
  }
}

/** Test seam. */
export function __clearSignedUrlCache() { cache.clear(); inflight.clear(); }
