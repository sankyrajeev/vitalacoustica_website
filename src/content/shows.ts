import type { GearId } from './gear'

// Show photos. Hotspots are percentages of the image width/height pointing at gear.
// TODO: confirm captions/venues with Vital Acoustica.

export type Hotspot = { gear: GearId; x: number; y: number }

export type ShowPhoto = {
  id: string
  src: string // base name in /public/shows, without -800/-1600.webp
  width: number
  height: number
  title: string
  place: string
  hotspots: Hotspot[]
}

export const photos: ShowPhoto[] = [
  {
    id: 'park-dusk',
    src: 'park-dusk',
    width: 1600,
    height: 1201,
    title: 'Sunset set',
    place: 'The Park, Bangalore',
    hotspots: [
      { gear: 'v10p', x: 14.3, y: 42.6 },
      { gear: 'matrix', x: 25.3, y: 41.3 },
      { gear: 'trefoil', x: 31.5, y: 44.6 },
      { gear: 'hex', x: 22.3, y: 53 },
      { gear: 'dotbar', x: 70, y: 49.6 },
      { gear: 'pixelbar', x: 73.5, y: 57.3 },
      { gear: 'b22', x: 23.5, y: 90.6 },
    ],
  },
  {
    id: 'club-full',
    src: 'club-full',
    width: 1600,
    height: 1066,
    title: 'A Night with Jovah',
    place: 'Club night',
    hotspots: [
      { gear: 'trefoil', x: 38.8, y: 42.8 },
      { gear: 'matrix', x: 54, y: 42.4 },
      { gear: 'hex', x: 21, y: 51.8 },
      { gear: 'sharpy', x: 65, y: 57.8 },
      { gear: 'truss', x: 82, y: 42 },
    ],
  },
  {
    id: 'park-blue',
    src: 'park-blue',
    width: 1600,
    height: 1201,
    title: 'Blue hour',
    place: 'The Park, Bangalore',
    hotspots: [
      { gear: 'v10p', x: 84, y: 40 },
      { gear: 'matrix', x: 75.5, y: 39.3 },
      { gear: 'trefoil', x: 68.8, y: 41.3 },
      { gear: 'hex', x: 20, y: 50.3 },
      { gear: 'dotbar', x: 28, y: 48.6 },
      { gear: 'pixelbar', x: 23.5, y: 55.3 },
      { gear: 'b22', x: 80, y: 88.6 },
    ],
  },
  {
    id: 'club-neon',
    src: 'club-neon',
    width: 1600,
    height: 1066,
    title: 'Neon and arches',
    place: 'Club night',
    hotspots: [{ gear: 'rope', x: 36.5, y: 40 }],
  },
]

/** Same camera position, lights down vs. the full rig firing — for the master fader. */
export const fader = {
  down: 'club-down',
  full: 'club-full',
  width: 1600,
  height: 1066,
  hotspots: photos[1].hotspots,
}
