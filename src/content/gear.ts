// The hire inventory. Every item has a photo, a plain description and a spec table,
// and can be opened in the 3D stage model (positions in src/three/hotspots.ts).
//
// Photo sources are labelled honestly on the site:
//   'product' — manufacturer / supplier photo of the exact item
//   'show'    — cropped from a Vital Acoustica production photo
//   'model'   — render of our 3D stage model (until a photo is supplied)
// Specs marked as manufacturer data come from the maker's published sheets.
//
// DUMMY: every value marked `// DUMMY` below is a stand-in until the photo shoot and
// stock check (models, quantities, truss size). Search the codebase for "DUMMY" to find them all.

/** Items modelled in the 3D stage (positions in src/three/hotspots.ts). */
export type RigId =
  | 'v10p'
  | 'b22'
  | 'art915'
  | 'dm3'
  | 'pioneer'
  | 'sharpy'
  | 'matrix'
  | 'trefoil'
  | 'hex'
  | 'dotbar'
  | 'pixelbar'
  | 'rope'
  | 'truss'

/** Every hire item; DI boxes are listed but not modelled. */
export type GearId = RigId | 'di'

export type GearGroup = 'Sound' | 'Control & DJ' | 'Lighting' | 'LED & visuals' | 'Structure'

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
  /** how many we hold, shown on cards and item pages */
  stock: string
  photo: {
    file: string
    width: number
    height: number
    alt: string
    /** 'none': no photo yet, the card shows a "photo to come" tile */
    source: 'product' | 'show' | 'model' | 'none'
    /** 'cover' fills the frame (photos with their own background); otherwise the item sits on a studio surface */
    fit?: 'cover'
  }
  /** the old one-line summary, still used in compact lists */
  spec: string
}

