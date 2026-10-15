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
  | 'cdj'
  | 'djm'
  | 'sharpy'
  | 'matrix'
  | 'trefoil'
  | 'hex'
  | 'warcraft'
  | 'dotbar'
  | 'pixelbar'
  | 'rope'
  | 'truss'
  | 'table'

/** Every hire item; DI boxes and amplifiers are listed but not modelled. */
export type GearId = RigId | 'di' | 'd40'

export type GearGroup = 'Sound' | 'Audio Infrastructure' | 'Stage Lighting' | 'Visual Experiences' | 'Structure'

export type Gear = {
  id: GearId
  group: GearGroup
  name: string
  maker?: string
  /** short type label on cards; empty to show only the group */
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
    about: 'Dual 18" bandpass subwoofer for the deep, controlled low end a kick drum needs, cardioid-capable.',
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
    id: 'd40',
    stock: '2 units', // DUMMY
    group: 'Sound',
    name: 'D40',
    maker: 'd&b audiotechnik',
    role: 'Amplifier',
    about: 'Four-channel d&b amplifier with the loudspeaker presets and protection built in.',
    description:
      'The amplifier that drives our d&b system. Four channels of Class-D power with DSP that holds the factory setup for each d&b loudspeaker, so the V10P tops and B22 subwoofers sound and behave exactly as designed. LoadMatch compensates for long speaker cables, and the inputs take analogue, digital and network audio.',
    specs: [
      ['Channels', '4, Class D'],
      ['Output power', '4 × 2400 W into 4 Ω · 4 × 2000 W into 8 Ω'],
      ['Inputs', '4 analogue · 4 AES3 · Milan network audio'],
      ['Processing', 'd&b loudspeaker setups, protection, LoadMatch (up to 70 m cable)'],
      ['Dynamic range', '116 dB'],
      ['Size', '2 RU, 19" rack, 465 mm deep'],
      ['Weight', '13.8 kg'],
    ],
    specSource: 'd&b audiotechnik',
    spec: '4 channels · 4 × 2400 W into 4 Ω · d&b presets',
    photo: { file: 'd40.webp', width: 1000, height: 750, alt: 'd&b audiotechnik D40 amplifier front panel with touchscreen and knobs', source: 'product' },
  },
  {
    id: 'dm3',
    stock: '2 units', // DUMMY
    group: 'Audio Infrastructure',
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
    photo: { file: 'dm3.webp', width: 800, height: 800, alt: 'Yamaha DM3 digital mixing console with its touchscreen and faders', source: 'product' },
  },
  {
    id: 'cdj',
    stock: '2 units', // DUMMY
    group: 'Audio Infrastructure',
    name: 'CDJ-3000X',
    maker: 'Pioneer DJ',
    role: 'DJ player',
    about: 'The club-standard player, with a 10.1" touchscreen and Wi-Fi rekordbox.',
    description:
      'The player most DJs expect to find in the booth. A 10.1" touchscreen shows up to 16 tracks at a glance, it plays from USB sticks, SSDs or straight from a laptop or phone, and it links to the other players over Pro DJ Link. We set the pair up, link them to the mixer and check every source before the first set.',
    specs: [
      ['Screen', '10.1" touchscreen'],
      ['Media', 'USB flash / SSD / HDD · PC and Mac · iOS and Android'],
      ['Formats', 'MP3 · AAC · WAV · AIFF · FLAC · ALAC'],
      ['Connectivity', 'USB-A · 2 × USB-C · LAN (Pro DJ Link) · Wi-Fi'],
      ['Outputs', 'Analogue (RCA) and digital (coaxial)'],
      ['Dimensions', '344.6 × 130.1 × 490.4 mm (W × H × D)'],
      ['Weight', '6.0 kg'],
    ],
    specSource: 'Pioneer DJ / AlphaTheta',
    spec: '10.1" touchscreen · USB, SSD, PC/Mac · Pro DJ Link',
    photo: { file: 'cdj.webp', width: 800, height: 800, alt: 'Pioneer DJ CDJ-3000X player from above, touchscreen and jog wheel', source: 'product' },
  },
  {
    id: 'djm',
    stock: '1 unit', // DUMMY
    group: 'Audio Infrastructure',
    name: 'DJM-V10-LF',
    maker: 'Pioneer DJ',
    role: 'DJ mixer',
    about: 'Six-channel club mixer with long-throw faders, four-band EQ and built-in effects.',
    description:
      'A six-channel mixer built for long, blended sets: 60 mm long-throw channel faders in place of a crossfader, four-band EQ and a compressor on every channel, a three-band master isolator, and Beat FX and send effects built in. Two headphone outputs and a booth output with its own EQ make back-to-back sets easy.',
    specs: [
      ['Channels', '6, with 60 mm long-throw faders (no crossfader)'],
      ['EQ', '4-band per channel · 3-band master isolator'],
      ['Effects', 'Beat FX · send FX · per-channel compressor and filter'],
      ['Monitoring', 'Two headphone outputs · booth out with EQ'],
      ['Audio', '96 kHz · 32-bit A/D and D/A'],
      ['Dimensions', '437.6 × 107.9 × 467 mm (W × H × D)'],
      ['Weight', '11.9 kg'],
    ],
    specSource: 'Pioneer DJ',
    spec: '6 channels · 60 mm faders · 4-band EQ · built-in FX',
    photo: { file: 'djm.webp', width: 800, height: 800, alt: 'Pioneer DJ DJM-V10-LF six-channel mixer from above', source: 'product' },
  },
  {
    id: 'di',
    stock: '8 units', // DUMMY
    group: 'Audio Infrastructure',
    name: 'AR-133 DI box',
    maker: 'BSS Audio',
    role: 'Active DI',
    about: 'Active DI for laptops, synths, instruments and playback, with a pad for hot sources.',
    description:
      'The touring-standard active DI. It turns an unbalanced source into a clean, transformer-balanced line for the mixer, with a 0/20/40 dB pad for anything from a bass guitar to a laptop or keyboard output, a link jack to feed an amp, and a ground lift to keep hum out. It runs on phantom power and switches to its 9 V battery if phantom drops.',
    specs: [
      ['Type', 'Active, single channel'],
      ['Power', '48 V phantom, with automatic 9 V battery backup'],
      ['Inputs', '1/4" jack and parallel link jack · XLR input'],
      ['Output', 'Transformer-balanced XLR · ground lift'],
      ['Pad', '0 / −20 / −40 dB'],
      ['Input impedance', '1 MΩ (0 dB pad) · 47 kΩ (−20 / −40 dB)'],
      ['Frequency response', '30 Hz – 20 kHz (+0 / −1 dB)'],
    ],
    specSource: 'BSS Audio',
    spec: 'Active · phantom or 9 V · 0/20/40 dB pad · ground lift',
    photo: { file: 'di.webp', width: 800, height: 800, alt: 'BSS Audio AR-133 active DI box in teal with rubber end caps', source: 'product' },
  },
  {
    id: 'sharpy',
    stock: '8 units', // DUMMY
    group: 'Stage Lighting',
    name: 'Beam moving heads',
    role: '',
    about: 'Pencil-thin beams that cut through haze, moving in time with the music.',
    description:
      'Tight aerial beams on fast pan and tilt, hung from the front truss or set on the stage. We programme them to the set: fans, waves, crosses and single points over the crowd, run in red or amber.',
    specs: [
      ['Type', 'Beam + spot moving head'],
      ['Source', '150 W LED'],
      ['Display', 'LCD menu on the base'],
      ['Mounting', 'Truss clamp or floor'],
      ['Control', 'DMX, programmed to the music'],
    ],
    spec: '150 W beam + spot · pan/tilt · run in red or amber',
    photo: { file: 'sharpy.webp', width: 800, height: 800, alt: 'Beam and spot moving head with a red lens, yoke and display base', source: 'product' },
  },
  {
    id: 'trefoil',
    stock: '4 units', // DUMMY
    group: 'Stage Lighting',
    name: 'Retro 3\u2011blade fan light', // non-breaking hyphen keeps "3-blade" together
    role: '',
    about: 'Three honeycomb blades with warm LED strips around a centre lens, on a rotating head.',
    description:
      'Three wide blades behind hammered honeycomb lenses, each with a warm LED strip down its centre, set around a hexagonal hub with its own lens. The lenses take colour while the strips glow like filament, and the head turns so the blades sweep as the set builds. We usually pair two either side of the booth.',
    specs: [
      ['Head', 'Three honeycomb-lens blades with warm LED strips · centre lens'],
      ['Motion', 'Rotating head'],
      ['Control', 'DMX, pixel mapping'],
      ['Model', 'ATISP511 Retro'],
    ],
    spec: 'Three honeycomb blades · warm strips · centre lens · rotating head',
    photo: { file: 'trefoil.webp', width: 800, height: 800, alt: 'Retro 3-blade fan light: three honeycomb blades with amber strips around a hexagonal hub and lens', source: 'product' },
  },
  {
    id: 'hex',
    stock: '4 units', // DUMMY
    group: 'Stage Lighting',
    name: 'Retro hex light',
    role: 'Retro effect',
    about: 'Seven hexagonal cells behind honeycomb lenses, in a round frame.',
    description:
      'Seven hexagonal cells behind honeycomb lenses, clustered inside a round tubular frame. Each cell has a warm centre and a full-colour surround, so it can glow like an old filament lamp or wash in colour. Used for warm punches, slow chases and as eye candy on the truss towers and lighting wings.',
    specs: [
      ['Cells', '7 hexagonal, honeycomb lens'],
      ['Colour', 'Warm centre with RGB surround per cell'],
      ['Frame', 'Round tubular yoke, floor or truss'],
      ['Control', 'DMX, cells individually'],
    ],
    spec: '7 hexagonal cells · warm centre + RGB · round frame',
    photo: { file: 'hex.webp', width: 800, height: 800, alt: 'Retro hex light: seven hexagonal honeycomb cells lit in colour inside a round frame', source: 'product' },
  },
  {
    id: 'warcraft',
    stock: '4 units', // DUMMY
    group: 'Stage Lighting',
    name: 'Warcraft retro light',
    role: 'Retro effect',
    about: 'A big searchlight-style can: a warm centre in a gold reflector, ringed by LEDs.',
    description:
      'A large retro fixture built like an old searchlight: a warm centre source deep in a gold reflector behind a three-spoke frame, with a ring of LEDs around the rim that can chase or glow on its own. On its yoke it stands on the floor or hangs from truss, and it reads as a warm, golden glow from across the room.',
    specs: [
      ['Source', 'Warm centre LED in a gold reflector'],
      ['Ring', 'LED ring around the rim, separately controlled'],
      ['Mounting', 'Yoke: floor or truss'],
      ['Control', 'DMX'],
    ],
    spec: 'Warm centre in a gold reflector · LED rim ring',
    photo: { file: 'warcraft.webp', width: 800, height: 800, alt: 'Warcraft retro light: round black can with a gold reflector, three-spoke front and LED ring, on a yoke', source: 'product' },
  },
  {
    id: 'matrix',
    stock: '4 panels', // DUMMY
    group: 'Stage Lighting',
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
    group: 'Stage Lighting',
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
    group: 'Stage Lighting',
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
    group: 'Stage Lighting',
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
    about: 'Black square aluminium truss for goal posts, towers and lighting wings.',
    description:
      'Four-chord square aluminium box truss in a black finish, so it disappears behind the light. We build it as goal posts and towers carrying beams, retro lights and panels, with every fixture rigged on clamps and safeties.',
    specs: [
      ['Type', 'Four-chord square box truss, aluminium'],
      ['Finish', 'Black'],
      ['Configurations', 'Goal posts, towers, wings'],
      ['Section size', '290 mm square'], // DUMMY
    ],
    spec: 'Black square aluminium box truss · goal posts & towers',
    photo: { file: 'truss.webp', width: 645, height: 483, alt: 'Section of black four-chord square aluminium box truss', source: 'product' },
  },
  {
    id: 'table',
    stock: '4 units', // DUMMY
    group: 'Structure',
    name: 'Quickie table',
    role: 'Folding table',
    about: 'Sturdy folding table for the DJ setup, the mixing position or a control desk.',
    description:
      'A sturdy folding table that sets up in seconds: a level, solid top for the DJ players and mixer, the front-of-house desk or a lighting controller, and it folds flat for transport.',
    specs: [
      ['Use', 'DJ setup, front of house, control desk'],
      ['Build', 'Folding legs, solid top'], // DUMMY
      ['Size', 'To be confirmed'], // DUMMY
    ],
    spec: 'Folding table for DJ gear, FOH or control',
    photo: { file: '', width: 4, height: 3, alt: '', source: 'none' }, // DUMMY: photo to come
  },
]

export const gearById = Object.fromEntries(gear.map((g) => [g.id, g])) as Record<GearId, Gear>

export const GEAR_GROUPS: GearGroup[] = ['Sound', 'Audio Infrastructure', 'Stage Lighting', 'Visual Experiences', 'Structure']
export const RIG_GROUPS = ['Sound', 'Audio Infrastructure', 'Stage Lighting'] as const

/** Groups shown as "coming soon" while they have no items yet. */
export const COMING_SOON: Partial<Record<GearGroup, string>> = {
  'Visual Experiences': 'Projection mapping, generative visuals and immersive installations.',
}

const NOT_MODELLED: GearId[] = ['di', 'd40']
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
