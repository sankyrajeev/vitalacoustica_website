import type { GearId } from './gear'

// The services, each with its own page under /capabilities/<id>.

export type CapabilityId = 'sound' | 'light' | 'visuals' | 'production' | 'installations'

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
    gear: ['v10p', 'b22', 'art915', 'd40', 'dm3', 'cdj', 'djm', 'di'],
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
    gear: ['sharpy', 'trefoil', 'hex', 'warcraft', 'matrix', 'dotbar', 'pixelbar', 'rope'],
    image: { src: 'club-full', alt: 'Brick-arched room lit in red from behind the booth' },
  },
  {
    id: 'visuals',
    index: '03',
    name: 'Visuals',
    statement: 'Moving images, generative forms and immersive environments developed with intention.',
    summary:
      'Real-time, audio-reactive and generative visuals for walls, suspended mesh and translucent screens, built in TouchDesigner. This work is in development, and we will show completed productions as they happen.',
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
    statement: 'Sound, light, visuals and systems, designed and run as one cohesive experience.',
    summary:
      'One brief, several disciplines, one production: audio, programmed lighting, DJ infrastructure, real-time visuals and the systems that connect them, from the first technical drawing to the final pack-down.',
    covers: ['Technical coordination', 'Stage and truss integration', 'System deployment', 'Production execution'],
    approach: [
      { title: 'Plan', body: 'Drawings, schedules and a clear brief for every crew member before arrival.' },
      { title: 'Build', body: 'Truss, fixtures and systems integrated cleanly, with cabling and safeties that stay out of sight.' },
      { title: 'Run', body: 'An operator for every discipline during the show, and a load-out that leaves the venue as found.' },
    ],
    gear: ['truss'],
    image: { src: 'park-blue', alt: 'Open-air stage at blue hour with its lighting wings and truss posts' },
  },
  {
    id: 'installations',
    index: '05',
    name: 'Installations',
    statement: 'Permanent sound and light for venues that want every night to feel like a show.',
    summary:
      'For clubs, bars, restaurants, lounges and event spaces that want a system of their own. We advise on what to install and where, drawing on what we learn every weekend running live shows: the right loudspeakers for the room, lighting that suits the space and the music, and control your own staff can run with confidence.',
    covers: ['Venue assessment', 'System design and specification', 'Equipment selection', 'Installation and commissioning', 'Staff handover and ongoing support'],
    approach: [
      { title: 'Understand the venue', body: 'How the space is used, who plays there, how loud it needs to get, and what the neighbours and the building allow.' },
      { title: 'Design and specify', body: 'Loudspeaker placement and coverage, lighting layout and control, drawn and costed before anything is ordered.' },
      { title: 'Install and hand over', body: 'The system is installed, tuned to the room and handed over with simple presets and training for your team, and we stay on call afterwards.' },
    ],
    gear: ['v10p', 'b22', 'd40', 'dm3', 'matrix', 'pixelbar', 'rope'],
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
