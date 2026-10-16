// The shop: sample packs and VJ loops (digital, sold worldwide) and merch (printed on demand in India).
//
// How buying works (see docs/shop-setup.md):
// - Audio packs and VJ loops are sold through Gumroad. Gumroad stores the files, takes the payment
//   (cards, PayPal, UPI), handles tax for buyers abroad and emails the download. Paste each product's
//   Gumroad link into `checkout` and its Buy button opens Gumroad's checkout over our page.
// - Merch is printed and shipped per order by a print-on-demand partner (Qikink). Paste the product's
//   payment or store link into `checkout`.
// Until `checkout` is filled in, the product shows as coming soon with a "Tell me when it's out" button.
//
// DUMMY: every product below is a sample, to show how the shop will look. Replace with the real ones.

export type ShopKind = 'audio' | 'loops' | 'merch'

type Base = {
  id: string
  kind: ShopKind
  name: string
  tagline: string
  description: string
  price: number
  checkout: string // Gumroad / store link; empty until it's on sale
  sample?: boolean // DUMMY product, not for sale
}

export type AudioPack = Base & {
  kind: 'audio'
  art: 'rings' | 'bars' | 'drift' | 'rise'
  sound: 'kicks' | 'techno' | 'ambient' | 'fx' // the made-up preview played until a real one is added
  preview?: string // real preview, e.g. 'shop/low-end-theory.mp3' in public/
  specs: [string, string][]
  contents: string[]
}

export type Loop = Base & {
  kind: 'loops'
  visual: 'rings' | 'beams' | 'grid' | 'scope'
  preview?: string // real preview clip, e.g. 'shop/resonance.mp4' in public/
  specs: [string, string][]
}

export type Merch = Base & {
  kind: 'merch'
  garment: 'tee' | 'hoodie' | 'cap'
  print: 'mark' | 'wordmark' | 'rings'
  colours: { name: string; hex: string; ink: string }[]
  sizes: string[]
  specs: [string, string][]
  photo?: string // real product photo in public/shop/
}

export type Product = AudioPack | Loop | Merch

export const SECTIONS: {
  kind: ShopKind
  title: string
  line: string
  currency: 'USD' | 'INR'
  note: string
}[] = [
  {
    kind: 'audio',
    title: 'Audio packs',
    line: 'Samples and loops from the way we hear a room: low end you feel, tops that stay sweet at volume.',
    currency: 'USD',
    note: 'Instant download, worldwide. Royalty-free for your tracks, sets and shows.',
  },
  {
    kind: 'loops',
    title: 'VJ loops',
    line: 'Seamless visuals made to run under a set. Drop them into Resolume, TouchDesigner or any media server.',
    currency: 'USD',
    note: 'Instant download, worldwide. Licensed for live shows and streams.',
  },
  {
    kind: 'merch',
    title: 'Merch',
    line: 'Oversized tees, hoodies and caps to wear to the next show. Printed when you order, so nothing goes to waste.',
    currency: 'INR',
    note: 'Printed to order and shipped across India in about a week.',
  },
]

