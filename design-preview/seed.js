/**
 * Realistic seeded data for the design-preview harness.
 *
 * Coach: Myles Harris (pro plan, active billing) with 10 clients. Every date is
 * computed relative to "now" at load time, and a seeded PRNG keeps the noise in
 * weights/sleep/etc. stable between screenshot runs.
 *
 * Field names follow supabase/migrations/*.sql plus the JSON shapes the UI reads
 * (workout_programs.workouts[].exercises[], nutrition_plans.meals[].foods[],
 * workout_sessions.exercise_logs[].sets_completed[], …).
 */

// ---- stable ids (routes reference these) --------------------------------------
export const IDS = {
  coach: 'a1000000-0000-4000-8000-000000000001',
  jordanUser: 'b1000000-0000-4000-8000-000000000001',
  clients: {
    jordan: 'c1000000-0000-4000-8000-000000000001',
    priya: 'c1000000-0000-4000-8000-000000000002',
    lena: 'c1000000-0000-4000-8000-000000000003',
    sam: 'c1000000-0000-4000-8000-000000000004',
    alicia: 'c1000000-0000-4000-8000-000000000005',
    marcus: 'c1000000-0000-4000-8000-000000000006',
    devon: 'c1000000-0000-4000-8000-000000000007',
    tasha: 'c1000000-0000-4000-8000-000000000008',
    chris: 'c1000000-0000-4000-8000-000000000009',
    nia: 'c1000000-0000-4000-8000-000000000010',
  },
  programs: {
    upperLower: 'd1000000-0000-4000-8000-000000000001',
    fatLoss: 'd1000000-0000-4000-8000-000000000002',
    recomp: 'd1000000-0000-4000-8000-000000000003',
    hybrid: 'd1000000-0000-4000-8000-000000000004',
    leanBulk: 'd1000000-0000-4000-8000-000000000005',
    strength: 'd1000000-0000-4000-8000-000000000006',
    hotelGym: 'd1000000-0000-4000-8000-000000000007',
  },
  nutrition: {
    priya: 'e1000000-0000-4000-8000-000000000001',
    jordan: 'e1000000-0000-4000-8000-000000000002',
    marcus: 'e1000000-0000-4000-8000-000000000003',
    recompTemplate: 'e1000000-0000-4000-8000-000000000004',
    travelHabits: 'e1000000-0000-4000-8000-000000000005',
  },
  checkInForm: 'f2000000-0000-4000-8000-000000000001',
};

export const COACH_EMAIL = 'myles@harrisfitness.co';
export const JORDAN_EMAIL = 'jordan.reyes@example.com';

