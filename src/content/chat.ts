import { capabilities } from './capabilities'
import { fullName, gear, GEAR_GROUPS, inRig, type Gear, type GearGroup, type RigId } from './gear'
import { site } from './site'

// The site assistant's knowledge. It answers from the site's own content (equipment,
// services, how hiring works) and hands anything else to the team on WhatsApp.
// No AI and no server: questions are matched by keywords, so answers are always ones we wrote.

export type Action =
  | { kind: 'link'; label: string; to: string }
  | { kind: 'explore'; label: string; gear: RigId | null }
  | { kind: 'whatsapp'; label: string; text: string }
  | { kind: 'ask'; label: string; query: string }

export type Reply = {
  text: string
  gear?: Gear[]
  actions?: Action[]
}

export const SUGGESTIONS: Action[] = [
  { kind: 'ask', label: 'What equipment do you hire?', query: 'equipment' },
  { kind: 'ask', label: 'How does hiring work?', query: 'how does hiring work' },
  { kind: 'ask', label: 'Get a quote', query: 'quote' },
  { kind: 'ask', label: 'Where do you work?', query: 'where' },
]

export const GREETING: Reply = {
  text: 'Hi! I’m the Vital Acoustica assistant. Ask me about our equipment, services or how hiring works, or tap one of these.',
  actions: SUGGESTIONS,
}

const wa = (text: string): Action => ({ kind: 'whatsapp', label: 'Ask the team on WhatsApp', text })
const quote: Action = { kind: 'link', label: 'Request a quote', to: '/contact' }

// words people use for each item, beyond its name
const ALIASES: Partial<Record<Gear['id'], string[]>> = {
  v10p: ['v10', 'v10p', 'tops', 'top', 'main speaker', 'mains', 'line array', 'd&b', 'dnb', 'db'],
  b22: ['b22', 'sub', 'subs', 'subwoofer', 'subwoofers', 'bass', 'low end'],
  art915: ['rcf', '915', 'art', 'monitor', 'monitors', 'booth monitor', 'active speaker'],
  d40: ['d40', 'amp', 'amps', 'amplifier', 'amplifiers'],
  dm3: ['dm3', 'yamaha', 'mixer', 'console', 'desk', 'foh', 'mixing'],
  cdj: ['cdj', 'cdj-3000x', 'cdj3000', 'cdj 3000', 'player', 'players', 'decks', 'pioneer', 'alphatheta'],
  djm: ['djm', 'v10-lf', 'djm-v10', 'dj mixer', 'pioneer mixer'],
  di: ['di', 'di box', 'bss', 'ar-133', 'ar133', 'direct box'],
  sharpy: ['sharpy', 'sharpies', 'beam', 'beams', 'moving head', 'moving heads'],
  trefoil: ['fan', 'fan light', '3 blade', '3-blade', 'three blade', 'trefoil', 'ati'],
  hex: ['hex', 'hexagon', 'honeycomb'],
  warcraft: ['warcraft', 'searchlight', 'gold'],
  matrix: ['matrix', 'led panel', 'panel', 'panels', 'dot matrix'],
  pixelbar: ['pixel bar', 'pixel bars', 'pixelbar', 'pixel'],
  dotbar: ['washer', 'wall washer', 'wash bar', 'led bar', 'led bars'],
  rope: ['neon', 'neon flex', 'rope', 'rope light', 'flex'],
  truss: ['truss', 'goal post', 'goalpost', 'tower', 'rigging'],
  table: ['table', 'quickie', 'dj table', 'stand'],
}

