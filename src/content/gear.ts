// The hire inventory. Every item has a photo, a plain description and a spec table,
// and can be opened in the 3D stage model (positions in src/three/hotspots.ts).
//
// Photo sources are labelled honestly on the site:
//   'product' — manufacturer / supplier photo of the exact item
//   'show'    — cropped from a Vital Acoustica production photo
//   'model'   — render of our 3D stage model (until a photo is supplied)
// Specs marked as manufacturer data come from the maker's published sheets.

export type GearId = 'v10p' | 'b22' | 'sharpy' | 'matrix' | 'trefoil' | 'hex' | 'dotbar' | 'pixelbar' | 'rope' | 'truss'

export type GearGroup = 'Sound' | 'Lighting' | 'LED & visuals' | 'Structure'

export type Gear = {
  id: GearId
  group: GearGroup
  name: string
  maker?: string
  role: string
  /** one line for cards */
  about: string
  /** the full description on the item's page */
  description: string
  specs: [string, string][]
  specSource?: string
  photo: {
    file: string
    width: number
    height: number
    alt: string
    source: 'product' | 'show' | 'model'
    /** 'cover' fills the frame (photos with their own background); otherwise the item sits on a studio surface */
    fit?: 'cover'
  }
  /** the old one-line summary, still used in compact lists */
  spec: string
}

