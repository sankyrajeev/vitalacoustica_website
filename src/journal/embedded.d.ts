// The Journal's articles for builds without a Worker (vite.config.ts); empty everywhere else.
declare module 'virtual:journal-embedded' {
  const data: import('./types').JournalData
  export default data
}
