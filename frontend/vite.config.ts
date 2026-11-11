import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

function excludeProductionMockWorker(): Plugin {
  let workerPath: string | undefined
  return {
    name: 'exclude-production-mock-worker',
    apply: 'build',
    configResolved(config) {
      if (config.env.VITE_USE_MOCK !== 'true') {
        workerPath = resolve(config.root, config.build.outDir, 'mockServiceWorker.js')
      }
    },
    closeBundle() {
      // Vite copies public assets outside the Rollup output bundle.
      if (workerPath) rmSync(workerPath, { force: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), excludeProductionMockWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  build: {
    // Even small font subsets must be files: the production CSP uses font-src 'self'.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand'],
          codemirror: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/lint',
            '@codemirror/commands',
            '@codemirror/autocomplete',
            '@codemirror/search',
            '@lezer/highlight',
          ],
        },
      },
    },
  },
})