export const products: Product[] = [
  // ─── Audio packs ───
  {
    id: 'low-end-theory',
    kind: 'audio',
    name: 'Low End Theory',
    tagline: 'Kicks and subs, tuned on a d&b B22.',
    description:
      'Forty-eight kicks and sub hits shaped on our own system, so they hit in the chest and not just on headphones. Every sound is tuned and labelled by key.',
    price: 12,
    checkout: '',
    sample: true,
    art: 'rings',
    sound: 'kicks',
    specs: [
      ['Sounds', '48 one-shots'],
      ['Tempo', '120–128 BPM'],
      ['Format', 'WAV, 24-bit / 48 kHz'],
      ['Size', '310 MB'],
    ],
    contents: ['24 kicks', '16 sub hits', '8 tuned 808s'],
  },
  {
    id: 'warehouse-hours',
    kind: 'audio',
    name: 'Warehouse Hours',
    tagline: 'Techno drum loops for the long, dark middle of the night.',
    description:
      'Rolling drum loops, tops and percussion recorded through a club system and back, so they carry the room with them. Built to layer.',
    price: 15,
    checkout: '',
    sample: true,
    art: 'bars',
    sound: 'techno',
    specs: [
      ['Sounds', '64 loops, 40 one-shots'],
      ['Tempo', '128–134 BPM'],
      ['Format', 'WAV, 24-bit / 48 kHz'],
      ['Size', '820 MB'],
    ],
    contents: ['32 full drum loops', '20 top loops', '12 percussion loops', '40 one-shots'],
  },
  {
    id: 'room-tone',
    kind: 'audio',
    name: 'Room Tone',
    tagline: 'The sound of venues before the doors open.',
    description:
      'Ambient textures and drones recorded in empty halls, courtyards and clubs during soundcheck. Slow, warm and full of space.',
    price: 9,
    checkout: '',
    sample: true,
    art: 'drift',
    sound: 'ambient',
    specs: [
      ['Sounds', '30 textures'],
      ['Length', '30 s – 2 min each'],
      ['Format', 'WAV, 24-bit / 48 kHz'],
      ['Size', '640 MB'],
    ],
    contents: ['12 drones', '10 room textures', '8 field recordings'],
  },
  {
    id: 'transitions',
    kind: 'audio',
    name: 'Transitions',
    tagline: 'Risers, drops and impacts for moving between tracks.',
    description: 'Builds, sweeps, impacts and tails made for DJs and live sets, each one ending clean on the downbeat.',
    price: 10,
    checkout: '',
    sample: true,
    art: 'rise',
    sound: 'fx',
    specs: [
      ['Sounds', '56 effects'],
      ['Tempo', '124 & 128 BPM versions'],
      ['Format', 'WAV, 24-bit / 48 kHz'],
      ['Size', '450 MB'],
    ],
    contents: ['16 risers', '14 impacts', '14 downlifters', '12 tails'],
  },

  // ─── VJ loops ───
  {
    id: 'resonance',
    kind: 'loops',
    name: 'Resonance',
    tagline: 'Rings that breathe with the kick.',
    description:
      'The form from our homepage, as loops: rings that ripple outwards, collapse and bloom. Calm enough for a warm-up, wide enough for the peak.',
    price: 19,
    checkout: '',
    sample: true,
    visual: 'rings',
    specs: [
      ['Loops', '12'],
      ['Resolution', '3840 × 2160 and 1920 × 1080'],
      ['Frame rate', '60 fps'],
      ['Length', '8–16 s, seamless'],
      ['Format', 'DXV (Resolume) and H.264 MP4'],
    ],
  },
  {
    id: 'beam-study',
    kind: 'loops',
    name: 'Beam Study',
    tagline: 'Sweeping beams in haze, as video.',
    description:
      'Shafts of light cutting through smoke, the way our moving heads do it. Layer them over the real thing or use them where you can’t rig lights.',
    price: 19,
    checkout: '',
    sample: true,
    visual: 'beams',
    specs: [
      ['Loops', '10'],
      ['Resolution', '3840 × 2160 and 1920 × 1080'],
      ['Frame rate', '60 fps'],
      ['Length', '8 s, seamless'],
      ['Format', 'DXV (Resolume) and H.264 MP4'],
    ],
  },
  {
    id: 'signal-grid',
    kind: 'loops',
    name: 'Signal Grid',
    tagline: 'Dot-matrix patterns for LED walls.',
    description:
      'Pixel patterns, chases and scans designed on an LED matrix. Made to read from the back of the room, and sharp on low-resolution panels too.',
    price: 15,
    checkout: '',
    sample: true,
    visual: 'grid',
    specs: [
      ['Loops', '16'],
      ['Resolution', '1920 × 1080 and square 1080 × 1080'],
      ['Frame rate', '60 fps'],
      ['Length', '4–8 s, seamless'],
      ['Format', 'DXV (Resolume) and H.264 MP4'],
    ],
  },
  {
    id: 'oscilloscope',
    kind: 'loops',
    name: 'Oscilloscope',
    tagline: 'Waveforms drawn in light.',
    description: 'Glowing traces that look like the music is drawing itself. Clean lines on black, so they key over anything.',
    price: 15,
    checkout: '',
    sample: true,
    visual: 'scope',
    specs: [
      ['Loops', '12'],
      ['Resolution', '3840 × 2160 and 1920 × 1080'],
      ['Frame rate', '60 fps'],
      ['Length', '8 s, seamless'],
      ['Format', 'DXV (Resolume) and H.264 MP4, with alpha'],
    ],
  },

  // ─── Merch ───
  {
    id: 'oversized-tee',
    kind: 'merch',
    name: 'Oversized tee',
    tagline: 'Design to be announced.',
    description: 'Our oversized tee. The design, fabric and colours are to be announced.',
    price: 1499,
    checkout: '',
    sample: true,
    garment: 'tee',
    print: 'mark',
    colours: [
      { name: 'Black', hex: '#141414', ink: '#b8a47b' },
      { name: 'Ivory', hex: '#ece8de', ink: '#141414' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    specs: [
      ['Fit', 'Oversized'],
      ['Fabric', 'To be announced'],
      ['Design', 'To be announced'],
    ],
  },
  {
    id: 'hoodie',
    kind: 'merch',
    name: 'Hoodie',
    tagline: 'Design to be announced.',
    description: 'Our hoodie. The design, fabric and colours are to be announced.',
    price: 2499,
    checkout: '',
    sample: true,
    garment: 'hoodie',
    print: 'wordmark',
    colours: [
      { name: 'Black', hex: '#141414', ink: '#f0ede5' },
      { name: 'Charcoal', hex: '#3a3936', ink: '#b8a47b' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    specs: [
      ['Fit', 'Oversized'],
      ['Fabric', 'To be announced'],
      ['Design', 'To be announced'],
    ],
  },
  {
    id: 'cap',
    kind: 'merch',
    name: 'Cap',
    tagline: 'Design to be announced.',
    description: 'Our cap. The design, style and colours are to be announced.',
    price: 799,
    checkout: '',
    sample: true,
    garment: 'cap',
    print: 'mark',
    colours: [
      { name: 'Black', hex: '#141414', ink: '#b8a47b' },
      { name: 'Sand', hex: '#cdbf9f', ink: '#141414' },
    ],
    sizes: ['One size'],
    specs: [
      ['Style', 'To be announced'],
      ['Fit', 'Adjustable'],
      ['Design', 'To be announced'],
    ],
  },
]

export const productById = (id: string) => products.find((p) => p.id === id)
export const sectionOf = (kind: ShopKind) => SECTIONS.find((s) => s.kind === kind)!

/** "$12" or "₹1,299". */
export function price(p: Product) {
  const currency = sectionOf(p.kind).currency
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(p.price)
}
