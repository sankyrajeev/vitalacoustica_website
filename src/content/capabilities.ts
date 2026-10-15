import type { GearId } from './gear'

// The four disciplines. `scene` drives how the Resonance Form behaves beside each module.

export type CapabilityId = 'sound' | 'light' | 'visuals' | 'production'

export type Capability = {
  id: CapabilityId
  index: string
  name: string
  statement: string
  summary: string
  covers: string[]
  approach: { title: string; body: string }[]
  gear: GearId[]
  image?: { src: string; alt: string }
}

export const capabilities: Capability[] = [
  {
    id: 'sound',
    index: '01',
    name: 'Sound',
    statement: 'Sound designed around the space, the performance and the people experiencing it.',
    summary:
      'We work with professional d&b audiotechnik systems and design each deployment around the room: where the audience stands, what the walls do, and what the music needs.',
    covers: ['Professional audio systems', 'System design', 'Deployment', 'Tuning and alignment', 'Operation'],
    approach: [
      { title: 'Read the room', body: 'Dimensions, surfaces, audience area and neighbours shape the system before any box is chosen.' },
      { title: 'Design the system', body: 'Tops and subwoofers are placed for even coverage, with sub arrays arranged to control energy where it isn’t wanted.' },
      { title: 'Tune on site', body: 'The system is time-aligned and tuned in the venue, then listened to with the room full, not empty.' },
    ],
    gear: ['v10p', 'b22', 'art915', 'dm3', 'cdj', 'djm', 'di'],
    image: { src: 'park-dusk', alt: 'Open-air stage with d&b tops on stands and subwoofers at the front' },
  },
  {
    id: 'light',
    index: '02',
    name: 'Light',
    statement: 'Light that shapes architecture, creates atmosphere and directs attention.',
    summary:
      'Lighting is composed, not simply rigged. We choose fixtures for what they do in a specific space and programme them to the music and the architecture.',
    covers: ['Lighting design', 'Programming', 'Control', 'Fixture selection', 'Spatial composition'],
    approach: [
      { title: 'Compose', body: 'Symmetry, depth and restraint first. Colour is chosen for the room, often a single family such as red and amber.' },
      { title: 'Select', body: 'Beams, retros, matrix panels and LED lines, each placed for a reason rather than to fill truss.' },
      { title: 'Programme', body: 'Looks are built to the music, with movement and intensity following the shape of a set.' },
    ],
    gear: ['sharpy', 'trefoil', 'hex', 'matrix', 'dotbar', 'pixelbar', 'rope'],
    image: { src: 'club-full', alt: 'Brick-arched room lit in red from behind the booth' },
  },
  {
    id: 'visuals',
    index: '03',
    name: 'Visuals',
    statement: 'Moving images, generative forms and immersive environments developed with intention.',
    summary:
      'Projection mapping and generative visuals are a growing part of our practice. We are developing this work through studies and experiments, and will show completed productions here as they happen.',
    covers: ['Projection mapping', 'Generative visuals', 'Visual content', 'Experimental installations'],
    approach: [
      { title: 'Surface', body: 'Start from the architecture or object being mapped: its geometry decides the content, not the other way round.' },
      { title: 'Material', body: 'Generative systems built to sit inside the lighting palette rather than compete with it.' },
      { title: 'Study', body: 'New ideas are tested as studies first. You can see them in the Journal, clearly labelled as such.' },
    ],
    gear: ['matrix'],
  },
  {
    id: 'production',
    index: '04',
    name: 'Production',
    statement: 'The planning, integration and execution that bring the creative direction into reality.',
    summary:
      'Technical coordination from first site visit to load-out: structure, power, rigging, system deployment and the running of the show.',
    covers: ['Technical coordination', 'Stage and truss integration', 'System deployment', 'Production execution'],
    approach: [
      { title: 'Plan', body: 'Drawings, schedules and a clear brief for every crew member before arrival.' },
      { title: 'Build', body: 'Truss, fixtures and systems integrated cleanly, with cabling and safeties that stay out of sight.' },
      { title: 'Run', body: 'An operator for every discipline during the show, and a load-out that leaves the venue as found.' },
    ],
    gear: ['truss'],
    image: { src: 'park-blue', alt: 'Open-air stage at blue hour with its lighting wings and truss posts' },
  },
]

export const capabilityById = (id: string) => capabilities.find((c) => c.id === id)

export const process = [
  { title: 'Understand the brief', body: 'What should the audience feel, and what does success look like for you?' },
  { title: 'Assess the venue', body: 'Site visit or drawings: dimensions, power, rigging points, access and restrictions.' },
  { title: 'Develop the approach', body: 'A creative and technical direction that answers the brief and suits the space.' },
  { title: 'Plan systems and production', body: 'Equipment, crew, schedule and documentation, agreed before load-in.' },
  { title: 'Execute, test and refine', body: 'Build, tune, programme and run the show, then review what we learned.' },
]
