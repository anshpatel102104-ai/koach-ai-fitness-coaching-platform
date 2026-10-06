import { differenceInDays, format, isValid } from 'date-fns';

export const SOURCE_LABELS = {
  instagram: 'Instagram', referral: 'Referral', store_purchase: 'Store purchase',
  website: 'Website', cold_outreach: 'Cold outreach', dm: 'DM',
  tiktok: 'TikTok', youtube: 'YouTube', other: 'Other',
};

export const sourceLabel = (source) => SOURCE_LABELS[source] || source || null;

export const money = (n) => `$${Number(n || 0).toLocaleString()}`;

export function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d : null;
}

export function shortDate(value, fmt = 'MMM d') {
  const d = safeDate(value);
  return d ? format(d, fmt) : null;
}

export function initialsOf(name = '') {
  return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/** "Contacted today" / "Contacted 4 days ago" / "Not contacted yet" */
export function lastContactLabel(lead) {
  const d = safeDate(lead?.last_contact_date);
  if (!d) return 'Not contacted yet';
  const days = differenceInDays(new Date(), d);
  if (days <= 0) return 'Contacted today';
  if (days === 1) return 'Contacted yesterday';
  return `Contacted ${days} days ago`;
}

export function daysInStage(lead) {
  const d = safeDate(lead?.stage_changed_at);
  return d ? differenceInDays(new Date(), d) : null;
}

export function isFollowUpOverdue(lead) {
  const d = safeDate(lead?.follow_up_date);
  return !!d && d < new Date();
}

export function scoreTone(score) {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'danger';
}

export function scoreText(score) {
  if (score >= 70) return 'Strong fit';
  if (score >= 40) return 'Follow up soon';
  return 'Gone cold, needs a nudge';
}
