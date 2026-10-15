import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // clean URLs (/equipment/v10p) need absolute asset paths; the single-file preview
  // build (VITE_HASH_ROUTER=1) uses relative paths and #/ routes instead
  base: process.env.VITE_HASH_ROUTER === '1' ? './' : '/',
  build: {
    // the lazily-loaded 3D hero chunk (three.js) is intentionally large
    chunkSizeWarningLimit: 1200,
  },
})
