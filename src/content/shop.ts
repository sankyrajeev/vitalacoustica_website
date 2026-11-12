// The shop: software, sample packs and VJ loops (digital, sold worldwide) and merch (printed on demand in India).
//
// How buying works (see docs/shop-setup.md):
// - Software is sold through Paddle and licensed through customer accounts: give a product its `paddlePrice`
//   (docs/accounts.md). The buyer's licence key is emailed and kept in their account.
// - Audio packs and VJ loops are sold through Gumroad. Gumroad stores the files, takes the payment
//   (cards, PayPal, UPI), handles tax for buyers abroad and emails the download. Paste each product's
//   Gumroad link into `checkout` and its Buy button opens Gumroad's checkout over our page.
// - Merch is printed and shipped per order by a print-on-demand partner (Qikink). Paste the product's
//   payment or store link into `checkout`.
// Until `checkout` is filled in, the product shows as coming soon with a "Tell me when it's out" button.
//
// DUMMY: the audio packs and VJ loops below are samples, to show how the shop will look. The merch is
// our first collection (the designs are final; it's on sale once `checkout` is filled in).

export type ShopKind = 'software' | 'audio' | 'loops' | 'merch'

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
  photo?: string // product photo or mock-up in public/shop/
  gallery?: string[] // more views, e.g. the back
}

/** Our own plugins, apps and show hardware. */
export type Software = Base & {
  kind: 'software'
  /** what sort of thing it is, on cards and the item page */
  type: string
  /** the generated cover, until real screenshots replace it */
  art: 'vanta' | 'vanta-dynamics' | 'orbit' | 'lumiere' | 'resident' | 'pixelforge'
  features: string[]
  specs: [string, string][]
  /** fine print under the specs, e.g. other companies' trademarks the product works with */
  notice?: string
  /**
   * The product's Paddle price id (pri_…). With it, and VITE_PADDLE_CLIENT_TOKEN set when the site is
   * built, Buy opens Paddle's checkout; the licence key arrives by email and in the buyer's account
   * (docs/accounts.md). Hardware can't be sold through Paddle, so it keeps `checkout` instead.
   */
  paddlePrice?: string
  /** real screenshots for the product page (files in public/), first shown first; cards keep the cover */
  screenshots?: { src: string; caption: string }[]
}

export type Product = Software | AudioPack | Loop | Merch

export const SECTIONS: {
  kind: ShopKind
  title: string
  line: string
  currency: 'USD' | 'INR'
  note: string
}[] = [
  {
    kind: 'merch',
    title: 'Merch',
    line: 'Oversized tees, hoodies and caps to wear to the next show. Printed when you order, so nothing goes to waste.',
    currency: 'INR',
    note: 'Printed to order and shipped across India in about a week.',
  },
  {
    kind: 'software',
    title: 'Software',
    line: 'Plugins and show software made by Vital Acoustica: instruments, mixing tools, and lighting that follows the DJ.',
    currency: 'USD',
    note: 'Launching soon. Instant download with a licence key by email.',
  },
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
]