// ---- small utilities ------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, '0');
const r1 = (n) => Math.round(n * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function buildSeed(now = new Date()) {
  const rand = mulberry32(20261006);
  const jitter = (amp) => (rand() * 2 - 1) * amp;

  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n) => ymd(addDays(day0, -n));
  const daysFromNow = (n) => ymd(addDays(day0, n));
  /** ISO timestamp n days ago at hh:mm local (past timestamps never land after "now") */
  const at = (nDaysAgo, hh = 9, mm = 0) => {
    const d = addDays(day0, -nDaysAgo);
    d.setHours(hh, mm, 0, 0);
    if (nDaysAgo >= 0 && d > now) return new Date(now.getTime() - (60 + hh) * 60000).toISOString();
    return d.toISOString();
  };
  const minutesAgo = (m) => new Date(now.getTime() - m * 60000).toISOString();
  /** most recent date (<= today - minBack) with the given weekday (0=Sun) */
  const lastDow = (dow, minBack = 0) => {
    for (let i = minBack; i < minBack + 7; i++) {
      const d = addDays(day0, -i);
      if (d.getDay() === dow) return i;
    }
    return minBack;
  };

  const coach = IDS.coach;
  const C = IDS.clients;
  const meta = (createdAt) => ({ created_at: createdAt, updated_at: createdAt, created_by: coach });

  // ---------------------------------------------------------------------------
  // CLIENTS
  // ---------------------------------------------------------------------------
  // weekDaysAgo: how many days ago they started; checkInDow: weekday they check in
  const clientDefs = [
    {
      key: 'jordan', name: 'Jordan Reyes', email: JORDAN_EMAIL, phone: '(415) 555-0142', sex: 'male',
      goal: 'weight_loss', tags: ['Fat loss', '12-week block'], dob: '1991-03-14', height: `6'0"`,
      startDaysAgo: lastDow(5, 35), checkInDow: 5, startW: 201.4, curW: 195.6, targetW: 185,
      program: IDS.programs.upperLower, nutrition: IDS.nutrition.jordan, rate: 249,
      compliance: () => [98, 97], sleep: 7.6, energy: 8, stress: 3, moods: ['great', 'good'],
      bf: [22.4, 20.6], notes: 'Software engineer, trains 6am before work. Knee history (L) — keep split squats light.',
    },
    {
      key: 'priya', name: 'Priya Shah', email: 'priya.shah@example.com', phone: '(312) 555-0187', sex: 'female',
      goal: 'weight_loss', tags: ['Fat loss', 'Peanut allergy'], dob: '1994-08-02', height: `5'5"`,
      startDaysAgo: 10, checkInDow: null, startW: 168.2, curW: 167.4, targetW: 150,
      program: IDS.programs.fatLoss, nutrition: IDS.nutrition.priya, rate: 199, lifecycle: 'at_risk',
      bf: [31.5, 31.2],
      notes: 'SEVERE PEANUT ALLERGY — no peanuts, peanut butter or peanut oil in any plan. Prefers vegetarian lunches on weekdays. Nurse, rotating shifts.',
    },
    {
      key: 'lena', name: 'Lena Fischer', email: 'lena.fischer@example.com', phone: '(646) 555-0119', sex: 'female',
      goal: 'general_fitness', tags: ['Recomp'], dob: '1988-11-21', height: `5'7"`,
      startDaysAgo: lastDow(1, 49), checkInDow: 1, startW: 146.0, curW: 145.2, targetW: 142,
      program: IDS.programs.recomp, nutrition: null, rate: 249,
      compliance: (i, n) => { const arr = [94, 92, 90, 86, 80, 71, 62, 52]; return [arr[Math.max(0, arr.length - (n - i))], arr[Math.max(0, arr.length - (n - i))] - 4]; },
      sleep: 6.4, energy: 6, stress: 6, moods: ['good', 'okay', 'tired'], bf: [27.0, 25.9],
      notes: 'Started a new job in September — schedule has been chaotic. Responds well to short, direct check-ins.',
    },
    {
      key: 'sam', name: 'Sam Okafor', email: 'sam.okafor@example.com', phone: '(512) 555-0163', sex: 'male',
      goal: 'endurance', tags: ['Hybrid', 'Half marathon'], dob: '1996-05-09', height: `5'11"`,
      startDaysAgo: lastDow(0, 28), checkInDow: 0, startW: 181.0, curW: 179.4, targetW: 178,
      program: IDS.programs.hybrid, nutrition: null, rate: 229,
      compliance: (i, n) => (i === n - 1 ? [60, 85] : [90, 88]), sleep: 7.1, energy: 7, stress: 4, moods: ['good'],
      bf: [16.8, 16.1], notes: 'Training for the Austin half in February. Runs Tue/Thu/Sat, lifts Mon/Wed/Fri.',
    },
    {
      key: 'alicia', name: 'Alicia Moore', email: 'alicia.moore@example.com', phone: '(206) 555-0131', sex: 'female',
      goal: 'general_fitness', tags: ['Recomp', 'Travelling'], dob: '1990-01-27', height: `5'6"`,
      startDaysAgo: lastDow(3, 14), checkInDow: 3, startW: 139.8, curW: 139.2, targetW: 136,
      program: IDS.programs.recomp, nutrition: IDS.nutrition.travelHabits, rate: 249,
      compliance: () => [88, 82], sleep: 6.9, energy: 7, stress: 5, moods: ['good', 'okay'], bf: [26.2, 25.8],
      notes: 'Consultant — on the road 2 weeks a month. Hotel gyms are usually dumbbells to 50 lb + cables.',
    },
    {
      key: 'marcus', name: 'Marcus Bell', email: 'marcus.bell@example.com', phone: '(404) 555-0178', sex: 'male',
      goal: 'muscle_gain', tags: ['Lean bulk'], dob: '1998-07-30', height: `5'10"`,
      startDaysAgo: lastDow(6, 56), checkInDow: 6, startW: 172.0, curW: 178.6, targetW: 185,
      program: IDS.programs.leanBulk, nutrition: IDS.nutrition.marcus, rate: 249,
      compliance: () => [94, 90], sleep: 8.0, energy: 8, stress: 3, moods: ['great', 'good'], bf: [14.2, 15.0],
      notes: 'Ex-college wrestler. Deadlift is the priority lift — hips rise early under fatigue.',
    },
    {
      key: 'devon', name: 'Devon Carter', email: 'devon.carter@example.com', phone: '(720) 555-0124', sex: 'male',
      goal: 'strength', tags: ['Strength', 'Powerlifting'], dob: '1987-02-11', height: `5'9"`,
      startDaysAgo: lastDow(4, 77), checkInDow: 4, startW: 204.0, curW: 206.2, targetW: 205,
      program: IDS.programs.strength, nutrition: null, rate: 299,
      compliance: () => [96, 88], sleep: 7.4, energy: 8, stress: 4, moods: ['great', 'good'], bf: [19.0, 18.4],
      notes: 'Meet in March (USAPL, 93 kg). Current bests: S 455 / B 315 / D 545.',
    },
    {
      key: 'tasha', name: 'Tasha Grant', email: 'tasha.grant@example.com', phone: '(718) 555-0156', sex: 'female',
      goal: 'strength', tags: ['Strength'], dob: '1993-09-05', height: `5'4"`,
      startDaysAgo: lastDow(1, 21), checkInDow: 1, startW: 151.0, curW: 151.4, targetW: 152,
      program: IDS.programs.strength, nutrition: null, rate: 249,
      compliance: () => [100, 100], sleep: 7.9, energy: 9, stress: 2, moods: ['great'], bf: [24.0, 23.4],
      notes: 'Hasn\'t missed a session yet. Wants a 225 lb deadlift by year end.',
    },
    {
      key: 'chris', name: 'Chris Nguyen', email: 'chris.nguyen@example.com', phone: '(408) 555-0109', sex: 'male',
      goal: 'weight_loss', tags: ['Fat loss', 'Onboarding'], dob: '1985-12-18', height: `5'8"`,
      startDaysAgo: 3, checkInDow: null, startW: 214.6, curW: 214.6, targetW: 190,
      program: null, nutrition: null, rate: 199, bf: [29.0, 29.0],
      notes: 'Intake complete. Desk job, 2 kids — 3 x 45 min sessions max. Program to be built after Tuesday\'s assessment.',
    },
    {
      key: 'nia', name: 'Nia Brooks', email: 'nia.brooks@example.com', phone: '(213) 555-0192', sex: 'female',
      goal: 'general_fitness', tags: ['Recomp', 'Renewal due'], dob: '1992-04-23', height: `5'8"`,
      startDaysAgo: lastDow(2, 70), checkInDow: 2, startW: 158.0, curW: 154.8, targetW: 152,
      program: IDS.programs.recomp, nutrition: IDS.nutrition.recompTemplate, rate: 249,
      compliance: () => [92, 86], sleep: 7.3, energy: 8, stress: 4, moods: ['good', 'great'], bf: [28.5, 24.9],
      notes: '12-week block ends next week. Has asked about continuing with a strength focus.',
    },
  ];

  const clients = clientDefs.map((d) => {
    const id = C[d.key];
    const start = daysAgo(d.startDaysAgo);
    const createdAt = at(d.startDaysAgo + 2, 14, 10);
    return {
      id,
      user_id: coach,
      team_id: null,
      portal_user_id: d.key === 'jordan' ? IDS.jordanUser : null,
      name: d.name,
      email: d.email,
      invite_token: null,
      invite_token_expires: null,
      phone: d.phone,
      avatar_url: null,
      lifecycle_status: d.lifecycle || 'active',
      status: 'active',
      tags: d.tags,
      lifecycle_notes: d.lifecycle === 'at_risk' ? 'No check-in since week 1 — reach out before Friday.' : null,
      goal: d.goal,
      start_date: start,
      current_weight: d.curW,
      starting_weight: d.startW,
      target_weight: d.targetW,
      height: d.height,
      sex: d.sex,
      date_of_birth: d.dob,
      notes: d.notes,
      external_id: null,
      assigned_program_id: d.program,
      assigned_nutrition_id: d.nutrition,
      monthly_rate: d.rate,
      stripe_customer_id: `cus_demo_${d.key}`,
      billing_status: 'active',
      description: null,
      ...meta(createdAt),
    };
  });
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));

  // ---------------------------------------------------------------------------
  // CHECK-INS + WEIGH-INS
  // ---------------------------------------------------------------------------
  const checkIns = [];
  const weighIns = [];
  const photoRef = (clientId, date, view) => `storage://uploads/${coach}/client/${clientId}/${date}-${view}.jpg`;

  const CHECKIN_NOTES = {
    jordan: [
      'Baseline week. Feeling motivated — meal prepped Sunday for the first time in months.',
      'Hit all 4 sessions. Hunger was rough Wednesday night but stayed on plan.',
      'Down again! Bench felt heavy Monday but back squat moved well.',
      'Great week — 10k steps every day and slept better. Work stress manageable.',
      'Solid. Ate out twice for a friend\'s birthday but stayed close to macros.',
      'Another good week. Belt is a notch tighter 🙌 Lower B hamstring curls felt amazing.',
      'Consistent week, all sessions done. Energy is way up.',
    ],
    lena: [
      'Baseline — excited to get going.',
      'Good week, all sessions in.',
      'Missed Friday but made it up Saturday.',
      'Busy at work, still got 3 of 4 sessions.',
      'New job started. Only managed 3 sessions and nutrition slipped on weekend.',
      'Tired — long days. Skipped one session and ordered takeout a few times.',
      'Struggling with the new schedule, missed two sessions.',
      'Honestly struggling to stay consistent — new job hours, skipped two sessions and ate out most nights.',
    ],
    sam: [
      'Baseline. Ran 18 miles total this week.',
      'Long run 9 miles felt easy. Lifts on track.',
      'Upper days strong — bench up 5 lb. Legs a bit heavy after intervals.',
      'Skipped both lower days — calves were wrecked after Saturday\'s 10k. Upper days felt strong.',
    ],
    alicia: [
      'Baseline — home this week, full gym access.',
      'Flew to Lisbon Thursday. Got 3 sessions in before leaving.',
      'Hotel gym only — dumbbells top out at 50 lb. Did what I could.',
    ],
    marcus: [
      'Baseline. Ready to eat 😤',
      'Getting all the food in is harder than I thought.',
      'Up 1.2 lb. Deadlift 405x5 felt smooth.',
      'Good week, sleeping 8+ hours.',
      'Hit 425x5 on deadlift, hips came up a little on the last rep.',
      'Bench stalled at 245, everything else moving.',
      'Appetite is up now, easier to hit calories.',
      'Strong week — 445x3 deadlift. Sending a form video.',
      'Deadlift top set 455 — hips shot up on rep 3, sent you the video.',
    ],
    devon: [
      'Baseline — volume block starting.', 'Squats feel great.', 'Bench 285x3, smooth.', 'Deload week, felt recovered.',
      'Squat 425x2.', 'Bench 295x2!', 'Pulled 515 easy.', 'Hard week, work travel, still hit everything.',
      'Peaking block starting.', 'Squat 445 single.', 'Bench 305 single, close to 315.', 'NEW PR — bench 315 single! 🎉',
    ],
    tasha: ['Baseline — let\'s go!', 'Every session done, deadlift 185x5.', 'Perfect week again. Deadlift 195x5.', 'Another perfect week. 205x3 deadlift — felt fast.'],
    nia: [
      'Baseline.', 'Good first week.', 'Sore but happy.', 'All sessions.', 'Down 1 lb, waist down too.', 'Travel week, did hotel workouts.',
      'Back on track.', 'Great week.', 'Feeling strong — squat 155x8.', 'Clothes fit so much better.', 'Best week yet — PR on hip thrust 245x8.',
    ],
  };

  const COACH_NOTES = [
    'Great week — keep the same targets. Nice work on the sleep.',
    'Solid. Let\'s push step count a little higher next week (10k).',
    'Love the consistency. Bumping load 5 lb on your main lifts.',
    'Good stuff. Make sure you\'re getting protein in at breakfast.',
  ];

  for (const d of clientDefs) {
    const id = C[d.key];
    if (d.key === 'chris') continue; // onboarding — no check-ins yet

    if (d.key === 'priya') {
      // single baseline check-in 9 days ago, then silence
      const date = daysAgo(9);
      checkIns.push({
        id: `c2000000-0000-4000-8000-0000000002${pad(1)}`,
        client_id: id, client_name: d.name, date, review_status: 'reviewed',
        weight: 168.2, body_fat_pct: 31.5,
        measurements: { chest: 37.5, waist: 31.0, hips: 41.5, arms: 12.0, thighs: 23.5 },
        photo_urls: [photoRef(id, date, 'front'), photoRef(id, date, 'side')],
        mood: 'stressed', energy_level: 4, stress_level: 8, sleep_hours: 5.5,
        compliance_training: 50, compliance_nutrition: 60,
        notes: 'Rough first week — back-to-back night shifts and I skipped the gym twice. Struggling to hit protein without peanut butter as a go-to snack.',
        coach_notes: 'Totally normal first week. Let\'s swap the PB snack for Greek yogurt or a shake — I\'ve updated your plan.',
        internal_notes: 'Watch closely — shift work. Offer a call.',
        coach_responded: true, ai_summary: null, form_id: IDS.checkInForm,
        ...meta(at(9, 20, 41)),
      });
      // daily weigh-ins for the first few days only
      [10, 9, 8].forEach((n, i) => weighIns.push({ id: `c3000000-0000-4000-8000-0000000002${pad(i)}`, client_id: id, team_id: null, weight: r1(168.2 - i * 0.3 + jitter(0.2)), date: daysAgo(n), note: null, ...meta(at(n, 7, 5)) }));
      continue;
    }

    // weekly check-in dates from start (start is on the client's check-in weekday)
    const dates = [];
    for (let n = d.startDaysAgo; n >= 0; n -= 7) dates.push(n);
    const count = dates.length;
    dates.forEach((n, i) => {
      const t = count > 1 ? i / (count - 1) : 1;
      const date = daysAgo(n);
      const weight = i === count - 1 ? d.curW : r1(d.startW + (d.curW - d.startW) * t + (i === 0 ? 0 : jitter(0.4)));
      const bf = r1(d.bf[0] + (d.bf[1] - d.bf[0]) * t);
      const [ct, cn] = d.compliance(i, count);
      const isLatest = i === count - 1;
      const notesArr = CHECKIN_NOTES[d.key] || [];
      const note = notesArr[Math.min(notesArr.length - 1, Math.max(0, notesArr.length - (count - i)))] || 'Good week.';
      const waistStart = d.sex === 'male' ? 36.5 : 30.5;
      const waistDelta = (d.startW - d.curW) * 0.18;
      const mood = d.key === 'lena' && isLatest ? 'tired' : d.moods[i % d.moods.length];
      const pending = isLatest && ['jordan', 'lena', 'sam', 'marcus', 'devon', 'nia'].includes(d.key);
      const ciId = `c2000000-0000-4000-8000-${String(Object.keys(C).indexOf(d.key) + 1).padStart(4, '0')}${String(i).padStart(8, '0')}`;
      checkIns.push({
        id: ciId,
        client_id: id,
        client_name: d.name,
        date,
        review_status: pending ? 'pending' : (d.key === 'lena' && i >= count - 3 ? 'flagged' : 'reviewed'),
        weight,
        body_fat_pct: bf,
        measurements: {
          chest: r1((d.sex === 'male' ? 42 : 36.5) + jitter(0.2)),
          waist: r1(waistStart - waistDelta * t),
          hips: r1((d.sex === 'male' ? 40 : 41) - waistDelta * 0.5 * t),
          arms: r1((d.sex === 'male' ? 15 : 12) + (d.key === 'marcus' ? 0.6 * t : 0)),
          thighs: r1((d.sex === 'male' ? 24 : 23) + jitter(0.15)),
        },
        photo_urls: (i === 0 || isLatest || i % 4 === 0) ? [photoRef(id, date, 'front'), photoRef(id, date, 'side'), photoRef(id, date, 'back')] : [],
        mood,
        energy_level: clamp(Math.round(d.energy + jitter(1) - (d.key === 'lena' ? 3 * t : 0)), 1, 10),
        stress_level: clamp(Math.round(d.stress + jitter(1) + (d.key === 'lena' ? 3 * t : 0)), 1, 10),
        sleep_hours: r1(clamp(d.sleep + jitter(0.5) - (d.key === 'lena' ? 0.8 * t : 0), 4.5, 9.5)),
        compliance_training: clamp(Math.round(ct), 0, 100),
        compliance_nutrition: clamp(Math.round(cn), 0, 100),
        notes: note,
        coach_notes: pending ? null : COACH_NOTES[i % COACH_NOTES.length],
        internal_notes: null,
        coach_responded: !pending,
        ai_summary: null,
        form_id: IDS.checkInForm,
        ...meta(at(n, 18, 20 + (i % 30))),
      });

      // weigh-ins: check-in day plus two mid-week weigh-ins
      [0, 2, 4].forEach((off, k) => {
        const wn = n - off;
        if (wn < 0) return;
        const nextT = count > 1 ? Math.min(1, (i + off / 7) / (count - 1)) : 1;
        weighIns.push({
          id: `c3000000-0000-4000-8000-${String(Object.keys(C).indexOf(d.key) + 1).padStart(4, '0')}${String(i * 3 + k).padStart(8, '0')}`,
          client_id: id,
          team_id: null,
          weight: k === 0 ? weight : r1(d.startW + (d.curW - d.startW) * nextT + jitter(0.5)),
          date: daysAgo(wn),
          note: k === 0 ? 'Check-in weigh-in' : null,
          ...meta(at(wn, 6, 45)),
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // EXERCISE LIBRARY
  // ---------------------------------------------------------------------------
  const lib = [
    ['Barbell Bench Press', 'chest', 'barbell', 'push', 'intermediate', ['triceps', 'shoulders'], ['Retract shoulder blades', 'Feet planted, slight arch', 'Touch mid-chest, press up and back'], 150],
    ['Incline Dumbbell Press', 'chest', 'dumbbell', 'push', 'intermediate', ['shoulders', 'triceps'], ['Bench at 30°', 'Elbows ~45° from torso', 'Control the stretch'], 120],
    ['Machine Chest Fly', 'chest', 'machine', 'push', 'beginner', ['shoulders'], ['Soft elbows', 'Squeeze for a 1s pause'], 60],
    ['Push-up', 'chest', 'bodyweight', 'push', 'beginner', ['triceps', 'core'], ['Body in one line', 'Chest to fist height'], 60],
    ['Chest-Supported Row', 'back', 'dumbbell', 'pull', 'beginner', ['biceps'], ['Chest stays on pad', 'Drive elbows to hips'], 90],
    ['Lat Pulldown', 'back', 'cable', 'pull', 'beginner', ['biceps'], ['Slight lean back', 'Pull bar to upper chest'], 90],
    ['Weighted Pull-up', 'back', 'bodyweight', 'pull', 'advanced', ['biceps', 'core'], ['Full hang at bottom', 'Chin over bar'], 150],
    ['Single-Arm Cable Row', 'back', 'cable', 'pull', 'intermediate', ['biceps'], ['Reach long', 'Row to hip'], 75],
    ['Conventional Deadlift', 'back', 'barbell', 'hinge', 'advanced', ['legs', 'glutes', 'core'], ['Bar over midfoot', 'Push the floor away', 'Hips and shoulders rise together'], 180],
    ['Romanian Deadlift', 'legs', 'barbell', 'hinge', 'intermediate', ['glutes', 'back'], ['Soft knees', 'Hips back until hamstring stretch', 'Bar stays close'], 120],
    ['Back Squat', 'legs', 'barbell', 'squat', 'intermediate', ['glutes', 'core'], ['Brace before descent', 'Knees track toes', 'Hit depth'], 180],
    ['Front Squat', 'legs', 'barbell', 'squat', 'advanced', ['core', 'glutes'], ['Elbows high', 'Upright torso'], 150],
    ['Bulgarian Split Squat', 'legs', 'dumbbell', 'squat', 'intermediate', ['glutes'], ['Long stance', 'Front foot flat', 'Control down'], 90],
    ['Leg Press', 'legs', 'machine', 'squat', 'beginner', ['glutes'], ['Full foot contact', 'Don\'t lock knees'], 120],
    ['Walking Lunge', 'legs', 'dumbbell', 'squat', 'beginner', ['glutes', 'core'], ['Long steps', 'Back knee kisses floor'], 90],
    ['Seated Hamstring Curl', 'legs', 'machine', 'hinge', 'beginner', [], ['Hips pinned', 'Slow eccentric'], 60],
    ['Leg Extension', 'legs', 'machine', 'squat', 'beginner', [], ['Pause at top', 'Controlled lowering'], 60],
    ['Standing Calf Raise', 'legs', 'machine', 'isometric', 'beginner', [], ['Full stretch', '1s pause at top'], 60],
    ['Seated Calf Raise', 'legs', 'machine', 'isometric', 'beginner', [], ['Full range', 'Slow negatives'], 60],
    ['Barbell Hip Thrust', 'glutes', 'barbell', 'hinge', 'intermediate', ['legs'], ['Chin tucked', 'Ribs down', 'Squeeze at lockout'], 90],
    ['Seated Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'push', 'intermediate', ['triceps'], ['Bench upright', 'Press slightly in front of face'], 90],
    ['Cable Lateral Raise', 'shoulders', 'cable', 'push', 'beginner', [], ['Lead with elbow', 'Stop at shoulder height'], 45],
    ['Face Pull', 'shoulders', 'cable', 'pull', 'beginner', ['back'], ['Rope to eyebrows', 'Externally rotate'], 45],
    ['EZ-Bar Curl', 'biceps', 'barbell', 'pull', 'beginner', [], ['Elbows pinned', 'No swinging'], 60],
    ['Hammer Curl', 'biceps', 'dumbbell', 'pull', 'beginner', [], ['Neutral grip', 'Control the negative'], 60],
    ['Rope Triceps Pushdown', 'triceps', 'cable', 'push', 'beginner', [], ['Elbows tucked', 'Split the rope'], 60],
    ['Overhead Triceps Extension', 'triceps', 'cable', 'push', 'beginner', [], ['Full stretch overhead'], 60],
    ['Hanging Knee Raise', 'core', 'bodyweight', 'isometric', 'intermediate', [], ['No swinging', 'Posterior tilt at top'], 45],
    ['Cable Crunch', 'core', 'cable', 'isometric', 'beginner', [], ['Curl ribs to hips', 'Hips stay still'], 45],
    ['Farmer Carry', 'full_body', 'dumbbell', 'carry', 'beginner', ['core', 'back'], ['Tall posture', 'Short quick steps'], 90],
    ['Assault Bike Intervals', 'cardio', 'machine', 'cardio', 'intermediate', ['full_body'], ['Hard 20s / easy 40s'], 0],
    ['Goblet Squat', 'legs', 'dumbbell', 'squat', 'beginner', ['glutes', 'core'], ['Elbows inside knees', 'Upright torso'], 90],
  ];
  const exerciseLibrary = lib.map(([name, muscle, equipment, pattern, difficulty, secondary, cues, rest], i) => ({
    id: `c4000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    name,
    muscle_group: muscle,
    secondary_muscles: secondary,
    equipment,
    category: muscle === 'cardio' ? 'conditioning' : ['legs', 'glutes'].includes(muscle) ? 'lower body' : muscle === 'core' ? 'core' : 'upper body',
    movement_pattern: pattern,
    difficulty,
    instructions: cues.map((c, k) => `${k + 1}. ${c}.`),
    image_url: null,
    video_url: null,
    thumbnail_url: null,
    is_coach_branded: i % 5 === 0,
    form_cues: cues,
    common_mistakes: ['Rushing the eccentric', 'Cutting range of motion short'],
    tempo: '3-1-1-0',
    default_rest_seconds: rest,
    description: `${name} — ${pattern} pattern, primary ${muscle.replace('_', ' ')}.`,
    notes: null,
    is_public: false,
    ...meta(at(120 - i, 10, 0)),
  }));

  // ---------------------------------------------------------------------------
  // WORKOUT PROGRAMS
  // ---------------------------------------------------------------------------
  // [name, sets, reps, rpe, rest, notes?]
  const ex = (name, sets, reps, rpe, rest = 90, notes = '', extra = {}) => ({
    name, sets, reps: String(reps), rest_seconds: rest, tempo: '', notes, video_url: '',
    set_type: 'straight', rpe: rpe ? String(rpe) : '', rir: '', superset_group: '', dropset_scheme: '',
    stretch_type: 'static', duration_seconds: 30, section: 'main',
    progression_type: 'none', progression_value: 5, prescription: '', ...extra,
  });
  const dayOf = (n, name, exercises, notes = '') => ({ day_name: name, day_number: n, exercises, workout_notes: notes });

  const upperLowerDays = [
    dayOf(1, 'Upper A', [
      ex('Barbell Bench Press', 4, '6-8', 8, 150, 'Top set @ RPE 8, back-off sets -10%'),
      ex('Chest-Supported Row', 4, '8-10', 8, 90),
      ex('Seated Dumbbell Shoulder Press', 3, '8-10', 8, 90),
      ex('Lat Pulldown', 3, '10-12', 8, 75),
      ex('Cable Lateral Raise', 3, '12-15', 9, 45),
      ex('EZ-Bar Curl', 2, '10-12', 9, 60),
      ex('Rope Triceps Pushdown', 2, '10-12', 9, 60),
    ], 'Warm up: 5 min bike + band pull-aparts. Bench 3 ramp-up sets.'),
    dayOf(2, 'Lower B', [
      ex('Romanian Deadlift', 4, '6-8', 8, 120, '3s eccentric'),
      ex('Bulgarian Split Squat', 3, '8-10 / leg', 8, 90, 'Left knee — stop 1 rep shy if it pinches'),
      ex('Leg Press', 3, '10-12', 8, 120),
      ex('Seated Hamstring Curl', 3, '10-12', 9, 60),
      ex('Standing Calf Raise', 4, '10-12', 9, 60),
      ex('Hanging Knee Raise', 3, '12', 8, 45),
    ]),
    dayOf(3, 'Upper B', [
      ex('Incline Dumbbell Press', 4, '8-10', 8, 120),
      ex('Weighted Pull-up', 4, '5-7', 8, 150, 'Add 2.5 lb when you hit 7 on all sets'),
      ex('Single-Arm Cable Row', 3, '10-12', 8, 75),
      ex('Machine Chest Fly', 3, '12-15', 9, 60),
      ex('Face Pull', 3, '15', 8, 45),
      ex('Hammer Curl', 3, '10-12', 9, 60),
    ]),
    dayOf(4, 'Lower A', [
      ex('Back Squat', 4, '5-7', 8, 180, 'Belt on top set only'),
      ex('Barbell Hip Thrust', 3, '8-10', 8, 90),
      ex('Walking Lunge', 3, '10 / leg', 8, 90),
      ex('Leg Extension', 3, '12-15', 9, 60),
      ex('Seated Calf Raise', 3, '12-15', 9, 60),
      ex('Cable Crunch', 3, '12-15', 8, 45),
    ]),
  ];

  const programs = [
    {
      id: IDS.programs.upperLower,
      title: 'Upper / lower, block 2',
      description: '4-day upper/lower split for Jordan\'s fat-loss phase. Double progression on accessories, RPE-based top sets on the main lifts.',
      duration_weeks: 12, difficulty: 'intermediate', category: 'hypertrophy', days_per_week: 4,
      workouts: upperLowerDays, is_template: false, image_url: null, team_id: null,
      schedule_mode: 'repeat', equipment: ['Full Gym'], tags: ['Upper/lower', 'Fat loss'], estimated_session_length: '60',
      progression_model: 'double', deload_frequency: 'every_6', rest_day_notes: '8-10k steps, mobility 10 min.',
      ...meta(at(40, 16, 0)),
    },
    {
      id: IDS.programs.fatLoss,
      title: 'Fat loss foundations — 3-day full body',
      description: 'Simple full-body template for new clients in a deficit. Big compound lifts, short sessions, step targets on rest days.',
      duration_weeks: 8, difficulty: 'beginner', category: 'fat_loss', days_per_week: 3,
      workouts: [
        dayOf(1, 'Full Body A', [ex('Goblet Squat', 3, '10-12', 7), ex('Push-up', 3, 'AMRAP', 8, 60), ex('Lat Pulldown', 3, '10-12', 8), ex('Romanian Deadlift', 3, '10', 7), ex('Farmer Carry', 3, '40 m', null)]),
        dayOf(2, 'Full Body B', [ex('Leg Press', 3, '12', 7), ex('Incline Dumbbell Press', 3, '10', 8), ex('Chest-Supported Row', 3, '12', 8), ex('Walking Lunge', 2, '10 / leg', 7), ex('Cable Crunch', 3, '15', 8)]),
        dayOf(3, 'Full Body C', [ex('Back Squat', 3, '8', 7), ex('Seated Dumbbell Shoulder Press', 3, '10', 8), ex('Single-Arm Cable Row', 3, '12', 8), ex('Barbell Hip Thrust', 3, '12', 8), ex('Assault Bike Intervals', 1, '8 rounds', null, 0)]),
      ],
      is_template: true, image_url: null, team_id: null, schedule_mode: 'repeat',
      ...meta(at(90, 11, 0)),
    },
    {
      id: IDS.programs.recomp,
      title: 'Recomp — 4-day upper/lower',
      description: 'Moderate volume, maintenance calories. Built for clients chasing body composition over scale weight.',
      duration_weeks: 12, difficulty: 'intermediate', category: 'hypertrophy', days_per_week: 4,
      workouts: [
        dayOf(1, 'Upper Strength', [ex('Barbell Bench Press', 4, '5', 8, 150), ex('Chest-Supported Row', 4, '8', 8), ex('Seated Dumbbell Shoulder Press', 3, '8', 8), ex('Lat Pulldown', 3, '10', 8), ex('Face Pull', 3, '15', 8, 45)]),
        dayOf(2, 'Lower Strength', [ex('Back Squat', 4, '5', 8, 180), ex('Romanian Deadlift', 3, '8', 8, 120), ex('Leg Press', 3, '10', 8), ex('Standing Calf Raise', 3, '12', 9, 60)]),
        dayOf(3, 'Upper Hypertrophy', [ex('Incline Dumbbell Press', 3, '10-12', 9), ex('Single-Arm Cable Row', 3, '12', 9), ex('Cable Lateral Raise', 4, '15', 9, 45), ex('Hammer Curl', 3, '12', 9, 60), ex('Overhead Triceps Extension', 3, '12', 9, 60)]),
        dayOf(4, 'Lower Hypertrophy', [ex('Barbell Hip Thrust', 4, '10', 9), ex('Bulgarian Split Squat', 3, '10 / leg', 8), ex('Seated Hamstring Curl', 3, '12', 9, 60), ex('Leg Extension', 3, '15', 9, 60), ex('Hanging Knee Raise', 3, '12', 8, 45)]),
      ],
      is_template: false, image_url: null, team_id: null, schedule_mode: 'repeat',
      ...meta(at(80, 9, 30)),
    },
    {
      id: IDS.programs.hybrid,
      title: 'Hybrid — strength + half marathon',
      description: '3 lifts + 3 runs per week. Lower-body lifting volume is kept low so the long run stays fresh.',
      duration_weeks: 16, difficulty: 'intermediate', category: 'athletic', days_per_week: 3,
      workouts: [
        dayOf(1, 'Upper', [ex('Barbell Bench Press', 4, '5', 8, 150), ex('Weighted Pull-up', 4, '5', 8, 150), ex('Seated Dumbbell Shoulder Press', 3, '8', 8), ex('Face Pull', 3, '15', 8, 45)]),
        dayOf(2, 'Lower (strength)', [ex('Back Squat', 3, '5', 7, 180, 'Keep 2-3 reps in reserve — long run Saturday'), ex('Romanian Deadlift', 3, '6', 7, 120), ex('Standing Calf Raise', 3, '15', 8, 60)]),
        dayOf(3, 'Lower (power)', [ex('Front Squat', 3, '3', 7, 150), ex('Walking Lunge', 2, '8 / leg', 7), ex('Hanging Knee Raise', 3, '12', 8, 45)]),
      ],
      is_template: false, image_url: null, team_id: null, schedule_mode: 'repeat',
      ...meta(at(35, 12, 0)),
    },
    {
      id: IDS.programs.leanBulk,
      title: 'Lean bulk — push / pull / legs',
      description: '5-day PPL rotation with a deadlift focus. Small surplus, progressive overload on every lift.',
      duration_weeks: 16, difficulty: 'advanced', category: 'hypertrophy', days_per_week: 5,
      workouts: [
        dayOf(1, 'Push', [ex('Barbell Bench Press', 4, '6-8', 8, 150), ex('Incline Dumbbell Press', 3, '8-10', 8), ex('Seated Dumbbell Shoulder Press', 3, '10', 8), ex('Cable Lateral Raise', 4, '15', 9, 45), ex('Rope Triceps Pushdown', 3, '12', 9, 60)]),
        dayOf(2, 'Pull', [ex('Conventional Deadlift', 4, '3-5', 8, 180, 'Film top set from the side'), ex('Weighted Pull-up', 4, '6-8', 8, 150), ex('Chest-Supported Row', 3, '10', 8), ex('Face Pull', 3, '15', 8, 45), ex('EZ-Bar Curl', 3, '10', 9, 60)]),
        dayOf(3, 'Legs', [ex('Back Squat', 4, '6', 8, 180), ex('Romanian Deadlift', 3, '8', 8, 120), ex('Leg Press', 3, '12', 9), ex('Seated Hamstring Curl', 3, '12', 9, 60), ex('Standing Calf Raise', 4, '12', 9, 60)]),
        dayOf(4, 'Upper', [ex('Incline Dumbbell Press', 4, '8', 8), ex('Single-Arm Cable Row', 4, '10', 8), ex('Machine Chest Fly', 3, '15', 9, 60), ex('Hammer Curl', 3, '12', 9, 60), ex('Overhead Triceps Extension', 3, '12', 9, 60)]),
        dayOf(5, 'Lower', [ex('Front Squat', 4, '6', 8, 150), ex('Barbell Hip Thrust', 3, '10', 8), ex('Walking Lunge', 3, '10 / leg', 8), ex('Leg Extension', 3, '15', 9, 60)]),
      ],
      is_template: false, image_url: null, team_id: null, schedule_mode: 'repeat',
      ...meta(at(60, 13, 15)),
    },
    {
      id: IDS.programs.strength,
      title: 'Strength block — squat / bench / deadlift',
      description: '4-day powerlifting block. Week 1-3 volume, week 4 intensity, autoregulated with RPE.',
      duration_weeks: 12, difficulty: 'advanced', category: 'strength', days_per_week: 4,
      workouts: [
        dayOf(1, 'Squat + Bench', [ex('Back Squat', 5, '3', 8, 240), ex('Barbell Bench Press', 5, '4', 8, 180), ex('Chest-Supported Row', 3, '10', 8)]),
        dayOf(2, 'Deadlift', [ex('Conventional Deadlift', 4, '3', 8, 240), ex('Front Squat', 3, '5', 7, 150), ex('Hanging Knee Raise', 3, '12', 8, 45)]),
        dayOf(3, 'Bench volume', [ex('Barbell Bench Press', 4, '6', 8, 150), ex('Incline Dumbbell Press', 3, '10', 8), ex('Weighted Pull-up', 4, '5', 8, 150), ex('Rope Triceps Pushdown', 3, '12', 9, 60)]),
        dayOf(4, 'Squat + Deadlift', [ex('Back Squat', 3, '5', 7, 180), ex('Romanian Deadlift', 3, '6', 8, 120), ex('Barbell Hip Thrust', 3, '8', 8), ex('Farmer Carry', 3, '40 m', null)]),
      ],
      is_template: false, image_url: null, team_id: null, schedule_mode: 'repeat',
      ...meta(at(100, 10, 0)),
    },
    {
      id: IDS.programs.hotelGym,
      title: 'Hotel gym — dumbbells to 50 lb',
      description: 'Travel template: dumbbells up to 50 lb, a bench and a cable stack. Tempo and pauses replace load.',
      duration_weeks: 2, difficulty: 'intermediate', category: 'custom', days_per_week: 3,
      workouts: [
        dayOf(1, 'Full Body A', [ex('Goblet Squat', 4, '12', 8, 90, '3s down, 1s pause'), ex('Incline Dumbbell Press', 4, '10-12', 8), ex('Chest-Supported Row', 4, '12', 8), ex('Romanian Deadlift', 3, '12', 8, 90, 'Use 50s, 4s eccentric')]),
        dayOf(2, 'Full Body B', [ex('Bulgarian Split Squat', 4, '10 / leg', 8), ex('Seated Dumbbell Shoulder Press', 3, '12', 8), ex('Single-Arm Cable Row', 3, '12', 8), ex('Push-up', 3, 'AMRAP', 9, 60)]),
        dayOf(3, 'Full Body C', [ex('Walking Lunge', 3, '12 / leg', 8), ex('Barbell Hip Thrust', 3, '15', 8, 90, 'Single DB on hips'), ex('Lat Pulldown', 3, '12', 8), ex('Hammer Curl', 3, '12', 9, 60)]),
      ],
      is_template: true, image_url: null, team_id: null, schedule_mode: 'repeat',
      ...meta(at(15, 19, 0)),
    },
  ];

  // ---------------------------------------------------------------------------
  // NUTRITION PLANS
  // ---------------------------------------------------------------------------
  const food = (name, portion, weight_g, calories, protein, carbs, fats) => ({
    name, food_name: name, portion, amount: portion, amount_household: portion, weight_g, calories, protein, carbs, fats,
  });
  const meal = (name, time, foods, instructions = '', extra = {}) => ({
    name, meal_name: name, time, foods, instructions,
    calories: Math.round(foods.reduce((s, f) => s + f.calories, 0)),
    protein: r1(foods.reduce((s, f) => s + f.protein, 0)),
    carbs: r1(foods.reduce((s, f) => s + f.carbs, 0)),
    fats: r1(foods.reduce((s, f) => s + f.fats, 0)),
    image_url: null,
    ...extra,
  });

  const priyaMeals = [
    meal('Greek yogurt bowl', '7:30 AM', [
      food('Greek yogurt, 0% fat', '1 cup (250 g)', 250, 148, 25.8, 9, 1),
      food('Mixed berries', '3/4 cup', 100, 50, 0.7, 12, 0.3),
      food('Nut-free granola', '1/4 cup', 30, 135, 3, 19.5, 5),
      food('Honey', '2 tsp', 10, 30, 0, 8, 0),
    ], 'Layer yogurt, berries and granola. Granola must be peanut-free (check label — "may contain" is a no).'),
    meal('Chicken rice bowl', '12:30 PM', [
      food('Chicken breast, grilled', '6 oz cooked', 170, 280, 53, 0, 6),
      food('Jasmine rice, cooked', '3/4 cup', 150, 195, 4, 43, 0.4),
      food('Mixed greens & cucumber', '1 cup', 100, 20, 1, 4, 0),
      food('Avocado', '1/3 medium', 50, 80, 1, 4, 7),
      food('Soy-ginger dressing', '1 tbsp', 15, 40, 0.5, 3, 3),
    ], 'Batch-cook chicken and rice Sunday. Swap chicken for tofu on vegetarian days (+5 g fat).'),
    meal('Shake and a banana', '4:00 PM', [
      food('Whey isolate', '1 scoop (30 g)', 30, 110, 25, 1, 0.5),
      food('Banana', '1 medium', 120, 105, 1.3, 27, 0.4),
      food('Skim milk', '1 cup', 250, 85, 8.5, 12, 0.2),
    ], 'Pre-shift snack. Keep a shaker and a scoop in your locker.'),
    meal('Salmon and potatoes', '7:00 PM', [
      food('Atlantic salmon', '5 oz raw', 150, 312, 30, 0, 19.5),
      food('Baby potatoes, roasted', '1 1/2 cups', 250, 190, 5, 42, 0.3),
      food('Green beans', '1 cup', 120, 37, 2, 8, 0.1),
      food('Olive oil', '1 tsp', 5, 40, 0, 0, 4.5),
    ], 'Sheet-pan: potatoes 25 min at 425°F, add salmon and beans for the last 12 min.'),
  ];

  const jordanMeals = [
    meal('Eggs & oats', '6:45 AM', [
      food('Whole eggs', '2 large', 100, 143, 12.6, 0.7, 9.5),
      food('Egg whites', '3/4 cup', 180, 94, 19.6, 1.3, 0.3),
      food('Rolled oats', '1/2 cup dry', 40, 150, 5, 27, 2.5),
      food('Blueberries', '1/2 cup', 75, 43, 0.5, 11, 0.2),
    ]),
    meal('Turkey wrap', '12:00 PM', [
      food('Turkey breast, sliced', '6 oz', 170, 185, 40, 2, 2),
      food('High-fiber tortilla', '1 large', 70, 170, 7, 30, 4.5),
      food('Hummus', '2 tbsp', 30, 70, 2, 4, 5),
      food('Spinach & tomato', '1 cup', 80, 18, 1.5, 3, 0.2),
      food('Apple', '1 medium', 180, 95, 0.5, 25, 0.3),
    ]),
    meal('Pre-workout snack', '4:30 PM', [
      food('Rice cakes', '3 cakes', 27, 105, 2, 22, 0.8),
      food('Whey isolate', '1 scoop', 30, 110, 25, 1, 0.5),
      food('Banana', '1 small', 100, 89, 1.1, 23, 0.3),
    ]),
    meal('Steak & sweet potato', '7:30 PM', [
      food('Sirloin steak', '7 oz cooked', 200, 410, 58, 0, 19),
      food('Sweet potato', '1 large', 250, 215, 4, 50, 0.3),
      food('Broccoli', '1.5 cups', 140, 48, 4, 9.5, 0.5),
      food('Butter', '1 tsp', 5, 36, 0, 0, 4),
      food('Greek yogurt, 0% fat (dessert)', '3/4 cup', 170, 100, 17.5, 6, 0.7),
    ]),
  ];

  const marcusMeals = [
    meal('Big breakfast', '7:00 AM', [food('Whole eggs', '4 large', 200, 286, 25, 1.4, 19), food('Sourdough toast', '2 slices', 100, 260, 9, 50, 2), food('Orange juice', '1 cup', 250, 112, 1.7, 26, 0.5)]),
    meal('Chicken burrito bowl', '12:30 PM', [food('Chicken thigh', '8 oz cooked', 225, 450, 55, 0, 24), food('White rice', '1.5 cups', 280, 365, 7, 80, 0.8), food('Black beans', '1/2 cup', 86, 114, 7.6, 20, 0.5), food('Salsa & cheese', '1/4 cup', 50, 110, 6, 3, 8)]),
    meal('Mass shake', '4:00 PM', [food('Whey', '2 scoops', 60, 240, 48, 6, 3), food('Oats, blended', '3/4 cup', 60, 228, 8, 40, 4), food('Whole milk', '2 cups', 488, 300, 16, 24, 16)]),
    meal('Salmon pasta', '8:00 PM', [food('Salmon', '6 oz', 170, 354, 34, 0, 22), food('Pasta, cooked', '2 cups', 280, 440, 16, 86, 2.6), food('Pesto', '1 tbsp', 16, 80, 1, 1, 8)]),
  ];

  const nutritionPlans = [
    {
      id: IDS.nutrition.priya,
      title: 'Fat loss — 1,850 kcal (peanut-free)',
      description: 'High-protein fat-loss plan built around Priya\'s shift schedule. 100% peanut-free — check every label.',
      tracking_mode: 'macros', status: 'active', client_id: C.priya, plan_type: 'structured', pdf_file_url: null,
      calories: 1850, protein_g: 160, carbs_g: 190, fats_g: 50, start_date: daysAgo(10),
      meals: priyaMeals, rest_day_meals: [],
      hydration: { daily_liters: 2.5, notes: 'Extra 500 ml on night shifts.' },
      coach_notes: { text: 'Peanut allergy: no peanuts, PB, peanut oil or "may contain" products. Swap PB snacks for yogurt or the shake.' },
      client_notes: null, shopping_list: ['Greek yogurt 0%', 'Mixed berries (frozen)', 'Nut-free granola', 'Chicken breast', 'Jasmine rice', 'Salmon fillets', 'Baby potatoes', 'Green beans', 'Whey isolate', 'Bananas', 'Skim milk'],
      supplements: [{ name: 'Creatine monohydrate', dosage: '5 g', timing: 'Any time' }, { name: 'Vitamin D3', dosage: '2,000 IU', timing: 'With breakfast' }],
      assigned_clients: [C.priya], notes: null, is_template: false, template_category: null, is_draft: false, ai_generated: false,
      goal: 'fat_loss', diet: 'peanut_free', team_id: null,
      ...meta(at(10, 15, 30)),
    },
    {
      id: IDS.nutrition.jordan,
      title: 'Fat loss — 2,150 kcal',
      description: 'Moderate deficit, ~0.75% bodyweight loss per week. Higher carbs around training.',
      tracking_mode: 'macros', status: 'active', client_id: C.jordan, plan_type: 'structured', pdf_file_url: null,
      calories: 2150, protein_g: 190, carbs_g: 210, fats_g: 62, start_date: daysAgo(clientDefs[0].startDaysAgo),
      meals: jordanMeals, rest_day_meals: [],
      hydration: { daily_liters: 3.5 }, coach_notes: { text: 'Hit protein first, then carbs around training.' }, client_notes: null,
      shopping_list: ['Eggs', 'Egg whites', 'Rolled oats', 'Turkey breast', 'Tortillas', 'Sirloin', 'Sweet potatoes', 'Broccoli', 'Whey isolate'],
      supplements: [{ name: 'Creatine monohydrate', dosage: '5 g', timing: 'Any time' }],
      assigned_clients: [C.jordan], notes: null, is_template: false, template_category: null, is_draft: false, ai_generated: false,
      goal: 'fat_loss', diet: null, team_id: null,
      ...meta(at(clientDefs[0].startDaysAgo, 12, 0)),
    },
    {
      id: IDS.nutrition.marcus,
      title: 'Lean bulk — 3,250 kcal',
      description: '~300 kcal surplus. Aiming for 0.5 lb/week gain.',
      tracking_mode: 'macros', status: 'active', client_id: C.marcus, plan_type: 'structured', pdf_file_url: null,
      calories: 3250, protein_g: 200, carbs_g: 380, fats_g: 100, start_date: daysAgo(56),
      meals: marcusMeals, rest_day_meals: [], hydration: { daily_liters: 4 }, coach_notes: null, client_notes: null,
      shopping_list: [], supplements: [], assigned_clients: [C.marcus], notes: null, is_template: false, template_category: null,
      is_draft: false, ai_generated: true, goal: 'muscle_gain', diet: null, team_id: null,
      ...meta(at(58, 10, 0)),
    },
    {
      id: IDS.nutrition.recompTemplate,
      title: 'High-protein recomp — 2,000 kcal',
      description: 'Maintenance-calorie template for recomp clients. 1 g protein per lb goal bodyweight.',
      tracking_mode: 'macros', status: 'template', client_id: null, plan_type: 'structured', pdf_file_url: null,
      calories: 2000, protein_g: 155, carbs_g: 200, fats_g: 65, start_date: null,
      meals: [jordanMeals[0], priyaMeals[1], priyaMeals[2], priyaMeals[3]], rest_day_meals: [], hydration: null, coach_notes: null,
      client_notes: null, shopping_list: [], supplements: [], assigned_clients: [C.nia], notes: null,
      is_template: true, template_category: 'recomp', is_draft: false, ai_generated: false, goal: 'recomp', diet: null, team_id: null,
      ...meta(at(85, 9, 0)),
    },
    {
      id: IDS.nutrition.travelHabits,
      title: 'Travel habits — eating out',
      description: 'Habit-based targets for travel weeks: palm of protein each meal, 2 fists of veg, 1 drink max.',
      tracking_mode: 'habits', status: 'active', client_id: C.alicia, plan_type: 'structured', pdf_file_url: null,
      calories: null, protein_g: 130, carbs_g: null, fats_g: null, start_date: daysAgo(10),
      meals: [
        { name: 'Hotel breakfast', meal_name: 'Hotel breakfast', time: '8:00 AM', foods: [], habit_description: 'Eggs or Greek yogurt + fruit. Skip the pastries.' },
        { name: 'Client lunch', meal_name: 'Client lunch', time: '1:00 PM', foods: [], habit_description: 'Lean protein + salad. Dressing on the side.' },
        { name: 'Dinner out', meal_name: 'Dinner out', time: '8:00 PM', foods: [], habit_description: 'Fish or chicken, veg, one carb side. One glass of wine max.' },
      ],
      rest_day_meals: [], hydration: { daily_liters: 3 }, coach_notes: null, client_notes: null, shopping_list: [], supplements: [],
      assigned_clients: [C.alicia], notes: null, is_template: false, template_category: null, is_draft: false, ai_generated: false,
      goal: 'recomp', diet: null, team_id: null,
      ...meta(at(12, 21, 0)),
    },
  ];

  // ---------------------------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------------------------
  const messages = [];
  let msgN = 0;
  const msg = (key, sender, content, createdAt, extra = {}) => {
    msgN += 1;
    const c = clientById[C[key]];
    messages.push({
      id: `c5000000-0000-4000-8000-${String(msgN).padStart(12, '0')}`,
      client_id: c.id, team_id: null, client_name: c.name, sender, content,
      is_read: sender === 'coach' ? true : true, tag: null, is_pinned: false, is_broadcast: false,
      media_type: 'text', media_url: null, duration_seconds: null,
      ...meta(createdAt), ...extra,
    });
  };
  const unread = { is_read: false };

  // Jordan
  msg('jordan', 'coach', 'Great check-in Friday. You\'re right on pace — 0.9 lb/week average. Keep everything the same this week.', at(3, 9, 12), { tag: 'check_in' });
  msg('jordan', 'client', 'Thanks! Quick q — can I swap Upper B to Wednesday this week? Have a work dinner Thursday.', at(2, 18, 40));
  msg('jordan', 'coach', 'Yep, totally fine. Just keep 48h before Lower A.', at(2, 19, 5));
  msg('jordan', 'client', 'Lower B done this morning 💪 RDLs felt way better with the 3s eccentric. Hamstrings are cooked.', minutesAgo(52), unread);
  // Priya
  msg('priya', 'coach', 'Hey Priya! Updated your plan — the PB snack is now Greek yogurt or a shake. All peanut-free.', at(8, 10, 0), { tag: 'nutrition' });
  msg('priya', 'client', 'Thank you!! Sorry, this week is crazy with nights.', at(8, 22, 14));
  msg('priya', 'coach', 'No stress at all. Even 2 sessions this week is a win. Want to hop on a quick call Friday?', at(4, 12, 30));
  // Lena
  msg('lena', 'coach', 'How\'s the new role going? Saw your last couple of check-ins — want to talk about a 3-day version of the plan?', at(1, 8, 45));
  msg('lena', 'client', 'That would honestly help. Mornings are the only time I have.', at(1, 20, 3));
  // Sam
  msg('sam', 'coach', 'Nice 10k on Saturday! What was the time?', at(2, 9, 0));
  msg('sam', 'client', '47:52 — a PR! But I skipped both lower days, calves were too wrecked. Should I move squats to after the long run?', minutesAgo(185), unread);
  // Alicia
  msg('alicia', 'coach', 'Safe travels! I loaded the hotel gym template into your app as a backup.', at(5, 7, 30), { tag: 'training' });
  msg('alicia', 'client', 'In Lisbon until Sunday — the hotel gym only has dumbbells up to 50 lb and a cable stack. Can we swap the barbell work?', minutesAgo(95), unread);
  msg('alicia', 'client', 'Also no bench press, just an adjustable bench 😅', minutesAgo(93), unread);
  // Marcus
  msg('marcus', 'coach', 'Film your top deadlift set from the side this week, knee height if you can.', at(4, 16, 0), { tag: 'training' });
  msg('marcus', 'client', 'Deadlift form check — top set at 455. Felt my hips shoot up on rep 3.', minutesAgo(240), {
    ...unread, media_type: 'video', media_url: `storage://uploads/${coach}/client/${C.marcus}/deadlift-455-side.mp4`, duration_seconds: 38,
  });
  msg('marcus', 'client', 'Bar speed felt good on reps 1-2 though.', minutesAgo(238), unread);
  // Devon
  msg('devon', 'coach', 'Opener for the bench single: 295, then go by feel. You\'ve got this.', at(1, 7, 15));
  msg('devon', 'client', 'HIT 315 FOR A SINGLE 🎉🎉 New bench PR. Moved faster than 305 last week.', minutesAgo(30), unread);
  // Tasha
  msg('tasha', 'coach', 'Four weeks, zero missed sessions. That\'s a perfect month — proud of you!', at(1, 11, 0), { tag: 'motivation' });
  msg('tasha', 'client', 'Thank you!! 205 deadlift felt light 😤', at(1, 13, 22));
  // Chris
  msg('chris', 'coach', 'Welcome aboard, Chris! Your assessment is booked for today at 5:30. Bring your training shoes.', at(2, 10, 0));
  msg('chris', 'client', 'See you then — a bit nervous but excited.', at(2, 12, 18));
  // Nia
  msg('nia', 'coach', 'Your block wraps up next week! Let\'s chat about what\'s next — I\'d love to run a strength phase with you.', at(3, 14, 0));
  msg('nia', 'client', 'Yes! Definitely want to keep going. Booked the call 🙌', at(3, 16, 45));

  // ---------------------------------------------------------------------------
  // COACHING SESSIONS
  // ---------------------------------------------------------------------------
  const sessions = [];
  let sesN = 0;
  const sess = (key, title, dayOffset, time, duration, type, status = 'scheduled', notes = null) => {
    sesN += 1;
    const c = clientById[C[key]];
    const [h, m] = time.split(':').map(Number);
    const end = new Date(2000, 0, 1, h, m + duration);
    const date = daysFromNow(dayOffset);
    sessions.push({
      id: `c6000000-0000-4000-8000-${String(sesN).padStart(12, '0')}`,
      client_id: c.id, client_name: c.name, title, date, time, end_time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      duration_minutes: duration, type, status, notes,
      meeting_link: type === 'video_call' || type === 'strategy' || type === 'check_in' ? 'https://meet.google.com/abc-defg-hij' : null,
      google_event_id: null, zoom_meeting_id: null, zoom_join_url: null, zoom_start_url: null, zoom_password: null,
      ...meta(at(Math.max(1, -dayOffset + 3), 10, 0)),
    });
  };
  sess('nia', 'Renewal call — block 3 planning', 0, '09:00', 30, 'strategy');
  sess('alicia', 'Travel check-in — hotel gym swap', 0, '12:30', 20, 'video_call');
  sess('chris', 'Onboarding assessment', 0, '17:30', 45, 'assessment', 'scheduled', 'Movement screen, baseline photos, finalize program.');
  sess('lena', 'Weekly check-in call', -1, '10:00', 30, 'check_in', 'completed', 'Moving to a 3-day plan. Mornings only.');
  sess('marcus', 'Deadlift form review', 2, '08:00', 30, 'video_call');
  sess('jordan', 'Mid-block review (week 6)', 3, '11:00', 30, 'video_call');
  sess('priya', 'Re-engagement call', 3, '15:00', 20, 'video_call', 'scheduled', 'Shift-friendly schedule + snack swaps.');
  sess('devon', 'Meet prep — attempt selection', 5, '10:00', 45, 'strategy');
  sess('tasha', 'Monthly progress review', -4, '18:00', 30, 'video_call', 'completed');
  sess('sam', 'Race plan check-in', -6, '07:30', 30, 'check_in', 'completed');
  sess('jordan', 'Week 4 check-in', -11, '11:00', 30, 'video_call', 'completed');
  sess('nia', 'Progress photos + measurements', -14, '09:00', 30, 'in_person', 'completed');
  sess('alicia', 'Program walkthrough', -13, '12:00', 30, 'video_call', 'no_show');

  // ---------------------------------------------------------------------------
  // WORKOUT SESSIONS (Jordan history + Sam skipped)
  // ---------------------------------------------------------------------------
  const workoutSessions = [];
  const weekIdx = (d) => (d.getDay() === 0 ? 6 : d.getDay() - 1); // Mon=0
  const baseLoads = {
    'Barbell Bench Press': 185, 'Chest-Supported Row': 60, 'Seated Dumbbell Shoulder Press': 55, 'Lat Pulldown': 150,
    'Cable Lateral Raise': 20, 'EZ-Bar Curl': 70, 'Rope Triceps Pushdown': 60, 'Romanian Deadlift': 205,
    'Bulgarian Split Squat': 40, 'Leg Press': 360, 'Seated Hamstring Curl': 110, 'Standing Calf Raise': 180,
    'Hanging Knee Raise': 0, 'Incline Dumbbell Press': 65, 'Weighted Pull-up': 25, 'Single-Arm Cable Row': 70,
    'Machine Chest Fly': 120, 'Face Pull': 50, 'Hammer Curl': 35, 'Back Squat': 235, 'Barbell Hip Thrust': 225,
    'Walking Lunge': 40, 'Leg Extension': 130, 'Seated Calf Raise': 90, 'Cable Crunch': 80,
  };
  let wsN = 0;
  for (let n = 21; n >= 1; n--) {
    const d = addDays(day0, -n);
    const wi = weekIdx(d);
    if (![0, 1, 3, 5].includes(wi)) continue; // trains Mon, Tue, Thu, Sat
    const progIdx = wi % upperLowerDays.length;
    const day = upperLowerDays[progIdx];
    const weekNum = Math.floor((21 - n) / 7);
    wsN += 1;
    const completed = new Date(d); completed.setHours(6, 55 + (wsN % 3) * 4, 0, 0);
    workoutSessions.push({
      id: `c7000000-0000-4000-8000-${String(wsN).padStart(12, '0')}`,
      client_id: C.jordan, program_id: IDS.programs.upperLower, program_name: 'Upper / lower, block 2',
      workout_name: day.day_name, workout_day_name: day.day_name, workout_day_index: progIdx,
      scheduled_date: ymd(d), status: 'completed', notes: null,
      completed_at: completed.toISOString(), duration_minutes: 52 + (wsN % 4) * 4,
      session_rating: [4, 5, 4, 5, 5][wsN % 5], session_note: ['Felt strong', 'Good pump today', 'Tired but got it done', 'Smooth session', ''][wsN % 5],
      exercises: day.exercises,
      exercise_logs: day.exercises.map((e) => {
        const load = (baseLoads[e.name] ?? 50) + weekNum * 5;
        const reps = parseInt(e.reps, 10) || 10;
        return {
          exercise_name: e.name,
          sets_completed: Array.from({ length: e.sets }, (_, s) => ({ set_number: s + 1, weight: load, reps: Math.max(1, reps + 1 - (s > 1 ? 1 : 0)), completed: true })),
        };
      }),
      team_id: null, description: null,
      ...meta(completed.toISOString()),
    });
  }
  // Sam skipped his two lower days this week
  [lastDow(2, 1), lastDow(4, 1)].forEach((n, k) => {
    wsN += 1;
    workoutSessions.push({
      id: `c7000000-0000-4000-8000-${String(wsN).padStart(12, '0')}`,
      client_id: C.sam, program_id: IDS.programs.hybrid, program_name: 'Hybrid — strength + half marathon',
      workout_name: k === 0 ? 'Lower (strength)' : 'Lower (power)', workout_day_name: k === 0 ? 'Lower (strength)' : 'Lower (power)',
      workout_day_index: k + 1, scheduled_date: daysAgo(n), status: 'skipped', notes: 'Calves too sore after 10k',
      completed_at: null, duration_minutes: null, session_rating: null, session_note: null, exercises: [], exercise_logs: [],
      team_id: null, description: null, ...meta(at(n, 20, 0)),
    });
  });

  // ---------------------------------------------------------------------------
  // DAILY LOGS, HABITS, GOALS, FOOD LOGS (Jordan — portal persona)
  // ---------------------------------------------------------------------------
  const dailyLogs = [];
  for (let n = 14; n >= 0; n--) {
    const d = addDays(day0, -n);
    const wi = weekIdx(d);
    const trained = [0, 1, 3, 5].includes(wi) && n > 0;
    dailyLogs.push({
      id: `c8000000-0000-4000-8000-${String(15 - n).padStart(12, '0')}`,
      client_id: C.jordan, date: ymd(d),
      workout_done: trained,
      meals_logged: n === 0 ? 2 : 4,
      water_glasses: n === 0 ? 4 : 7 + (n % 3),
      steps: n === 0 ? 6240 : 9000 + Math.round(rand() * 3500),
      habits_completed: n === 0 ? ['Protein at every meal'] : ['10k steps', 'Protein at every meal', '8 glasses of water'].slice(0, 2 + (n % 2)),
      focus_tasks: [], win_of_day: n === 1 ? 'Lower B done before work' : null,
      mindset_score: 4, streak_days: 15 - n, description: null,
      ...meta(at(n, 21, 0)),
    });
  }

  const habits = [
    ['10k steps', '🚶'], ['Protein at every meal', '🍗'], ['8 glasses of water', '💧'], ['Lights out by 10:30', '😴'],
  ].map(([name, emoji], i) => ({
    id: `c9000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    client_id: C.jordan, team_id: null, name, emoji, frequency: 'daily', days_of_week: [], is_active: true,
    ...meta(at(30, 9, 0)),
  }));
  const habitCompletions = [];
  habits.forEach((h, hi) => {
    for (let n = 13; n >= 0; n--) {
      if ((n + hi) % 5 === 0 && n !== 0) continue; // occasional miss
      if (n === 0 && hi !== 1) continue;
      habitCompletions.push({
        id: `ca000000-0000-4000-8000-${String(hi * 20 + n + 1).padStart(12, '0')}`,
        habit_id: h.id, client_id: C.jordan, team_id: null, date: daysAgo(n), completed: true,
        ...meta(at(n, 20, 0)),
      });
    }
  });

  const goals = [
    { name: 'Reach 185 lb', goal_type: 'numeric', target_value: 185, current_value: 195.6, unit: 'lb', progress_pct: 35, due_date: daysFromNow(60) },
    { name: 'Bench 225 × 5', goal_type: 'numeric', target_value: 225, current_value: 205, unit: 'lb', progress_pct: 62, due_date: daysFromNow(45) },
    { name: 'Hit protein 6/7 days', goal_type: 'simple', progress_pct: 86, due_date: null },
  ].map((g, i) => ({
    id: `cb000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    client_id: C.jordan, team_id: null, calories_target: null, protein_target: null, carbs_target: null, fat_target: null,
    calories_current: null, protein_current: null, carbs_current: null, fat_current: null, notes: null, status: 'active',
    target_value: null, current_value: null, unit: null,
    ...g, ...meta(at(35, 10, 0)),
  }));
  goals.push({
    id: 'cb000000-0000-4000-8000-000000000010', client_id: C.priya, team_id: null, name: 'Lose 10 lb by December', goal_type: 'numeric',
    due_date: daysFromNow(70), target_value: 158, current_value: 167.4, unit: 'lb', progress_pct: 8, calories_target: null, protein_target: null,
    carbs_target: null, fat_target: null, calories_current: null, protein_current: null, carbs_current: null, fat_current: null,
    notes: null, status: 'active', ...meta(at(10, 10, 0)),
  });

  const foodLogs = [];
  const logMeal = (n, mealId, items) => items.forEach((f, i) => foodLogs.push({
    id: `cc000000-0000-4000-8000-${String(foodLogs.length + 1).padStart(12, '0')}`,
    client_id: C.jordan, nutrition_plan_id: IDS.nutrition.jordan, logged_date: daysAgo(n), meal_name: mealId,
    food_item_id: null, food_name: f.name, serving_quantity: f.weight_g, serving_unit: 'g',
    calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats, notes: null, logged_by: 'client', coach_daily_notes: null,
    ...meta(at(n, mealId === 'breakfast' ? 7 : mealId === 'lunch' ? 12 : mealId === 'snacks' ? 16 : 19, 10 + i)),
  }));
  logMeal(0, 'breakfast', jordanMeals[0].foods);
  logMeal(0, 'lunch', jordanMeals[1].foods);
  logMeal(1, 'breakfast', jordanMeals[0].foods);
  logMeal(1, 'lunch', jordanMeals[1].foods);
  logMeal(1, 'snacks', jordanMeals[2].foods);
  logMeal(1, 'dinner', jordanMeals[3].foods);

  // ---------------------------------------------------------------------------
  // PAYMENTS + INVOICES
  // ---------------------------------------------------------------------------
  const payments = [];
  let payN = 0;
  for (const c of clients) {
    const months = Math.min(3, Math.floor(clientDefs.find((d) => C[d.key] === c.id).startDaysAgo / 30) + 1);
    for (let k = 0; k < months; k++) {
      payN += 1;
      const n = k * 30 + 2;
      payments.push({
        id: `cd000000-0000-4000-8000-${String(payN).padStart(12, '0')}`,
        client_id: c.id, client_name: c.name, amount: c.monthly_rate, status: 'paid', type: 'monthly',
        description: 'Monthly coaching', stripe_payment_id: `pi_demo_${payN}`, due_date: daysAgo(n), paid_date: daysAgo(n),
        ...meta(at(n, 9, 0)),
      });
    }
  }
  payments.push({
    id: 'cd000000-0000-4000-8000-000000000100', client_id: C.nia, client_name: 'Nia Brooks', amount: 747, status: 'pending', type: 'upsell',
    description: 'Renewal — 12-week strength block (3 × $249)', stripe_payment_id: null, due_date: daysFromNow(6), paid_date: null,
    ...meta(at(1, 15, 0)),
  });
  payments.push({
    id: 'cd000000-0000-4000-8000-000000000101', client_id: C.lena, client_name: 'Lena Fischer', amount: 249, status: 'failed', type: 'monthly',
    description: 'Monthly coaching — card declined', stripe_payment_id: 'pi_demo_failed', due_date: daysAgo(2), paid_date: null,
    ...meta(at(2, 9, 0)),
  });

  const invoices = [];
  const inv = (num, key, amount, status, issueN, dueN, desc, extra = {}) => {
    const c = clientById[C[key]];
    invoices.push({
      id: `ce000000-0000-4000-8000-${String(num).padStart(12, '0')}`,
      invoice_number: `INV-${1030 + num}`, client_id: c.id, client_name: c.name, client_email: c.email,
      description: desc, amount, status, type: 'recurring', issue_date: daysAgo(issueN), due_date: dueN >= 0 ? daysAgo(dueN) : daysFromNow(-dueN),
      paid_date: status === 'paid' ? daysAgo(Math.max(0, dueN - 1)) : null, stripe_invoice_id: null, stripe_payment_url: null,
      notes: null, recurring_interval: 'monthly', payment_method: status === 'paid' ? 'card' : null,
      ...meta(at(issueN, 9, 0)), ...extra,
    });
  };
  inv(1, 'jordan', 249, 'paid', 32, 30, 'Online coaching — September');
  inv(2, 'devon', 299, 'paid', 31, 29, 'Online coaching + meet prep — September');
  inv(3, 'marcus', 249, 'paid', 30, 28, 'Online coaching — September');
  inv(4, 'tasha', 249, 'paid', 21, 19, 'Online coaching — first month');
  inv(5, 'sam', 229, 'paid', 29, 27, 'Hybrid coaching — September');
  inv(6, 'lena', 249, 'overdue', 9, 2, 'Online coaching — October');
  inv(7, 'nia', 747, 'sent', 1, -6, 'Renewal — 12-week strength block', { type: 'package', recurring_interval: null });
  inv(8, 'chris', 199, 'draft', 0, -14, 'Online coaching — first month');
  inv(9, 'alicia', 249, 'viewed', 4, -3, 'Online coaching — October');

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------
  const notif = (i, recipient, category, type, title, body, createdAt, extra = {}) => ({
    id: `cf000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    recipient_id: recipient, category, type, title, body, client_name: extra.client_name ?? null, action_label: extra.action_label ?? null,
    link: extra.link ?? null, is_read: extra.is_read ?? false, is_dismissed: false,
    related_client_id: extra.related_client_id ?? null, related_checkin_id: extra.related_checkin_id ?? null,
    priority: extra.priority ?? 'normal', ...meta(createdAt),
  });
  const notifications = [
    notif(1, coach, 'message', 'new_message', 'Devon Carter sent a message', 'HIT 315 FOR A SINGLE 🎉🎉 New bench PR.', minutesAgo(30), { client_name: 'Devon Carter', related_client_id: C.devon, link: '/messages', action_label: 'Reply' }),
    notif(2, coach, 'message', 'new_message', 'Marcus Bell sent a form video', 'Deadlift form check — top set at 455.', minutesAgo(240), { client_name: 'Marcus Bell', related_client_id: C.marcus, link: '/messages', action_label: 'Watch' }),
    notif(3, coach, 'atrisk', 'missed_checkin', 'Priya Shah hasn\'t checked in for 9 days', 'Last check-in was her baseline. Consider reaching out.', at(0, 7, 0), { client_name: 'Priya Shah', related_client_id: C.priya, priority: 'high', link: `/client-profile?id=${C.priya}` }),
    notif(4, coach, 'checkin', 'checkin_submitted', 'Jordan Reyes submitted a check-in', 'Down 0.8 lb this week · 98% compliance', at(4, 18, 20), { client_name: 'Jordan Reyes', related_client_id: C.jordan, link: '/checkin-review', is_read: true }),
    notif(5, coach, 'payment', 'payment_failed', 'Payment failed — Lena Fischer', '$249.00 · card declined', at(2, 9, 5), { client_name: 'Lena Fischer', related_client_id: C.lena, priority: 'high', link: '/invoicing' }),
    notif(6, coach, 'schedule', 'sessions_today', '3 sessions today', 'Nia 9:00 · Alicia 12:30 · Chris 5:30', at(0, 6, 30)),
    notif(7, coach, 'ai', 'insight', 'Lena\'s adherence dropped 4 weeks in a row', 'Training compliance fell from 94% to 52%.', at(1, 8, 0), { client_name: 'Lena Fischer', related_client_id: C.lena, is_read: true }),
    notif(20, IDS.jordanUser, 'message', 'new_message', 'Coach Myles replied', 'Yep, totally fine. Just keep 48h before Lower A.', at(2, 19, 5), { is_read: false, link: '/portal/messages' }),
    notif(21, IDS.jordanUser, 'checkin', 'checkin_reviewed', 'Your check-in was reviewed', 'Great check-in Friday. You\'re right on pace.', at(3, 9, 12), { is_read: true, link: '/portal/checkin' }),
  ];

  // ---------------------------------------------------------------------------
  // MISC: leads, community, challenges, badges, forms, settings, profiles
  // ---------------------------------------------------------------------------
  const leads = [
    ['Maya Lopez', 'instagram', 'call_booked', 249, 'Fat loss after baby #2', 1, 82],
    ['Ben Turner', 'referral', 'proposal_sent', 299, 'Powerlifting meet prep', 3, 74, 'Referred by Devon'],
    ['Olivia Park', 'website', 'new_lead', 199, 'General fitness', 0, 55],
    ['Ethan Cole', 'tiktok', 'dmd', 249, 'Lean bulk', 6, 40],
  ].map(([name, source, stage, value, goal, n, score, notes], i) => ({
    id: `d2000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: null, instagram: `@${name.split(' ')[0].toLowerCase()}lifts`, location: null,
    source, stage, offer_tier: 'one_on_one', call_date: stage === 'call_booked' ? daysFromNow(2) : null, call_time: stage === 'call_booked' ? '18:00' : null,
    call_link: null, deal_value: value, goal, notes: notes || null, lost_reason: null, converted_client_id: null, lead_score: score,
    last_contact_date: at(n, 12, 0), follow_up_date: at(-2, 9, 0), follow_up_note: null, stage_changed_at: at(n, 12, 0), tags: [], activity_log: [], pinned_note: null,
    ...meta(at(n + 4, 12, 0)),
  }));

  const communityPosts = [
    {
      id: 'd3000000-0000-4000-8000-000000000001', author_id: coach, author_name: 'Coach Myles', author_avatar: null, coach_id: coach, group_id: null,
      is_anonymous: false, is_coach: true, is_pinned: true, is_announcement: true,
      content: 'October step challenge is live! 🚶 10k a day, every day. Leaderboard updates nightly — Tasha is already in the lead.',
      media_urls: [], type: 'announcement', challenge_id: 'd4000000-0000-4000-8000-000000000001', reactions: { '🔥': 6, '💪': 4 }, comment_count: 3, is_hidden: false, likes: [],
      ...meta(at(5, 8, 0)),
    },
    {
      id: 'd3000000-0000-4000-8000-000000000002', author_id: C.devon, author_name: 'Devon Carter', author_avatar: null, coach_id: coach, group_id: null,
      is_anonymous: false, is_coach: false, is_pinned: false, is_announcement: false,
      content: 'Bench 315 single today. Two years ago I couldn\'t touch 225. Trust the process 🙏', media_urls: [], type: 'milestone', challenge_id: null,
      reactions: { '🎉': 9, '💪': 5 }, comment_count: 4, is_hidden: false, likes: [C.tasha, C.jordan], ...meta(minutesAgo(25)),
    },
    {
      id: 'd3000000-0000-4000-8000-000000000003', author_id: coach, author_name: 'Coach Myles', author_avatar: null, coach_id: coach, group_id: null,
      is_anonymous: false, is_coach: true, is_pinned: false, is_announcement: true,
      content: 'Reminder: check-ins are due by Sunday night. Photos in the same spot and lighting each week make the comparison way more useful.',
      media_urls: [], type: 'announcement', challenge_id: null, reactions: { '👍': 7 }, comment_count: 0, is_hidden: false, likes: [], ...meta(at(0, 7, 30)),
    },
  ];

  const challenges = [{
    id: 'd4000000-0000-4000-8000-000000000001', title: 'October 10k steps', description: '10,000 steps every day in October.', type: 'steps',
    goal: 310000, start_date: ymd(new Date(day0.getFullYear(), day0.getMonth(), 1)), end_date: ymd(new Date(day0.getFullYear(), day0.getMonth() + 1, 0)),
    is_active: true, participants: [C.jordan, C.tasha, C.nia, C.sam, C.alicia], emoji: '🚶', group_id: null, reward_badge: 'consistent_month', completed_count: 0,
    ...meta(at(6, 8, 0)),
  }];

  const clientBadges = [
    ['tasha', 'consistent_month', 1], ['devon', 'pr_hit', 0], ['jordan', 'perfect_week', 4], ['jordan', 'streak_7', 11], ['nia', 'goal_reached', 6],
  ].map(([key, badge, n], i) => ({
    id: `d5000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, client_id: C[key], client_name: clientById[C[key]].name,
    badge_key: badge, earned_date: daysAgo(n), notes: null, ...meta(at(n, 20, 0)),
  }));

  const checkInForms = [{
    id: IDS.checkInForm, name: 'Weekly check-in', description: 'Weight, photos, adherence and how the week felt.', frequency: 'weekly', due_day: 0,
    reminder_hours_before: 24, assign_to: 'all', assigned_client_ids: [], is_active: true, submission_count: checkIns.length,
    last_submission_date: at(0, 8, 0), settings: {},
    questions: [
      { id: 'q1', type: 'number', label: 'Morning weight (lb)', required: true },
      { id: 'q2', type: 'scale', label: 'Energy this week', min: 1, max: 10 },
      { id: 'q3', type: 'scale', label: 'Stress this week', min: 1, max: 10 },
      { id: 'q4', type: 'number', label: 'Average sleep (hours)' },
      { id: 'q5', type: 'percent', label: 'Training sessions completed (%)' },
      { id: 'q6', type: 'percent', label: 'Nutrition adherence (%)' },
      { id: 'q7', type: 'photos', label: 'Progress photos (front / side / back)' },
      { id: 'q8', type: 'text', label: 'Wins, struggles, questions for your coach' },
    ],
    ...meta(at(120, 10, 0)),
  }];

  const coachSettings = [{
    id: 'd6000000-0000-4000-8000-000000000001', coach_id: coach, zapier_webhook_url: null, zapier_events: [], zapier_connected: false,
    zapier_last_triggered: null, google_calendar_connected: false, google_calendar_id: 'primary', default_session_duration: 30, buffer_time: 10,
    auto_send_invites: true, working_hours_start: '07:00', working_hours_end: '18:30', zoom_connected: false, zoom_access_token: null,
    zoom_user_email: null, zoom_default_duration: 30, zoom_waiting_room: true, zoom_auto_record: false, calendly_connected: false,
    calendly_user_uri: null, calendly_scheduling_url: null, calendly_username: null, resend_connected: false, resend_from_email: null,
    resend_from_name: null, sendgrid_connected: false, sendgrid_from_email: null, sendgrid_from_name: null, sendgrid_auto_welcome: false,
    sendgrid_auto_checkin_reminder: false, sendgrid_auto_progress_report: false, sendgrid_auto_badge_email: false, description: null,
    ...meta(at(120, 10, 0)),
  }];

  const coachingPackages = [
    { name: '1:1 Online Coaching', price: 249, billing_type: 'monthly', duration_weeks: 0, enrolled_count: 8, color_theme: '#2563EB', description: 'Custom training + nutrition, weekly check-ins, unlimited messaging.' },
    { name: 'Meet Prep', price: 299, billing_type: 'monthly', duration_weeks: 16, enrolled_count: 1, color_theme: '#7C3AED', description: 'Peaking, attempt selection and meet-day handling.' },
    { name: '12-Week Transformation', price: 699, billing_type: 'one_time', duration_weeks: 12, enrolled_count: 3, color_theme: '#059669', description: 'Fixed-term block with progress photos and a final review call.' },
  ].map((p, i) => ({
    id: `d7000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, long_description: null, image_url: null, original_price: null,
    contract_type: 'month_to_month', contract_months: null, trial_days: 0, inclusions: {}, custom_inclusions: [], max_clients: 0,
    waitlist_enabled: false, visibility: 'public', auto_assign_program_id: null, auto_assign_nutrition_id: null, auto_welcome_message: null,
    auto_schedule_call: false, slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), testimonials: [], faqs: [], is_active: true, is_archived: false,
    total_revenue: p.price * p.enrolled_count * 2, stripe_price_id: null, ...p, ...meta(at(150 - i, 10, 0)),
  }));

  const ym = `${day0.getFullYear()}-${pad(day0.getMonth() + 1)}`;
  const profiles = [
    {
      id: coach, email: COACH_EMAIL, full_name: 'Myles Harris', role: 'user', subscription_tier: 'pro', billing_status: 'active',
      stripe_customer_id: 'cus_demo_coach', stripe_subscription_id: 'sub_demo_coach', stripe_price_id: 'price_demo_pro',
      subscription_renewal_date: daysFromNow(18), subscription_cancel_at_period_end: false,
      business_name: 'Harris Fitness Coaching', bio: 'Online strength & physique coach. Helping busy professionals get strong and lean without living in the gym.',
      website: 'https://harrisfitness.co', instagram: '@mylesharris.fit', specializations: 'Fat loss, strength, recomp',
      ai_generation_count: 23, ai_generation_month: ym, onboarding_complete: true, had_trial: true, phone: '(555) 010-2299', avatar_url: null,
      timezone: 'America/New_York', payment_method: 'card', coaching_style: 'balanced', coaching_specialties: ['fat_loss', 'strength', 'recomp'],
      coaching_experience: '5-10', current_client_count: '10-25', client_range: '10-25', certifications: 'NSCA-CSCS, Precision Nutrition L1',
      is_comped: false, trial_ends_at: null, past_due_since: null,
      created_at: at(400, 10, 0), updated_at: at(1, 10, 0),
    },
    {
      id: IDS.jordanUser, email: JORDAN_EMAIL, full_name: 'Jordan Reyes', role: 'client', subscription_tier: 'starter', billing_status: 'active',
      onboarding_complete: true, avatar_url: null, timezone: 'America/Los_Angeles',
      created_at: at(clientDefs[0].startDaysAgo, 12, 0), updated_at: at(1, 10, 0),
    },
  ];

  const store = {
    profiles,
    clients,
    check_ins: checkIns,
    weigh_ins: weighIns,
    exercise_library: exerciseLibrary,
    workout_programs: programs,
    nutrition_plans: nutritionPlans,
    messages,
    coaching_sessions: sessions,
    workout_sessions: workoutSessions,
    daily_logs: dailyLogs,
    habits,
    habit_completions: habitCompletions,
    goals,
    food_logs: foodLogs,
    payments,
    invoices,
    notifications,
    leads,
    community_posts: communityPosts,
    challenges,
    client_badges: clientBadges,
    check_in_forms: checkInForms,
    coach_settings: coachSettings,
    coaching_packages: coachingPackages,
    team_members: [],
    teams: [],
    white_label_settings: [],
  };

  // Auth users (supabase-js `User` shape)
  const users = {
    [coach]: {
      id: coach, aud: 'authenticated', role: 'authenticated', email: COACH_EMAIL,
      user_metadata: { full_name: 'Myles Harris' }, app_metadata: { provider: 'email', persona: 'coach' },
      created_at: profiles[0].created_at,
    },
    [IDS.jordanUser]: {
      id: IDS.jordanUser, aud: 'authenticated', role: 'authenticated', email: JORDAN_EMAIL,
      user_metadata: { full_name: 'Jordan Reyes' }, app_metadata: { provider: 'email', persona: 'client' },
      created_at: profiles[1].created_at,
    },
  };

  return { store, users, ids: IDS };
}

/**
 * Canned Edge Function responses. Keyed by function name; a function receives
 * the request body. Unknown functions resolve to {}.
 */
export function buildFunctionHandlers(seed) {
  const { store } = seed;
  return {
    validateSubscription: () => ({ allowed: true, current: store.clients.length, limit: 75 }),
    validateInviteToken: () => ({ valid: true }),
    getPushPublicKey: () => ({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }),
    googleCalendarProxy: () => ({ events: [] }),
    searchFoods: () => ({ foods: [], results: [] }),
    stripeGetDashboard: () => ({
      mrr: store.clients.reduce((s, c) => s + (c.monthly_rate || 0), 0),
      balance: { available: 1842.5, pending: 498 },
      recentCharges: [],
      subscriptions: [],
    }),
    aiCheckInInsights: (body) => {
      if (body.action === 'programSuggestions') {
        return { suggestions: [
          { title: 'Add a back-off set on bench', detail: 'Top set RPE has been ≤ 8 for 3 weeks — add 1 × 8 at -10%.', type: 'training' },
          { title: 'Keep calories the same', detail: 'Losing ~0.9 lb/week, right in the target range.', type: 'nutrition' },
        ] };
      }
      const name = body.clientName || body.checkIn?.client_name || 'Client';
      return {
        summary: `${name} had a consistent week: training and nutrition compliance are high, sleep averaged ~7.5h and weight continues to trend down about 0.8 lb/week.`,
        flags: ['Hunger reported mid-week', 'Left knee — monitor split squats'],
        suggested_response: `Awesome week ${name.split(' ')[0]}! You're right on pace. Keep everything the same and let's add 10 minutes of walking after dinner on the hungry days.`,
        sentiment: 'positive',
      };
    },
    aiProgressInsights: (body) => ({
      text: 'Weight is trending down ~0.8 lb/week with strength holding steady — a textbook fat-loss phase. Sleep and step count are the biggest levers right now.',
      summary: 'On track — steady loss, strength maintained.',
      highlights: ['5.8 lb down in 6 weeks', 'Bench up 10 lb', '98% session completion'],
      concerns: ['Mid-week hunger'],
      recommendations: ['Keep calories the same', 'Add a back-off set on bench'],
      action: body.action,
    }),
    aiBusinessInsights: (body) => {
      if (body.action === 'clientAlerts') return { alerts: [] };
      if (body.action === 'interventionPlan') {
        return { plan: 'Book a 15-minute call, simplify to a 3-day plan for the next 2 weeks, and switch to a daily 1-line check-in.', text: 'Book a 15-minute call and simplify the plan for 2 weeks.' };
      }
      return { insights: [
        { title: 'Renewal opportunity', detail: 'Nia\'s block ends in 6 days — she has asked about a strength phase.', priority: 'high' },
        { title: 'Two clients slipping', detail: 'Lena and Priya account for most of this week\'s missed sessions.', priority: 'medium' },
      ] };
    },
    aiNutritionInsights: (body) => ({
      text: body.action === 'weeklyInsight' ? 'Strong week — you hit your protein target 6 of 7 days. Keep it up!' : 'Aim for a palm-sized protein portion at every meal.',
      swaps: [{ name: 'Turkey breast', portion: '6 oz', note: 'leaner' }, { name: 'Tofu, firm', portion: '8 oz', note: 'vegetarian' }],
    }),
    aiMessageAssistant: () => ({
      reply: 'Great question! Let\'s move squats to Sunday so you have 24h after the long run.',
      text: 'Great question! Let\'s move squats to Sunday so you have 24h after the long run.',
      suggestions: ['Love this — keep it up!', 'Let\'s jump on a quick call this week.'],
    }),
    claudeAssistant: () => ({ text: 'Here is a summary of your roster: 8 clients on track, 2 need attention (Lena, Priya).', reply: 'Here is a summary of your roster.' }),
    sendEmailNotification: () => ({ sent: true }),
    sendClientInvite: () => ({ sent: true }),
    sendInvoiceReminder: () => ({ sent: true }),
    stripeCheckout: () => ({ url: '/subscription?checkout=demo' }),
    createPortalSession: () => ({ url: '/subscription' }),
    savePushSubscription: () => ({ ok: true }),
    storePushSubscription: () => ({ ok: true }),
  };
}
