/* Minimal Vite config for the dark-mode audit harness: React + path alias
 * only, with the auth module aliased to a local mock. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

export default defineConfig({
  root,
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: [
      // mocks must resolve before the generic @/ alias
      { find: '@/lib/AuthContext', replacement: path.resolve(root, 'darkmode-audit/mocks/AuthContext.jsx') },
      { find: '@', replacement: path.resolve(root, 'src') },
    ],
  },
  server: { port: 5199, strictPort: true },
});
