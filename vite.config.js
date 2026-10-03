import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    // Perf (Phase 11): the app previously emitted one ~4.3MB JS bundle. Split
    // the heavy, independently-cacheable vendor libraries into their own chunks
    // so they load in parallel and stay cached across deploys. No app behavior
    // change — this only affects how the bundle is partitioned.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/three/') || id.includes('three-')) return 'vendor-three';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'vendor-charts';
          if (id.includes('leaflet')) return 'vendor-maps';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
  plugins: [
    react(),
  ]
});