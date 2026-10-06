// HTML-escape any value before interpolating it into an email template or
// other HTML. Every user- or coach-controlled string must pass through this.
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Safe single-line subject: strip CR/LF (header injection) and cap length.
export function safeSubject(value, max = 150) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}
