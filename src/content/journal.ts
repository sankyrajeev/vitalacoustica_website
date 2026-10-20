// Studio notes: shown on the Journal page under "From the studio". Every entry carries an honest
// label: 'Visual study' and 'Experiment' are our own concept work, not client productions.
// (The Journal's articles are Markdown files in content/journal/; see docs/journal.md.)

export type JournalEntry = {
  slug: string
  label: 'Visual study' | 'Experiment' | 'Field notes'
  title: string
  date: string
  body: string
  link?: { to: string; label: string }
  placeholder?: boolean
}

export const journal: JournalEntry[] = [
  {
    slug: 'resonance-form',
    label: 'Visual study',
    title: 'The Resonance Form',
    date: '2026',
    body:
      'A real-time sculpture made for this site: a single brushed-metal ribbon whose surface, light and structure change as you move through the page. It explores how sound, light and space can be expressed as one material.',
    link: { to: '/', label: 'See it on the homepage' },
  },
  {
    slug: 'stage-model',
    label: 'Experiment',
    title: 'An interactive stage model',
    date: '2026',
    body:
      'A 3D model of a typical Vital Acoustica stage with our d&b system and lighting rig. Orbit it, inspect each fixture, run the lighting desk, or fly through the venue as a drone.',
    link: { to: '/capabilities/production', label: 'Open the stage model' },
  },
  {
    slug: 'field-notes',
    label: 'Field notes',
    title: 'Notes from the next production',
    date: 'TBC',
    body: 'Space for a short write-up from a recent show: a system decision, a lighting idea, or something learned on site.',
    placeholder: true,
  },
]
