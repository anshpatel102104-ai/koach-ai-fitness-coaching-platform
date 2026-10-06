/**
 * Client limitations for the program builder: the red flag chip
 * ("Left knee: no jumps, no deep lunges. Checked on every exercise.") and the
 * per-exercise "flagged for knee" marks.
 *
 * Uses the same contraindication table the AI generator enforces server-side
 * (supabase/functions/_shared/aiSafety.js), so what the coach sees flagged in
 * the builder matches what the generator would refuse.
 */
import { injuryAvoidTerms } from '../../../../supabase/functions/_shared/aiSafety.js';

const AREAS = ['lower back', 'knee', 'acl', 'meniscus', 'shoulder', 'rotator', 'spine', 'hernia', 'wrist', 'ankle', 'hip', 'elbow', 'neck'];
const INJURY_WORDS = /\b(injur\w*|pain|history|surgery|repair|strain|sprain|tear|torn|tendon\w*|limitation\w*|rehab|avoid)\b/i;

/** Free text describing the client's limitation, or '' if none is recorded. */
export function limitationText(client, program) {
  if (!client && !program) return '';
  const explicit = [
    program?.limitations,
    program?.injury_notes,
    client?.injury_notes,
    Array.isArray(client?.injuries) ? client.injuries.join(', ') : client?.injuries,
    client?.limitations,
  ].find(v => typeof v === 'string' && v.trim());
  if (explicit) return explicit.trim();

  // Fall back to the sentence in the coach's notes that mentions an injured area.
  const notes = typeof client?.notes === 'string' ? client.notes : '';
  if (!notes) return '';
  const sentences = notes.match(/[^.!?]+[.!?]*/g) || [];
  const hit = sentences.find(s => AREAS.some(a => new RegExp(`\\b${a}`, 'i').test(s)) && INJURY_WORDS.test(s))
    || sentences.find(s => /\binjur/i.test(s));
  return hit ? hit.trim() : '';
}

/** Areas named in the limitation text ("knee", "shoulder"). */
export function limitationAreas(text) {
  if (!text) return [];
  return AREAS.filter(a => new RegExp(`\\b${a}`, 'i').test(text));
}

/**
 * Build a checker for exercise names. Returns the area an exercise loads
 * ("knee") or null when it is clear.
 */
export function buildLimitationCheck(text) {
  const areas = limitationAreas(text);
  const rules = areas
    .map(area => ({ area, terms: injuryAvoidTerms(area) }))
    .filter(r => r.terms.length > 0);
  if (rules.length === 0) return () => null;
  return (name) => {
    if (!name) return null;
    for (const { area, terms } of rules) {
      for (const term of terms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}(?:s|es|ing)?\\b`, 'i').test(name)) return area;
      }
    }
    return null;
  };
}
