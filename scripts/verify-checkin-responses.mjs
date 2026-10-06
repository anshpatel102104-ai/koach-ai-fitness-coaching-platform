import assert from 'node:assert/strict';
const m = await import('../src/lib/checkinResponses.js');
const form = { questions: [
  { id: 'a1', preset_key: 'weight', type: 'number', label: 'Weight' },
  { id: 'a2', preset_key: 'energy', type: 'scale', label: 'Energy' },
  { id: 'a3', preset_key: 'nutrition', type: 'scale', label: 'Nutrition' },
  { id: 'a4', preset_key: 'overall', type: 'mood', label: 'Mood' },
  { id: 'a5', preset_key: 'photos', type: 'photo', label: 'Photos' },
  { id: 'a6', type: 'text_short', label: 'Favourite meal this week?' },
  { id: 'a7', preset_key: 'stress', type: 'scale', label: 'Stress' },
  { id: 'a8', preset_key: 'wins', type: 'text_long', label: 'Wins' },
  { id: 'a9', preset_key: 'injuries', type: 'yes_no', label: 'Injuries?' },
]};
const row = m.checkInRowFromAnswers(form, { a1: 182.4, a2: 7, a3: 8, a4: 'good', a5: { front: 'storage://x/f.jpg', side: 'storage://x/s.jpg' }, a6: 'Salmon bowl', a7: 42, a8: 'PR on squat', a9: true });
assert.equal(row.weight, 182.4); assert.equal(row.energy_level, 7); assert.equal(row.compliance_nutrition, 80);
assert.equal(row.mood, 'good'); assert.deepEqual(row.photo_urls, ['storage://x/f.jpg','storage://x/s.jpg']);
assert.equal(row.stress_level, undefined, 'out-of-range stays out of the column');
assert.equal(row.notes, 'Wins: PR on squat');
assert.equal(row.responses.length, 9);
assert.ok(!Object.keys(row).some(k => /^a\d$/.test(k)), 'no question ids as columns');
const extra = m.extraAnswers(row);
assert.deepEqual(extra.map(r => r.label).sort(), ['Favourite meal this week?', 'Injuries?', 'Stress'].sort());
assert.equal(m.formatAnswer(extra.find(r => r.label==='Injuries?')), 'Yes');
assert.equal(m.checkInRowFromAnswers(m.DEFAULT_CHECKIN_FORM, {}).responses.length, 0);
console.log('checkinResponses: all assertions passed');
