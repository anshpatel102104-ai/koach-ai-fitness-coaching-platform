/**
 * Vite config for the design-preview harness (NOT used by the production build).
 *
 *   npx vite --config design-preview/vite.config.js      # interactive
 *   node design-preview/shoot.mjs                        # screenshots
 *
 * root = design-preview/ so its index.html is the SPA fallback for every route
 * (/clients, /portal/…); the real app is pulled in from ../src via the @ alias.
 * Port: env PREVIEW_PORT (default 5288), strict.
 */
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const here = import.meta.dirname;
const repoRoot = path.resolve(here, '..');

// tailwind.config.js `content` globs are relative to the cwd.
process.chdir(repoRoot);

const port = Number(process.env.PREVIEW_PORT) || 5288;

export default defineConfig({
  root: here,
  appType: 'spa',
  publicDir: path.join(repoRoot, 'public'),
  logLevel: 'error',
  // per-port dep cache so concurrent shoot.mjs runs don't race on optimizeDeps
  cacheDir: path.join(repoRoot, `node_modules/.vite-design-preview-${port}`),
  resolve: {
    alias: { '@': path.join(repoRoot, 'src') },
  },
  plugins: [react()],
  // Crawl the whole app up front so Vite doesn't discover a dependency mid-run
  // and force a full page reload while a screenshot is being taken.
  optimizeDeps: { entries: ['main.jsx', '../src/**/*.{js,jsx}'] },
  css: {
    postcss: {
      plugins: [tailwindcss(path.join(repoRoot, 'tailwind.config.js')), autoprefixer()],
    },
  },
  server: {
    port,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
});
