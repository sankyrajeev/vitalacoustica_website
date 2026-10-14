import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // the lazily-loaded 3D hero chunk (three.js) is intentionally large
    chunkSizeWarningLimit: 1200,
  },
})
