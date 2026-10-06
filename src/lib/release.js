/**
 * What build is running. Values are inlined at build time by vite.config.js
 * (commit from the CI environment or `git rev-parse`, branch, build time).
 * Shown in Settings and attached to every error report.
 */
/* global __APP_RELEASE__ */
const injected = typeof __APP_RELEASE__ !== 'undefined' ? __APP_RELEASE__ : null;

export const RELEASE = {
  commit: injected?.commit || 'dev',
  shortCommit: (injected?.commit || 'dev').slice(0, 7),
  branch: injected?.branch || null,
  builtAt: injected?.builtAt || null,
  environment: injected?.environment || (import.meta.env?.DEV ? 'development' : 'production'),
  buildId: injected?.buildId || null,
};

export const releaseLabel = () =>
  `${RELEASE.shortCommit}${RELEASE.branch && RELEASE.branch !== 'main' ? ` (${RELEASE.branch})` : ''}`;
