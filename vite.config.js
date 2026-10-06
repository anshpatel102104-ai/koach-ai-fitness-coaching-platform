import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig } from 'vite'

// Release identification, inlined at build time (src/lib/release.js): the
// commit/branch from the CI environment (Cloudflare Workers Builds, GitHub
// Actions) or local git, plus build time. Shown in Settings → About and attached
// to every error report, so "what is deployed?" always has an answer.
function gitValue(cmd) {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null } catch { return null }
}
const env = process.env
const release = {
  commit: env.WORKERS_CI_COMMIT_SHA || env.CF_PAGES_COMMIT_SHA || env.GITHUB_SHA || gitValue('git rev-parse HEAD') || 'unknown',
  branch: env.WORKERS_CI_BRANCH || env.CF_PAGES_BRANCH || env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || gitValue('git rev-parse --abbrev-ref HEAD'),
  buildId: env.WORKERS_CI_BUILD_UUID || env.GITHUB_RUN_ID || null,
  builtAt: new Date().toISOString(),
  environment: env.VITE_APP_ENV || (env.WORKERS_CI_BRANCH && env.WORKERS_CI_BRANCH !== 'main' ? 'preview' : 'production'),
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  logLevel: 'error', // Suppress warnings, only show errors
  define: {
    __APP_RELEASE__: JSON.stringify(command === 'serve' ? { ...release, environment: 'development' } : release),
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  plugins: [
    react(),
  ]
}));
