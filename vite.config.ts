import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      // Two pages, two entries: the exhibition, and the tutorial document.
      // Relative paths resolve against the package root, which is where the
      // npm scripts run vite from.
      input: {
        index: 'index.html',
        tutorial: 'tutorial.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'three'
            if (id.includes('gsap')) return 'gsap'
            if (id.includes('react')) return 'react'
          }
        },
      },
    },
  },
})
