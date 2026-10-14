import type { GearId } from './gear'

// Selected work. Only real productions with real photography go here.
// Anything not yet confirmed by Vital Acoustica is marked `TBC` and shown as such on the site.

export type Hotspot = { gear: GearId; x: number; y: number }

export type Media = {
  src: string // base name in /public/shows, without -800/-1600.webp
  width: number
  height: number
  alt: string
  hotspots?: Hotspot[]
}

export type Project = {
  slug: string
  title: string
  venue: string
  year: string
  scope: string[]
  summary: string
  hero: Media
  gallery: Media[]
  /** Case study sections. Empty strings render as clearly marked placeholders. */
  study: {
    objectives: string
    direction: string
    audio: string
    lighting: string
    planning: string
  }
  film: string // production film URL, empty until supplied
  placeholder?: boolean
}

export const TBC = 'TBC'

const parkDusk: Media = {
  src: 'park-dusk',
  width: 1600,
  height: 1201,
  alt: 'Open-air stage under a canopy at dusk: two DJs between symmetrical lighting wings, d&b tops on stands and subwoofers at the front',
  hotspots: [
    { gear: 'v10p', x: 14.3, y: 42.6 },
    { gear: 'matrix', x: 25.3, y: 41.3 },
    { gear: 'trefoil', x: 31.5, y: 44.6 },
    { gear: 'hex', x: 22.3, y: 53 },
    { gear: 'dotbar', x: 70, y: 49.6 },
    { gear: 'pixelbar', x: 73.5, y: 57.3 },
    { gear: 'b22', x: 23.5, y: 90.6 },
  ],
}

const parkBlue: Media = {
  src: 'park-blue',
  width: 1600,
  height: 1201,
  alt: 'The same open-air stage at blue hour, with the lighting wings in red and amber',
  hotspots: [
    { gear: 'v10p', x: 84, y: 40 },
    { gear: 'matrix', x: 75.5, y: 39.3 },
    { gear: 'trefoil', x: 68.8, y: 41.3 },
    { gear: 'hex', x: 20, y: 50.3 },
    { gear: 'dotbar', x: 28, y: 48.6 },
    { gear: 'pixelbar', x: 23.5, y: 55.3 },
    { gear: 'b22', x: 80, y: 88.6 },
  ],
}

export const clubFull: Media = {
  src: 'club-full',
  width: 1600,
  height: 1066,
  alt: 'A brick-arched room with the full lighting rig firing in red behind the DJ booth',
  hotspots: [
    { gear: 'trefoil', x: 38.8, y: 42.8 },
    { gear: 'matrix', x: 54, y: 42.4 },
    { gear: 'hex', x: 21, y: 51.8 },
    { gear: 'sharpy', x: 65, y: 57.8 },
    { gear: 'truss', x: 82, y: 42 },
  ],
}

export const clubDown: Media = {
  src: 'club-down',
  width: 1600,
  height: 1066,
  alt: 'The same room from the same position with the effects at rest: neon and house light only',
}

const clubNeon: Media = {
  src: 'club-neon',
  width: 1600,
  height: 1066,
  alt: 'Neon columns and arches framing the booth',
  hotspots: [{ gear: 'rope', x: 36.5, y: 40 }],
}

export const projects: Project[] = [
  {
    slug: 'the-park-bangalore',
    title: 'Open air at The Park',
    venue: 'The Park, Bangalore',
    year: '2025', // DUMMY
    scope: ['Sound', 'Light', 'Production'],
    summary:
      'An open-air stage under canopy. d&b point-source tops on stands with B22 subwoofers in front, and a symmetrical lighting composition built from matrix panels, trefoil fixtures, hex retros and LED bars.',
    hero: parkDusk,
    gallery: [parkDusk, parkBlue],
    study: {
      // DUMMY
      objectives:
        'An open-air night that had to feel like a club once the sun went down, with full-range sound for the dancefloor and nothing spilling far beyond the garden.',
      direction:
        'A mirrored composition either side of the booth: each wing pairs a diamond-hung matrix panel with a trefoil fixture above a hex retro, joined by an amber dot bar and red pixel lines. The palette stays within red and amber as the evening moves from dusk to blue hour.',
      audio:
        'd&b audiotechnik V10P tops on stands either side of the stage, with B22-SUB subwoofers ground-stacked at the front edge.',
      lighting:
        'Diamond-hung LED matrix panels, trefoil 3-blade fixtures, 7-cell hex retros, amber dot bars and red pixel bars, with haze to give the light volume under the canopy.',
      // DUMMY
      planning:
        'Load-in in the afternoon, system tuned before sunset, lighting focused at dusk. Power from the venue supply with our own distribution, and a crew of four through to load-out.',
    },
    film: '',
  },
  {
    slug: 'a-night-with-jovah',
    title: 'A Night with Jovah',
    venue: 'Bangalore', // DUMMY
    year: '2025', // DUMMY
    scope: ['Light', 'Production'],
    summary:
      'A brick-arched room lit from within. The same position photographed with the effects at rest and with the full rig running shows how much of the room the lighting composes.',
    hero: clubFull,
    gallery: [clubFull, clubDown, clubNeon],
    study: {
      // DUMMY
      objectives: 'Turn a brick-arched room into one red space around the artist, with the booth as the brightest point.',
      direction:
        'Red throughout, with neon columns framing the booth and the arches left to hold the light. Matrix panels and trefoil fixtures flank the sign; hex retros sit on the side truss towers.',
      // DUMMY
      audio: 'd&b audiotechnik V10P tops either side of the booth with B22-SUB subwoofers, tuned for the room with the crowd in.',
      lighting:
        'Trefoil 3-blade fixtures, LED matrix panels, hex retros on truss towers, beam moving heads at the booth corners and LED neon columns.',
      // DUMMY
      planning: 'Truss towers built in the afternoon, fixtures focused and looks programmed before doors, one operator each for sound and light.',
    },
    film: '',
  },
  {
    // DUMMY: replace with a real production after the photo shoot
    slug: 'placeholder',
    title: 'Your next show',
    venue: '',
    year: '',
    scope: ['Sound'],
    summary: 'A full d&b system and red-and-amber lighting for a club night. Photos from our next production go here.',
    hero: { src: '', width: 1600, height: 1066, alt: '' },
    gallery: [],
    study: { objectives: '', direction: '', audio: '', lighting: '', planning: '' },
    film: '',
    placeholder: true,
  },
]

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug)