export const gear: Gear[] = [
  {
    id: 'v10p',
    stock: '4 units', // DUMMY
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
    stock: '4 units', // DUMMY
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
    id: 'art915',
    stock: '2 units',
    group: 'Sound',
    name: 'ART 915-A',
    maker: 'RCF',
    role: 'Active loudspeaker',
    about: 'Self-powered 15" two-way speaker for booth monitors, smaller rooms and side fills.',
    description:
      'A self-powered two-way cabinet with a 15" woofer and a 1.75" compression driver, driven by a 2100 W bi-amplified Class-D amplifier with onboard DSP. We use them as DJ booth monitors, as side fills, or as the main system for smaller rooms and private events.',
    specs: [
      ['Drivers', '15" LF (2.5" voice coil) · 1.75" HF compression driver'],
      ['Amplifier', '2100 W peak, Class-D bi-amplified'],
      ['Max SPL', '131 dB'],
      ['Frequency response', '45 Hz – 20 kHz'],
      ['Dispersion', '100° × 60°'],
      ['Dimensions', '410 × 716 × 415 mm (W × H × D)'],
      ['Weight', '22.4 kg'],
    ],
    specSource: 'RCF',
    spec: '15" + 1.75" HF · 2100 W · 131 dB SPL max',
    photo: { file: 'art915.webp', width: 800, height: 800, alt: 'RCF ART 915-A active loudspeaker, black cabinet with steel grille', source: 'product' },
  },
  {
    id: 'dm3',
    stock: '2 units', // DUMMY
    group: 'Control & DJ',
    name: 'DM3',
    maker: 'Yamaha',
    role: 'Digital mixer',
    about: 'Compact 22-channel digital console with a 9" touchscreen, for front of house or monitors.',
    description:
      'A compact digital mixing console: 16 mono channels, a stereo channel and two FX returns, with onboard processing and scene recall. Small enough for a booth or a tight front-of-house position, and set up in advance so the show starts from a tested scene.',
    specs: [
      ['Input channels', '16 mono + 1 stereo + 2 FX returns'],
      ['Local I/O', '16 mic/line in (12 XLR + 4 combo) · 8 XLR out'],
      ['Busses', 'Stereo · 6 mix · 2 FX · 2 matrix'],
      ['Control', '9" multi-touch screen · 8 + 1 faders'],
      ['Sample rate', '48 / 96 kHz'],
      ['Dimensions', '320 × 140 × 455 mm (W × H × D)'],
      ['Weight', '6.5 kg'],
    ],
    specSource: 'Yamaha',
    spec: '22 channels · 16 mic/line in · 9" touchscreen',
    photo: { file: '', width: 4, height: 3, alt: '', source: 'none' }, // DUMMY: photo from the shoot
  },
  {
    id: 'pioneer',
    stock: '1 setup', // DUMMY
    group: 'Control & DJ',
    name: 'DJ setup',
    maker: 'Pioneer DJ',
    role: 'DJ console',
    about: 'Club-standard players and mixer, set up and linked for the booth.',
    description:
      'Club-standard Pioneer DJ players and a four-channel mixer, the setup most DJs expect to find in the booth. We cable it to the system, link the players and check every channel before the first set.',
    specs: [
      ['Setup', '2 × CDJ-3000 players · DJM-900NXS2 mixer'], // DUMMY
      ['Inputs', 'USB and SD, rekordbox, Pro DJ Link'], // DUMMY
      ['Use', 'DJ booth, festival and club stages'],
    ],
    spec: 'Club-standard players and mixer',
    photo: { file: '', width: 4, height: 3, alt: '', source: 'none' }, // DUMMY: photo from the shoot
  },
  {
    id: 'di',
    stock: '8 units', // DUMMY
    group: 'Control & DJ',
    name: 'DI boxes',
    role: 'Direct injection',
    about: 'Clean, balanced connections for laptops, synths, instruments and playback.',
    description:
      'Direct-injection boxes that turn unbalanced sources into balanced mic-level lines for the mixer, with ground lift to keep hum out. For live acts, laptops, synths and playback.',
    specs: [
      ['Types', 'Mono and stereo, passive'], // DUMMY
      ['Connections', '1/4" jack in · XLR out · ground lift'], // DUMMY
      ['Use', 'Laptops, synths, instruments, playback'],
    ],
    spec: 'Balanced lines for laptops, synths and instruments',
    photo: { file: '', width: 4, height: 3, alt: '', source: 'none' }, // DUMMY: photo from the shoot
  },
  {
    id: 'sharpy',
    stock: '8 units', // DUMMY
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
      ['Model', '230 W 7R beam moving head'], // DUMMY
    ],
    spec: 'Pencil-thin aerial beams · pan/tilt · run in red or amber',
    photo: { file: 'sharpy.webp', width: 900, height: 900, alt: 'Render from our stage model: beam moving heads under the truss, one red and two amber', source: 'model' },
  },
  {
    id: 'trefoil',
    stock: '4 units', // DUMMY
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
      ['Model', '3-blade rotating LED fan light'], // DUMMY
    ],
    spec: 'Three LED petals around a centre lens · rotating head',
    photo: { file: 'trefoil.webp', width: 280, height: 280, alt: 'Retro 3-blade fan light glowing red beside a matrix panel, from a Vital Acoustica show', source: 'show' },
  },
  {
    id: 'hex',
    stock: '4 units', // DUMMY
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
      ['Model', '7-cell retro LED panel'], // DUMMY
    ],
    spec: '7 hexagonal cells · tungsten-style warm glow',
    photo: { file: 'hex.webp', width: 230, height: 230, alt: 'Retro hex light with seven glowing amber cells in haze, from a Vital Acoustica show', source: 'show' },
  },
  {
    id: 'matrix',
    stock: '4 panels', // DUMMY
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
    stock: '8 bars', // DUMMY
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
      ['Model', '1 m RGB pixel bar, 40 pixels'], // DUMMY
    ],
    spec: 'Individually controlled RGB pixels · chase-capable',
    photo: { file: 'pixelbar.webp', width: 840, height: 385, alt: 'LED pixel bar shown unlit and lit in rainbow colours', source: 'product' },
  },
  {
    id: 'dotbar',
    stock: '8 bars', // DUMMY
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
    stock: '50 m', // DUMMY
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
    stock: '2 goal posts, 4 towers', // DUMMY
    group: 'Structure',
    name: 'Box truss',
    role: 'Rigging',
    about: 'Square aluminium truss for goal posts, towers and lighting wings.',
    description:
      'Square aluminium box truss built as goal posts and towers, carrying beams, retro lights and panels. Every fixture is rigged with clamps and safeties.',
    specs: [
      ['Type', 'Square aluminium box truss'],
      ['Configurations', 'Goal posts, towers, wings'],
      ['Section size', '290 mm square'], // DUMMY
    ],
    spec: 'Square aluminium box truss · goal posts & towers',
    photo: { file: 'truss.webp', width: 320, height: 540, alt: 'Truss tower with a hex light, from a Vital Acoustica show', source: 'show' },
  },
]

export const gearById = Object.fromEntries(gear.map((g) => [g.id, g])) as Record<GearId, Gear>

export const GEAR_GROUPS: GearGroup[] = ['Sound', 'Control & DJ', 'Lighting', 'LED & visuals', 'Structure']
export const RIG_GROUPS = ['Sound', 'Control & DJ', 'Lighting', 'LED & visuals'] as const

const NOT_MODELLED: GearId[] = ['di']
/** True when the item has a place in the 3D stage model. */
export const inRig = (g: Gear): g is Gear & { id: RigId } => !NOT_MODELLED.includes(g.id)
export const rigGear = gear.filter(inRig)

export const fullName = (g: Gear) => (g.maker ? `${g.maker} ${g.name}` : g.name)

export const PHOTO_SOURCE: Record<Gear['photo']['source'], string> = {
  product: 'Product photo',
  show: 'From one of our shows',
  model: '3D model render · photo to come',
  none: 'Photo to come',
}
