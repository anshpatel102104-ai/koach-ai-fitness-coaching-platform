const APP_URL = import.meta.env.VITE_APP_URL || '';

// Email-safe palette (inline hex is fine in email HTML).
const INK = '#111318';   // headings, primary button
const BODY = '#2B2F36';  // body copy
const GREY = '#5E6470';  // secondary text
const RULE = '#E2E4E8';  // hairlines
const SOFT = '#F4F5F7';  // quiet panels
const BLUE = '#0A5CFF';  // links

const coachName = (coach, fallback = 'Your coach') => coach?.full_name || coach?.name || fallback;

const wrap = (inner, extra = '') =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:${BODY};${extra}">${inner}</div>`;

const button = (href, label, margin = '24px 0') =>
  `<a href="${href}" style="display:inline-block;background:${INK};color:#FFFFFF;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:${margin};">${label}</a>`;

const footer = (coach, rule = true) =>
  `<p style="color:${GREY};font-size:14px;margin-top:32px;${rule ? `border-top:1px solid ${RULE};padding-top:16px;` : ''}">${coachName(coach)} · KOACH</p>`;

export const templates = {
  welcome: (client, coach) => ({
    subject: `Welcome to ${coach?.full_name || coach?.name || 'your'} coaching program`,
    html: wrap(`
      <h1 style="color:${INK};font-size:26px;margin:0 0 8px;">Welcome, ${client.name}</h1>
      <p style="color:${GREY};font-size:16px;margin:0 0 24px;">You're set up and ready to start.</p>
      <p style="font-size:16px;line-height:1.6;">Hi ${client.name}, glad to have you on board. Here's what happens next:</p>
      <div style="background:${SOFT};border-radius:12px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 12px;"><strong style="color:${INK};">1.</strong> Complete your first check-in</p>
        <p style="margin:0 0 12px;"><strong style="color:${INK};">2.</strong> Review your nutrition plan</p>
        <p style="margin:0;"><strong style="color:${INK};">3.</strong> Start your first workout</p>
      </div>
      <p style="font-size:16px;line-height:1.6;">Any questions, just reply to this email.</p>
      ${footer(coach)}
    `),
  }),

  weeklyCheckin: (client, coach) => ({
    subject: `${client.name}, your weekly check-in is due`,
    html: wrap(`
      <h2 style="color:${INK};margin:0 0 16px;">Hi ${client.name},</h2>
      <p style="line-height:1.6;">Your weekly check-in is due. It takes about two minutes, and it's what ${coachName(coach, 'your coach')} uses to adjust your plan for next week.</p>
      ${button(`${APP_URL}/portal`, 'Submit check-in')}
      ${footer(coach, false)}
    `),
  }),

  lowCompliance: (client, coach, complianceScore) => ({
    subject: `A few small wins for this week, ${client.name}`,
    html: wrap(`
      <h2 style="color:${INK};margin:0 0 16px;">Hi ${client.name},</h2>
      <p style="line-height:1.6;">${coachName(coach)} noticed your compliance was ${complianceScore}% this week. Everyone has weeks like that. Let's pick it back up together.</p>
      <div style="background:${SOFT};border-radius:12px;padding:20px 24px;margin:24px 0;">
        <p style="color:${INK};font-weight:600;margin:0 0 8px;">Three small wins for this week</p>
        <ul style="margin:0;padding-left:20px;line-height:1.7;"><li>Hit your protein target today</li><li>Complete at least one workout</li><li>Submit your check-in</li></ul>
      </div>
      ${button(`${APP_URL}/portal`, 'View my plan', '0')}
      ${footer(coach, false)}
    `),
  }),

  // Same argument order as the other templates: (client, coach, extra).
  badgeEarned: (client, coach, badge) => ({
    subject: `You earned the "${badge?.label || badge?.name}" badge`,
    html: wrap(`
      <div style="border:1px solid ${RULE};border-radius:12px;padding:32px;margin-bottom:32px;">
        <p style="color:${GREY};font-size:14px;margin:0 0 8px;">New badge</p>
        <h1 style="color:${INK};font-size:26px;margin:0;">${badge?.label || badge?.name}</h1>
        ${badge?.desc ? `<p style="color:${GREY};font-size:16px;margin:8px 0 0;">${badge.desc}</p>` : ''}
      </div>
      <p style="font-size:16px;line-height:1.6;">Well done, ${client.name}. You earned the <strong style="color:${INK};">${badge?.label || badge?.name}</strong> badge. Keep going.</p>
      ${footer(coach)}
    `),
  }),

  weeklyProgress: (client, coach, stats = {}) => ({
    subject: 'Your weekly progress report',
    html: wrap(`
      <h2 style="color:${INK};margin:0;">Weekly report: ${client.name}</h2>
      <div style="margin:24px 0;border-radius:12px;overflow:hidden;border:1px solid ${RULE};">
        <div style="padding:16px 20px;display:flex;justify-content:space-between;border-bottom:1px solid ${RULE};"><span style="color:${GREY};">Training compliance</span><strong style="color:${INK};">${stats.trainingCompliance ?? 0}%</strong></div>
        <div style="padding:16px 20px;display:flex;justify-content:space-between;border-bottom:1px solid ${RULE};"><span style="color:${GREY};">Nutrition compliance</span><strong style="color:${INK};">${stats.nutritionCompliance ?? 0}%</strong></div>
        <div style="padding:16px 20px;display:flex;justify-content:space-between;${stats.weightChange !== undefined ? `border-bottom:1px solid ${RULE};` : ''}"><span style="color:${GREY};">Check-in streak</span><strong style="color:${INK};">${stats.streak ?? 0} days</strong></div>
        ${stats.weightChange !== undefined ? `<div style="padding:16px 20px;display:flex;justify-content:space-between;"><span style="color:${GREY};">Weight change</span><strong style="color:${INK};">${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} lb</strong></div>` : ''}
      </div>
      <p style="line-height:1.6;">${stats.coachNote || 'Good week. Keep the same plan going.'}</p>
      ${button(`${APP_URL}/portal`, 'View full progress', '16px 0 0')}
      ${footer(coach)}
    `),
  }),

  missedCheckin: (client, coach, daysMissed) => ({
    subject: `Checking in, ${client.name}`,
    html: wrap(`
      <h2 style="color:${INK};margin:0 0 16px;">Hi ${client.name},</h2>
      <p style="line-height:1.6;">It's been ${daysMissed} days since your last check-in. ${coachName(coach)} wants to make sure you're doing okay and that the plan still fits.</p>
      ${button(`${APP_URL}/portal`, 'Submit check-in')}
      ${footer(coach, false)}
    `),
  }),

  sessionReminder: (client, coach, session) => ({
    subject: `Reminder: session tomorrow at ${session?.time}`,
    html: wrap(`
      <h2 style="color:${INK};margin:0;">Session reminder</h2>
      <div style="background:${SOFT};border-radius:12px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 8px;"><strong style="color:${INK};">Date:</strong> ${session?.date}</p>
        <p style="margin:0 0 8px;"><strong style="color:${INK};">Time:</strong> ${session?.time}</p>
        <p style="margin:0 0 8px;"><strong style="color:${INK};">Coach:</strong> ${coachName(coach)}</p>
        ${session?.zoom_url ? `<p style="margin:0;"><strong style="color:${INK};">Zoom:</strong> <a href="${session.zoom_url}" style="color:${BLUE};">Join meeting</a></p>` : ''}
      </div>
      ${footer(coach, false)}
    `),
  }),
};

export const TEMPLATE_OPTIONS = [
  { key: 'welcome',         label: 'Welcome email',          audience: 'client', desc: 'Sent when a new client is added' },
  { key: 'weeklyCheckin',   label: 'Weekly check-in nudge',  audience: 'client', desc: 'Asks clients to submit their check-in' },
  { key: 'lowCompliance',   label: 'Low compliance',         audience: 'client', desc: 'Re-engages clients whose compliance dropped' },
  { key: 'badgeEarned',     label: 'Badge earned',           audience: 'client', desc: 'Tells a client they earned a badge' },
  { key: 'weeklyProgress',  label: 'Weekly progress report', audience: 'client', desc: 'Weekly stats summary for the client' },
  { key: 'missedCheckin',   label: 'Missed check-in',        audience: 'client', desc: 'Follows up on a missing check-in' },
  { key: 'sessionReminder', label: 'Session reminder',       audience: 'client', desc: 'Reminds clients of an upcoming session' },
];