const GROUP_WORDS: [GearGroup, string[]][] = [
  ['Sound', ['sound', 'speaker', 'speakers', 'audio', 'pa', 'sound system']],
  ['Audio Infrastructure', ['dj', 'dj setup', 'dj gear', 'control', 'mixers', 'infrastructure']],
  ['Stage Lighting', ['light', 'lights', 'lighting', 'led', 'leds', 'retro']],
  ['Structure', ['structure', 'staging', 'stage']],
]

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9&\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `

const has = (q: string, words: string[]) => words.some((w) => q.includes(` ${w} `) || (w.length > 4 && q.includes(w)))

function gearHits(q: string) {
  return gear.filter((g) => has(q, [g.name.toLowerCase(), ...(ALIASES[g.id] ?? [])]))
}

function gearReply(items: Gear[]): Reply {
  if (items.length === 1) {
    const g = items[0]
    return {
      text: `${fullName(g)}: ${g.about} We have ${g.stock}.`,
      gear: [g],
      actions: [
        { kind: 'link', label: 'Full details', to: `/equipment/${g.id}` },
        ...(inRig(g) ? [{ kind: 'explore', label: 'View in 3D', gear: g.id } satisfies Action] : []),
        { kind: 'link', label: 'Get a quote for this', to: `/contact?item=${g.id}` },
      ],
    }
  }
  return {
    text: 'Here’s what we have that matches:',
    gear: items.slice(0, 6),
    actions: [{ kind: 'link', label: 'See all equipment', to: '/equipment' }, quote],
  }
}

/** Finds the best answer to a visitor's message. */
export function answer(input: string): Reply {
  const q = norm(input)

  if (has(q, ['hi', 'hello', 'hey', 'hii', 'yo', 'namaste', 'good morning', 'good evening'])) {
    if (q.trim().split(' ').length <= 3) return GREETING
  }
  if (has(q, ['thanks', 'thank you', 'thx', 'cheers', 'great', 'awesome', 'cool'])) {
    return { text: 'Anytime! Anything else I can help with?', actions: SUGGESTIONS }
  }

  if (has(q, ['price', 'prices', 'pricing', 'cost', 'costs', 'rate', 'rates', 'charge', 'charges', 'budget', 'how much', 'rent', 'rental cost', 'fees'])) {
    return {
      text: 'Every quote depends on the venue, the date, the crowd and how much of the setup you need us to run, so we price each event individually. Tell us a little about yours and we’ll send a clear, itemised quote, usually within a day.',
      actions: [quote, wa('Hi Vital Acoustica, I’d like a price for an event.')],
    }
  }

  if (has(q, ['quote', 'book', 'booking', 'available', 'availability', 'hire', 'reserve', 'enquire', 'enquiry', 'inquiry'])) {
    return {
      text: 'Happy to help! Send us the date, the venue and roughly how many people through the quote form, or message us on WhatsApp if that’s quicker.',
      actions: [quote, wa('Hi Vital Acoustica, I’d like to check availability for an event.')],
    }
  }

  if (has(q, ['how does', 'how do', 'process', 'steps', 'work with you', 'hiring work', 'what happens'])) {
    return {
      text: 'It’s four steps: 1) Enquire with the date, venue and audience. 2) We recommend a system and send an itemised quote. 3) We deliver, rig and cable everything, then tune the sound and focus the lights before doors. 4) Our engineer and lighting operator can run the show, and we load out afterwards.',
      actions: [quote, { kind: 'link', label: 'Browse equipment', to: '/equipment' }],
    }
  }

  if (has(q, ['where', 'location', 'located', 'city', 'cities', 'travel', 'outstation', 'bangalore', 'bengaluru', 'karnataka', 'hyderabad', 'mysore', 'mangalore', 'hubli', 'goa', 'chennai', 'kerala'])) {
    return {
      text: 'We’re based in Bengaluru and work across Karnataka and South India: Mysuru, Hubballi, Belagavi, Mangaluru, Hyderabad and more. For anything further, just ask.',
      actions: [quote, wa('Hi Vital Acoustica, do you cover an event in ')],
    }
  }

  if (has(q, ['how many people', 'capacity', 'crowd', 'audience', 'pax', 'guests', 'how big', 'crowd size'])) {
    return {
      text: 'Our systems are built for shows of up to around 1,000 people: club nights, open-airs, brand events and private celebrations. Tell us the crowd and the venue and we’ll size the system to fit.',
      actions: [quote],
    }
  }

  if (has(q, ['installations', 'installation', 'installs', 'install for', 'install in', 'permanent', 'integration', 'fit out', 'fitout', 'club install', 'restaurant', 'lounge', 'consult', 'consulting'])) {
    return {
      text: 'We design and set up permanent sound and lighting for venues: assessment, system design, installation, tuning and training for your team.',
      actions: [{ kind: 'link', label: 'Audio & Lighting Integration', to: '/capabilities/installations' }, wa('Hi Vital Acoustica, I’d like to talk about a permanent installation.')],
    }
  }

  if (has(q, ['visual', 'visuals', 'projection', 'mapping', 'projection mapping', 'video', 'screen'])) {
    return {
      text: 'Projection mapping and generative visuals are something we’re still building. Our visual experiences are coming soon. For now we do LED matrix panels and pixel mapping as part of the lighting.',
      actions: [{ kind: 'link', label: 'Visuals', to: '/capabilities/visuals' }],
    }
  }

  if (has(q, ['3d', 'model', 'rig', 'drone', 'virtual', 'stage model'])) {
    return {
      text: 'You can walk around our stage in 3D: tap any light for its details, run the lighting desk, or fly through it like a drone.',
      actions: [{ kind: 'explore', label: 'Open the 3D rig', gear: null }],
    }
  }

  const hits = gearHits(q)
  if (hits.length) return gearReply(hits)

  for (const [group, words] of GROUP_WORDS) {
    if (has(q, words)) {
      const items = gear.filter((g) => g.group === group)
      return {
        text: `Our ${group.toLowerCase()} for hire:`,
        gear: items,
        actions: [{ kind: 'link', label: `See ${group}`, to: '/equipment' }, quote],
      }
    }
  }

  if (has(q, ['crew', 'operator', 'engineer', 'technician', 'setup', 'set up', 'install', 'delivery', 'deliver', 'transport', 'run the show'])) {
    return {
      text: 'Every hire includes delivery, rigging, cabling and setup. If you want, a sound engineer and a lighting operator stay through the show, and we handle load-out at the end.',
      actions: [quote],
    }
  }

  if (has(q, ['equipment', 'gear', 'inventory', 'catalogue', 'catalog', 'what do you have', 'what do you hire', 'list'])) {
    return {
      text: `We hire out ${gear.length} kinds of kit in four groups. Which would you like to see?`,
      actions: GEAR_GROUPS.filter((g) => gear.some((x) => x.group === g)).map((g) => ({ kind: 'ask', label: g, query: g }) as Action),
    }
  }

  if (has(q, ['service', 'services', 'what do you do', 'offer', 'offering'])) {
    return {
      text: `We do ${capabilities.map((c) => c.name.toLowerCase()).join(', ')}: hire the kit on its own, or with the crew to design, set up and run the night.`,
      actions: [{ kind: 'link', label: 'Our services', to: '/capabilities' }, quote],
    }
  }

  if (has(q, ['who', 'founder', 'founders', 'story', 'about', 'team', 'sankarsh', 'harsh', 'owner'])) {
    return {
      text: 'Vital Acoustica was started by two best friends, Sankarsh and Harsh, who loved music and wanted shows to sound and feel the way they should.',
      actions: [{ kind: 'link', label: 'Read our story', to: '/story' }],
    }
  }

  if (has(q, ['job', 'jobs', 'career', 'careers', 'hiring you', 'work for', 'join', 'vacancy', 'internship'])) {
    return {
      text: 'The crew is full right now, but we’d still love to hear from you.',
      actions: [{ kind: 'link', label: 'Careers', to: '/careers' }],
    }
  }

  if (has(q, ['contact', 'phone', 'call', 'number', 'email', 'mail', 'whatsapp', 'talk', 'human', 'person', 'someone'])) {
    return {
      text: `You can reach us on WhatsApp or phone at ${site.contact.phone}, or by email at ${site.contact.email}.`,
      actions: [wa('Hi Vital Acoustica, '), quote],
    }
  }

  if (has(q, ['work', 'shows', 'events', 'portfolio', 'past', 'previous', 'photos', 'gigs'])) {
    return {
      text: 'Have a look at some of the shows we’ve put on.',
      actions: [{ kind: 'link', label: 'Our work', to: '/work' }, { kind: 'link', label: 'Testimonials', to: '/testimonials' }],
    }
  }

  return {
    text: 'I’m not sure about that one. The team can answer it on WhatsApp, and your question is already typed in.',
    actions: [wa(`Hi Vital Acoustica, ${input.trim()}`), ...SUGGESTIONS.slice(0, 2)],
  }
}
