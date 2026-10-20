import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

/**
 * The Journal's articles, built into the app only where there is no Worker to serve them: the dev
 * server, and review copies built with VITE_JOURNAL_EMBED (see src/journal/data.ts). Everywhere
 * else this module is empty, so a draft or an article in review can never end up in the public files.
 */
function journalEmbed(embed: boolean): Plugin {
  const id = 'virtual:journal-embedded'
  const file = 'server/generated/journal.json'
  return {
    name: 'journal-embed',
    resolveId: (source) => (source === id ? `\0${id}` : null),
    load(source) {
      if (source !== `\0${id}`) return null
      if (!embed || !existsSync(file)) return 'export default { generatedAt: "", articles: [] }'
      this.addWatchFile(file)
      return `export default ${readFileSync(file, 'utf8')}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), journalEmbed(command === 'serve' || !!process.env.VITE_JOURNAL_EMBED)],
  // clean URLs (/equipment/v10p) need absolute asset paths; the single-file preview
  // build (VITE_HASH_ROUTER=1) uses relative paths and #/ routes instead
  base: process.env.VITE_HASH_ROUTER === '1' ? './' : '/',
  build: {
    // the lazily-loaded 3D hero chunk (three.js) is intentionally large
    chunkSizeWarningLimit: 1200,
  },
}))
