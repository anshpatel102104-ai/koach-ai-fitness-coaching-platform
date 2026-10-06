/**
 * Turn a check-in form's answers into a check_ins row.
 *
 * Every answer is kept in `responses` (with the question label, so it reads
 * correctly even after the coach edits the form). Preset questions additionally
 * fill the typed columns that charts, flags and risk scoring use. Values that
 * don't fit a column's range are left out of the column (still in responses)
 * rather than failing the whole submission.
 */

const clampInt = (v, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : undefined;
};

const MOODS = new Set(['great', 'good', 'okay', 'tired', 'stressed']);

/** Default form used when the coach hasn't assigned one (never a blank screen). */
export const DEFAULT_CHECKIN_FORM = {
  id: null,
  name: 'Weekly check-in',
  questions: [
    { id: 'weight', preset_key: 'weight', type: 'number', label: 'What is your current weight? (lbs)' },
    { id: 'energy', preset_key: 'energy', type: 'scale', label: 'How were your energy levels this week?' },
    { id: 'stress', preset_key: 'stress', type: 'scale', label: 'How were your stress levels this week?' },
    { id: 'nutrition', preset_key: 'nutrition', type: 'scale', label: 'Rate your nutrition adherence this week.' },
    { id: 'overall', preset_key: 'overall', type: 'mood', label: 'How are you feeling overall?' },
    { id: 'wins', preset_key: 'wins', type: 'text_long', label: 'What were your wins from this week?' },
    { id: 'challenges', preset_key: 'challenges', type: 'text_long', label: 'What challenges or struggles did you face?' },
    { id: 'photos', preset_key: 'photos', type: 'photo', label: 'Progress photos (front, side, back)' },
  ],
};

const isAnswered = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

/**
 * @param {object} form          check_in_forms row (or DEFAULT_CHECKIN_FORM)
 * @param {object} answers       { [question.id]: value }
 * @param {object} [opts]
 * @param {number} [opts.plannedWorkouts]  workouts per week in the assigned program
 * @returns {object} column values to merge into the check_ins insert
 */
export function checkInRowFromAnswers(form, answers, { plannedWorkouts } = {}) {
  const row = {};
  const responses = [];
  const notes = [];

  for (const q of form?.questions ?? []) {
    const value = answers?.[q.id];
    if (!isAnswered(value)) continue;
    responses.push({ question_id: q.id, preset_key: q.preset_key ?? null, label: q.label || q.preset_key || 'Question', type: q.type, value });

    switch (q.preset_key) {
      case 'weight': {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0 && n < 2000) row.weight = n;
        break;
      }
      case 'energy': row.energy_level = clampInt(value, 1, 10); break;
      case 'stress': row.stress_level = clampInt(value, 1, 10); break;
      case 'nutrition': {
        const s = clampInt(value, 1, 10);
        if (s !== undefined) row.compliance_nutrition = s * 10; // 1–10 rating → percent
        break;
      }
      case 'workouts': {
        const done = String(value).startsWith('6') ? 6 : Number(value);
        if (Number.isFinite(done) && plannedWorkouts > 0) {
          row.compliance_training = Math.min(100, Math.round((done / plannedWorkouts) * 100));
        }
        break;
      }
      case 'overall': if (MOODS.has(value)) row.mood = value; break;
      case 'photos': {
        const urls = (typeof value === 'object' ? Object.values(value) : [value]).filter((u) => typeof u === 'string' && u);
        if (urls.length) row.photo_urls = urls;
        break;
      }
      case 'measurements': if (value && typeof value === 'object') row.measurements = value; break;
      case 'wins': notes.push(`Wins: ${value}`); break;
      case 'challenges': notes.push(`Challenges: ${value}`); break;
      case 'goals': notes.push(`Next week: ${value}`); break;
      default: break;
    }
  }

  for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
  if (notes.length) row.notes = notes.join('\n\n');
  row.responses = responses;
  return row;
}

/** Display helper for coach screens: "7", "Yes", "Front, Side", … */
export function formatAnswer(r) {
  const v = r?.value;
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (Array.isArray(v)) return v.join(', ');
  if (v && typeof v === 'object') {
    if (r.type === 'photo') return `${Object.keys(v).length} photo${Object.keys(v).length === 1 ? '' : 's'}`;
    return Object.entries(v).filter(([, x]) => x !== '' && x != null).map(([k, x]) => `${k}: ${x}`).join(' · ');
  }
  if (r?.type === 'scale') return `${v} out of 10`;
  return String(v ?? '');
}

// The column (or notes) that displays each preset answer on coach screens.
const SHOWN_IN = {
  weight: 'weight', energy: 'energy_level', stress: 'stress_level', nutrition: 'compliance_nutrition',
  overall: 'mood', measurements: 'measurements', photos: 'photo_urls',
  wins: 'notes', challenges: 'notes', goals: 'notes',
};

/**
 * Answers that are only visible through `responses`: custom questions, presets
 * without a column (sleep quality, water, injuries), and preset answers whose
 * value didn't fit the column (so nothing the client wrote is ever hidden).
 */
export function extraAnswers(checkIn) {
  const list = Array.isArray(checkIn?.responses) ? checkIn.responses : [];
  return list.filter((r) => {
    if (r.type === 'photo') return false;
    const col = SHOWN_IN[r.preset_key];
    return !col || checkIn[col] == null || (Array.isArray(checkIn[col]) && checkIn[col].length === 0);
  });
}
