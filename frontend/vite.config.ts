import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
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
