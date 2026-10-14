// The house rig. Each item can be pointed at in the 3D stage and in show photos.
// `about` is what a promoter or venue actually needs to know about it.

export type GearId = 'v10p' | 'b22' | 'sharpy' | 'matrix' | 'trefoil' | 'hex' | 'dotbar' | 'pixelbar' | 'rope' | 'truss'

export type Gear = {
  id: GearId
  group: 'Sound' | 'Lighting' | 'LED & visuals' | 'Structure'
  name: string
  role: string
  spec: string
  about: string
}

export const gear: Gear[] = [
  {
    id: 'v10p',
    group: 'Sound',
    name: 'd&b audiotechnik V10P',
    role: 'Main tops',
    spec: '2 × 10" + 8" + 1.4" HF · 110° × 40° · 139 dB SPL max',
    about: 'Three-way point source with a rotatable horn: wide, even coverage that stays clean at techno levels, on stands or flown.',
  },
  {
    id: 'b22',
    group: 'Sound',
    name: 'd&b audiotechnik B22-SUB',
    role: 'Subwoofers',
    spec: '2 × 18" bandpass · 1160 × 585 × 920 mm · cardioid-capable',
    about: 'Dual 18" bandpass subs for the low end a kick drum needs. Three or more can run as a cardioid array to keep bass off the stage and the neighbours.',
  },
  {
    id: 'sharpy',
    group: 'Lighting',
    name: 'Sharpy beam moving heads',
    role: 'Beams',
    spec: 'Pencil-thin aerial beams · pan/tilt · run in red or amber',
    about: 'The beams you see cutting through haze. Programmed to the track: fans, waves, crosses and convergence points over the crowd.',
  },
  {
    id: 'matrix',
    group: 'LED & visuals',
    name: 'LED matrix panels',
    role: "2' × 2' panels",
    spec: 'Pixel-mapped dot matrix · hung as diamonds',
    about: 'Square dot-matrix panels hung at 45°. They carry logos, pixel looks and full-panel red washes that punch with the kick.',
  },
  {
    id: 'trefoil',
    group: 'Lighting',
    name: 'Retro 3-blade fans',
    role: 'Effect',
    spec: 'Three LED petals around a centre lens · rotating head',
    about: 'The trefoil fixtures either side of the booth. Petals glow red, the centre lens burns warm, and the head spins with the energy of the set.',
  },
  {
    id: 'hex',
    group: 'Lighting',
    name: 'Retro hex lights',
    role: 'Warm retro',
    spec: '7 hexagonal cells · tungsten-style warm glow',
    about: 'Seven-cell hex retros that read like old filament lamps. Used for warm punches and slow chases on the truss and wings.',
  },
  {
    id: 'dotbar',
    group: 'LED & visuals',
    name: 'LED dot bars',
    role: 'Amber bars',
    spec: '10 warm cells per bar · individually controlled',
    about: 'Warm amber dot bars run on the diagonal in our wing layout. They fill, chase and flash cell by cell.',
  },
  {
    id: 'pixelbar',
    group: 'LED & visuals',
    name: 'LED pixel bars',
    role: 'Red lines',
    spec: 'Continuous pixel strips · chase-capable',
    about: 'Thin red pixel lines that draw the arrow shapes in our wings. Chases run along them in time with the music.',
  },
  {
    id: 'rope',
    group: 'LED & visuals',
    name: 'LED rope',
    role: 'Outlines',
    spec: 'Flexible LED / neon runs',
    about: 'Vertical neon columns behind the booth, stage edges and booth fronts. Quiet, but it frames the whole stage in red.',
  },
  {
    id: 'truss',
    group: 'Structure',
    name: 'Box truss',
    role: 'Rigging',
    spec: '290 mm square aluminium · goal posts & towers',
    about: 'Goal-post and tower truss that carries the sharpies and retros. Rigged with clamps and safeties on every fixture.',
  },
]

export const gearById = Object.fromEntries(gear.map((g) => [g.id, g])) as Record<GearId, Gear>

export const RIG_GROUPS = ['Sound', 'Lighting', 'LED & visuals'] as const