export const products: Product[] = [
  // ─── Software: launching soon (no prices or checkout links yet) ───
  // DUMMY: formats, systems and licence terms below are the plans in each project's own docs;
  // confirm them against the release builds before the checkout links go in.
  {
    id: 'vanta',
    kind: 'software',
    name: 'VANTA',
    type: 'Synthesizer plugin',
    tagline: 'Sound, reconstructed. Launching soon.',
    description:
      'A synthesizer that listens to a sound and rebuilds it as a patch you can play. Drop a sample into the Sample Lab and VANTA analyses it, reconstructs it from wavetable, additive and noise layers, and scores every attempt against the original, so it measures itself. Then play it, shape it and modulate it like any synth. Launching soon.',
    price: 0,
    checkout: '',
    art: 'vanta',
    features: [
      'Sample Lab: analyse a sound, rebuild it, compare and improve, then play it',
      'Three wavetable oscillators with unison and FM, plus a sub and 11 noise types',
      '12 filter types, including ladder, comb and formant',
      'Four envelopes, four LFOs and four macros, with drag-and-drop modulation',
      'Nine effects in a chain you can reorder',
      'VANTA Dynamics included: its opto compressor and OTT as an effect for any track',
      'Over 200 factory presets in nine categories, with Brightness, Space, Movement and Drive macros',
      'Works offline: no account, no cloud, no subscription',
    ],
    specs: [
      ['Type', 'Synthesizer'],
      ['Formats', 'VST3 · AU · Standalone'],
      ['Systems', 'macOS 11 or later (Apple Silicon and Intel) · Windows 10 and 11, 64-bit'],
      ['Licence', 'Perpetual, for two computers'],
    ],
  },
  {
    id: 'vanta-dynamics',
    kind: 'software',
    name: 'VANTA Dynamics',
    type: 'Effect plugin',
    tagline: 'VANTA’s dynamics, on any track. Free with VANTA. Launching soon.',
    description:
      'The two dynamics processors from VANTA as an effect of their own: a smooth optical compressor, and a multiband compressor that pushes quiet detail up and pulls loud peaks down at the same time. Put them on any track, bus or synth. Included free with VANTA, or on its own. Launching soon.',
    price: 0,
    checkout: '',
    art: 'vanta-dynamics',
    features: [
      'Optical compressor for smooth, musical levelling',
      'Multiband upward and downward compression for density and detail',
      'Included free with VANTA: a VANTA licence switches it on too',
      'Works offline: no account, no cloud, no subscription',
    ],
    specs: [
      ['Type', 'Dynamics effect'],
      ['Formats', 'VST3 · AU'],
      ['Systems', 'macOS 11 or later · Windows 10 and 11, 64-bit'],
    ],
  },
  {
    id: 'orbit',
    kind: 'software',
    name: 'ORBIT',
    type: 'Mixing system',
    tagline: 'One mixing system across your whole session. Launching soon.',
    description:
      'An ORBIT Node on every track and ORBIT Master on the mix bus. Each Node analyses its own track; the Master hears the whole mix, finds where tracks fight (kick and bass, masking in the mids, low-end build-up, a harsh top end) and sends each Node a suggestion with its reason. Take the suggestions, let ORBIT apply them within limits you set, or mix by hand. Without the Master, every Node is still a full channel strip. Launching soon.',
    price: 0,
    checkout: '',
    art: 'orbit',
    features: [
      'Two plugins that work together: ORBIT Master and ORBIT Node',
      'You name each track’s role; ORBIT never guesses',
      'Assist (suggestions only), Adaptive (applied within your limits) or Manual',
      'Kick and bass handled together: a cut that follows the kick, and ducking',
      'Optional reference track, analysed on your computer, with a loudness-matched A/B',
      'Layer and polarity checks for stacked sounds',
      'A simple view with five knobs, and an advanced view with everything',
      'Nothing goes to the cloud',
    ],
    specs: [
      ['Type', 'Mixing system: Master and Node plugins'],
      ['Formats', 'VST3 · AU'],
      ['Systems', 'macOS and Windows, versions to be announced'],
      ['Latency', 'Node: none · Master: about 1.5 ms'],
    ],
  },
  {
    id: 'lumiere-link',
    kind: 'software',
    name: 'Lumière Link',
    type: 'Lighting software',
    tagline: 'Lighting that follows the DJ. Launching soon.',
    description:
      'Lumière Link listens to the CDJs and the mixer over Pro DJ Link, the network cable the decks already use, and drives Lightkey in time with the music. Tempo goes across as MIDI clock, so the lights follow the master deck, pitch fader and all. Cues fire on the music’s phrases: a new look every few bars, a blackout before the drop, the hit when it lands, and lights that build with the riser. Launching soon.',
    price: 0,
    checkout: '',
    art: 'lumiere',
    features: [
      'Reads up to six players and the mixer over Pro DJ Link: no audio cable, no internet',
      'MIDI clock to Lightkey that follows the master deck, pitch fader included',
      'Phrase cues from rekordbox phrase data, with the waveform as a fallback',
      'Optional live-audio backup from the front-of-house desk for tracks without rekordbox data',
      'Pools of up to 24 sequences, mapped once in Lightkey',
      'A new look every 4, 8, 16 or 32 bars, a blackout before the drop, and builds that follow the riser',
      'Follow the tempo master, the on-air deck, or lock to one deck',
      'Light delay, cue log and manual pads for the show',
    ],
    specs: [
      ['Type', 'Lighting automation app'],
      ['System', 'macOS (Apple Silicon and Intel)'],
      ['Works with', 'Pioneer DJ players and mixers on Pro DJ Link (tested with CDJ-3000X and DJM-V10)'],
      ['Lighting', 'Lightkey, on the same Mac'],
      ['Network', 'The DJ network switch; no router or internet needed'],
    ],
    notice:
      'Pioneer DJ, Pro DJ Link, CDJ, DJM and rekordbox are trademarks of their owners, and Lightkey is a trademark of its developer. Lumière Link works with them and is not made, endorsed or supported by them.',
  },
  {
    id: 'pixel-forge',
    kind: 'software',
    name: 'Pixel Forge',
    type: 'LED pixel mapping',
    tagline: 'Pixel-perfect LED lighting, live. Launching soon.',
    description:
      'Pixel Forge turns your Mac or PC into a real-time LED pixel-mapping desk for strips, ropes, panels and matrices. Mix two decks of living effects, layer dimmer chases that follow the beat, build looks, sequences and cues, and send it all to your lights over Art-Net, sACN, USB DMX or a video output, with no channel limit. Try every feature free in demo mode; a licence turns on output, on one computer at a time. Launching soon.',
    price: 0,
    checkout: '',
    art: 'pixelforge',
    features: [
      'Over 20 effects, from plasma, fire and rainbows to a 16-pattern RGB matrix, text, pictures and video',
      'Sound-to-light: spectrum, level, waveform, beat flashes and bursts',
      'Two decks with a crossfader and blend modes, or one deck with Preview and Take',
      '21 beat-synced dimmer effects, across the whole rig or row by row',
      'Looks, sequences in beats or seconds, and a cue list for the show, with MIDI learn',
      'BPM from tap, the music or a MIDI clock; master dimmer, Blackout, Freeze and White Out',
      'Patch strips, ropes and matrices in minutes, and find each fixture’s colour order',
      '2D preview and a 3D view of the rig; web remote and REST API',
      'Art-Net, sACN, ENTTEC USB DMX and full-screen video output, with no channel or universe limit',
    ],
    specs: [
      ['Type', 'LED pixel mapping and lighting control'],
      ['Version', '1.0'],
      ['Output', 'Art-Net · sACN (E1.31) · ENTTEC DMX USB Pro · full-screen video (DVI/HDMI)'],
      ['Limits', 'No channel, universe or fixture limit'],
      ['Control', 'MIDI (notes, CC, clock) · web remote · REST API · keyboard'],
      ['Systems', 'macOS 11 or later, Apple Silicon and Intel (separate downloads) · Windows 10 and 11, 64-bit'],
      ['Licence', 'Free demo without output, on any computer · licence: output on one computer at a time, move it any time'],
    ],
    screenshots: [
      { src: 'shop/pixel-forge/01-main-window.webp', caption: 'Two decks, one crossfader, live on your LEDs.' },
      { src: 'shop/pixel-forge/02-dimmer-effects.webp', caption: 'Beat-synced dimmer effects, whole rig or row by row.' },
      { src: 'shop/pixel-forge/03-cue-list.webp', caption: 'Cues that stack looks and sequences.' },
      { src: 'shop/pixel-forge/04-sequences.webp', caption: 'Sequences in beats: fades, steps, loops.' },
      { src: 'shop/pixel-forge/05-3d-view.webp', caption: 'See your rig in 3D.' },
      { src: 'shop/pixel-forge/06-patch-editor.webp', caption: 'Patch strips, ropes and matrices in minutes.' },
    ],
    notice:
      'Pixel Forge can produce flashing and strobing light: use strobe effects responsibly and warn audiences where required. Art-Net is a trademark of Artistic Licence and ENTTEC of its owner; Pixel Forge works with them and is not made or endorsed by them.',
  },
  {
    id: 'lumiere-resident',
    kind: 'software',
    name: 'Lumière Resident',
    type: 'Venue hardware',
    tagline: 'The lighting box that stays at the venue. Launching soon.',
    description:
      'Lumière Link in a box of its own, with no laptop. Plug it into the DJ network and the lighting, and the lights follow every set through the night, with nobody at the desk. If the music stops, it falls back to a house look. Set it up and check on it from a phone. Launching soon.',
    price: 0,
    checkout: '',
    art: 'resident',
    features: [
      'Runs Lumière Link on its own: no laptop at the booth',
      'Follows every DJ on Pro DJ Link, all night',
      'Falls back to a house look when the music stops',
      'Controlled from a phone browser',
      'DMX out for the venue’s lighting',
    ],
    specs: [
      ['Type', 'Venue lighting controller'],
      ['Inside', 'Lumière Link with QLC+ lighting software'],
      ['Output', 'DMX, one universe (512 channels)'],
      ['Control', 'Phone or tablet browser'],
    ],
    notice:
      'Pioneer DJ, Pro DJ Link and rekordbox are trademarks of their owners. Lumière Resident works with them and is not made, endorsed or supported by them.',
  },

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

  // ─── Merch: collection 01, launching soon ───
  {
    id: 'oversized-tee',
    photo: 'shop/room-tee-back.webp',
    gallery: ['shop/room-tee-front.webp'],
    kind: 'merch',
    name: 'The Room Is the Instrument',
    tagline: 'Oversized tee. Launching soon.',
    description:
      'On the back, a coverage map: a pair of mains in a 24 by 23 metre room, the sound pressure drawn as contour lines, the way we plan a system before it goes in. The mark on the chest. Launching soon.',
    price: 1499,
    checkout: '',
    garment: 'tee',
    print: 'mark',
    colours: [{ name: 'Black', hex: '#141414', ink: '#b8a47b' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    specs: [
      ['Fit', 'Oversized'],
      ['Print', 'Coverage map on the back, mark on the chest'],
      ['Inks', 'White and brass'],
    ],
  },
  {
    id: 'feel-it-tee',
    photo: 'shop/feel-tee-front.webp',
    gallery: ['shop/feel-tee-back.webp'],
    kind: 'merch',
    name: 'Feel It',
    tagline: 'Oversized tee. Launching soon.',
    description:
      'A third-octave analyser across the front, 20 Hz to 20 kHz, the low end lit in brass: feel it before you hear it. A small mark below the collar. Launching soon.',
    price: 1499,
    checkout: '',
    garment: 'tee',
    print: 'mark',
    colours: [{ name: 'Bone', hex: '#e9e3d5', ink: '#151515' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    specs: [
      ['Fit', 'Oversized'],
      ['Print', 'Spectrum on the front, mark on the back'],
      ['Inks', 'Black and dark brass'],
    ],
  },
  {
    id: 'hoodie',
    photo: 'shop/haze-hoodie.webp',
    kind: 'merch',
    name: 'Haze',
    tagline: 'Hoodie. Launching soon.',
    description:
      'A truss of moving heads throwing crossed beams through haze, drawn in halftone dots, landing on the mark. Launching soon.',
    price: 2499,
    checkout: '',
    garment: 'hoodie',
    print: 'wordmark',
    colours: [{ name: 'Black', hex: '#141414', ink: '#f0ede5' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    specs: [
      ['Fit', 'Oversized'],
      ['Print', 'Beams and the mark on the front'],
      ['Inks', 'White and brass'],
    ],
  },
  {
    id: 'cap',
    photo: 'shop/cap-mark.webp',
    kind: 'merch',
    name: 'The Mark',
    tagline: 'Cap. Launching soon.',
    description: 'The VA mark embroidered on the front in two threads, white and gold. ACOUSTICA on the side. Launching soon.',
    price: 799,
    checkout: '',
    garment: 'cap',
    print: 'mark',
    colours: [{ name: 'Black', hex: '#141414', ink: '#b8a47b' }],
    sizes: ['One size'],
    specs: [
      ['Style', 'Curved peak'],
      ['Fit', 'Adjustable'],
      ['Finish', 'Embroidered, two threads'],
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