export const gear: Gear[] = [
  {
    id: 'v10p',
    group: 'Sound',
    name: 'V10P',
    maker: 'd&b audiotechnik',
    role: 'Main loudspeaker',
    about: 'Three-way point-source top. Wide, even coverage that stays clean at full club level.',
    description:
      'Our main tops. A compact three-way point source with two 10" drivers, a horn-loaded 8" midrange and a 1.4" compression driver on a rotatable horn, so it can stand upright or be laid on its side and still cover the room evenly. We run them on stands or flown, paired with B22 subwoofers.',
    specs: [
      ['Drivers', '2 × 10" LF · 8" MF · 1.4" HF'],
      ['Dispersion', '110° × 40° (rotatable horn)'],
      ['Max SPL', '139 dB'],
      ['Frequency response', '59 Hz – 18 kHz (−5 dB)'],
      ['Dimensions', '308 × 700 × 466 mm (W × H × D)'],
      ['Weight', '33 kg'],
    ],
    specSource: 'd&b audiotechnik',
    spec: '2 × 10" + 8" + 1.4" HF · 110° × 40° · 139 dB SPL max',
    photo: { file: 'v10p.webp', width: 435, height: 800, alt: 'd&b audiotechnik V10P loudspeaker, black cabinet with perforated steel grille', source: 'product' },
  },
  {
    id: 'b22',
    group: 'Sound',
    name: 'B22-SUB',
    maker: 'd&b audiotechnik',
    role: 'Subwoofer',
    about: 'Dual 18" bandpass subwoofer for the low end a kick drum needs.',
    description:
      'Dual 18" drivers in a bandpass cabinet: deep, controlled bass for techno and house. Ground-stacked in front of or beside the stage, and with three or more they can be set up as a cardioid array that keeps bass off the stage and away from the neighbours.',
    specs: [
      ['Drivers', '2 × 18" in a bandpass cabinet'],
      ['Arrays', 'Cardioid (CSA) in groups of three'],
      ['Dimensions', '1160 × 585 × 920 mm (W × H × D)'],
      ['Weight', '106 kg'],
    ],
    specSource: 'd&b audiotechnik',
    spec: '2 × 18" bandpass · cardioid-capable',
    photo: { file: 'b22.webp', width: 800, height: 522, alt: 'd&b audiotechnik B22-SUB subwoofer with recessed side handles', source: 'product' },
  },
  {
    id: 'sharpy',
    group: 'Lighting',
    name: 'Beam moving heads',
    role: 'Sharpy-style beams',
    about: 'Pencil-thin beams that cut through haze, moving in time with the music.',
    description:
      'Tight aerial beams on fast pan and tilt, hung from the front truss or set on the stage. We programme them to the set: fans, waves, crosses and single points over the crowd, run in red or amber.',
    specs: [
      ['Type', 'Beam moving head'],
      ['Mounting', 'Truss clamp or floor'],
      ['Control', 'DMX, programmed to the music'],
      ['Model', 'To be confirmed'],
    ],
    spec: 'Pencil-thin aerial beams · pan/tilt · run in red or amber',
    photo: { file: 'sharpy.webp', width: 900, height: 900, alt: 'Render from our stage model: beam moving heads under the truss, one red and two amber', source: 'model' },
  },
  {
    id: 'trefoil',
    group: 'Lighting',
    name: 'Retro 3-blade fan light',
    role: 'Effect light',
    about: 'Three LED petals around a bright centre lens, with a rotating head.',
    description:
      'A three-petal fixture with pixel-edged LED blades around a warm centre lens. The head rotates, so the petals sweep as the set builds. We usually pair two either side of the booth.',
    specs: [
      ['Head', 'Three LED petals and a centre lens'],
      ['Motion', 'Rotating head'],
      ['Control', 'DMX'],
      ['Model', 'To be confirmed'],
    ],
    spec: 'Three LED petals around a centre lens · rotating head',
    photo: { file: 'trefoil.webp', width: 280, height: 280, alt: 'Retro 3-blade fan light glowing red beside a matrix panel, from a Vital Acoustica show', source: 'show' },
  },
  {
    id: 'hex',
    group: 'Lighting',
    name: 'Retro hex light',
    role: 'Warm retro',
    about: 'Seven hexagonal cells with a warm, tungsten-style glow.',
    description:
      'Seven hexagonal cells that read like old filament lamps. Used for warm punches, slow chases and as eye candy on the truss towers and lighting wings.',
    specs: [
      ['Cells', '7 hexagonal'],
      ['Look', 'Warm, tungsten-style'],
      ['Control', 'DMX'],
      ['Model', 'To be confirmed'],
    ],
    spec: '7 hexagonal cells · tungsten-style warm glow',
    photo: { file: 'hex.webp', width: 230, height: 230, alt: 'Retro hex light with seven glowing amber cells in haze, from a Vital Acoustica show', source: 'show' },
  },
  {
    id: 'matrix',
    group: 'LED & visuals',
    name: 'LED matrix panel',
    role: "2' × 2' panel",
    about: 'Big warm dots over a fine RGB pixel field, for logos, looks and punches.',
    description:
      'A square panel with 7 × 7 large warm-white dots set over a fine RGB pixel field. Pixel-mapped, it carries logos and patterns; on the kick it can flash as one block. We often hang them as diamonds either side of the booth.',
    specs: [
      ['Size', "2' × 2'"],
      ['Layout', '7 × 7 warm-white dots over an RGB pixel field'],
      ['Mounting', 'Truss clamp, flat or as a diamond'],
      ['Control', 'DMX / pixel mapping'],
    ],
    spec: 'Pixel-mapped dot matrix · hung as diamonds',
    photo: { file: 'matrix.webp', width: 398, height: 398, alt: 'LED matrix panel with a grid of large amber dots', source: 'product' },
  },
  {
    id: 'pixelbar',
    group: 'LED & visuals',
    name: 'LED pixel bar',
    role: 'Pixel bar',
    about: 'A single line of individually controlled RGB pixels for chases and lines.',
    description:
      'A slim bar of individually controlled RGB pixels. Laid on the diagonal it draws lines and arrows through a stage; mapped together, a row of bars becomes one long chase that runs with the music.',
    specs: [
      ['Pixels', 'Individually controlled RGB cells in one line'],
      ['Uses', 'Lines, chases, outlines'],
      ['Control', 'DMX / pixel mapping'],
      ['Model', 'To be confirmed'],
    ],
    spec: 'Individually controlled RGB pixels · chase-capable',
    photo: { file: 'pixelbar.webp', width: 840, height: 385, alt: 'LED pixel bar shown unlit and lit in rainbow colours', source: 'product' },
  },
  {
    id: 'dotbar',
    group: 'LED & visuals',
    name: 'LED wall washer bar',
    role: 'Wash bar',
    about: 'Eighteen high-output LEDs in an outdoor-rated aluminium bar.',
    description:
      'An aluminium bar of eighteen high-output LEDs with sealed connectors, so it works indoors and out. We use them to wash walls, truss and architecture, or as a row of bright dots in the lighting wings.',
    specs: [
      ['LEDs', '18 high-output cells'],
      ['Housing', 'Aluminium, sealed connectors for outdoor use'],
      ['Uses', 'Wall and truss washes, dot lines'],
      ['Control', 'DMX'],
    ],
    spec: '18 high-output LEDs · outdoor-rated',
    photo: { file: 'dotbar.webp', width: 1000, height: 673, alt: 'LED wall washer bar in a grey aluminium housing with mounting brackets and cables', source: 'product' },
  },
  {
    id: 'rope',
    group: 'LED & visuals',
    name: 'LED neon flex',
    role: 'Outlines',
    about: 'Flexible black-jacket neon that bends to any outline.',
    description:
      'DMX-controlled LED neon in a black jacket, so it disappears when off. It bends to follow stage edges, booth fronts and structures, or hangs as vertical columns of light behind the booth.',
    specs: [
      ['Construction', 'Flexible LED neon, black jacket'],
      ['Uses', 'Outlines, columns, edges'],
      ['Control', 'DMX'],
    ],
    spec: 'Flexible LED neon runs · DMX',
    photo: { file: 'rope.webp', width: 1000, height: 1000, alt: 'Lengths of black LED neon flex lit in green, blue and white', source: 'product', fit: 'cover' },
  },
  {
    id: 'truss',
    group: 'Structure',
    name: 'Box truss',
    role: 'Rigging',
    about: 'Square aluminium truss for goal posts, towers and lighting wings.',
    description:
      'Square aluminium box truss built as goal posts and towers, carrying beams, retro lights and panels. Every fixture is rigged with clamps and safeties.',
    specs: [
      ['Type', 'Square aluminium box truss'],
      ['Configurations', 'Goal posts, towers, wings'],
      ['Section size', 'To be confirmed'],
    ],
    spec: 'Square aluminium box truss · goal posts & towers',
    photo: { file: 'truss.webp', width: 320, height: 540, alt: 'Truss tower with a hex light, from a Vital Acoustica show', source: 'show' },
  },
]

export const gearById = Object.fromEntries(gear.map((g) => [g.id, g])) as Record<GearId, Gear>

export const GEAR_GROUPS: GearGroup[] = ['Sound', 'Lighting', 'LED & visuals', 'Structure']
export const RIG_GROUPS = ['Sound', 'Lighting', 'LED & visuals'] as const

export const fullName = (g: Gear) => (g.maker ? `${g.maker} ${g.name}` : g.name)

export const PHOTO_SOURCE: Record<Gear['photo']['source'], string> = {
  product: 'Product photo',
  show: 'From one of our shows',
  model: '3D model render · photo to come',
}
