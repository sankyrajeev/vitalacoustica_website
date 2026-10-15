import { predict } from '../assistant/model'
import { capabilities } from './capabilities'
import { fullName, gear, GEAR_GROUPS, inRig, type Gear, type GearGroup, type RigId } from './gear'
import { site } from './site'

// The site assistant's knowledge. A small model we trained ourselves (src/assistant) works out
// what the visitor is asking about; the answers are always ones we wrote, from the site's own
// content. Equipment is picked out by name. Anything it isn't sure of goes to the team on WhatsApp.

export type Action =
  | { kind: 'link'; label: string; to: string }
  | { kind: 'explore'; label: string; gear: RigId | null }
  | { kind: 'whatsapp'; label: string; text: string }
  | { kind: 'ask'; label: string; query: string; intent?: string }

export type Reply = {
  text: string
  gear?: Gear[]
  actions?: Action[]
}

export const SUGGESTIONS: Action[] = [
  { kind: 'ask', label: 'What equipment do you hire?', query: 'what equipment do you have', intent: 'equipment' },
  { kind: 'ask', label: 'How does hiring work?', query: 'how does hiring work', intent: 'process' },
  { kind: 'ask', label: 'Get a quote', query: 'i want a quote', intent: 'quote' },
  { kind: 'ask', label: 'Where do you work?', query: 'where are you based', intent: 'location' },
]

export const GREETING: Reply = {
  text: 'Hi! I’m the Vital Acoustica assistant. Ask me about our equipment, services or how hiring works, or tap one of these.',
  actions: SUGGESTIONS,
}

// below this the model is guessing, so we ask rather than answer
const SURE = 0.42

const wa = (text: string): Action => ({ kind: 'whatsapp', label: 'Ask the team on WhatsApp', text })
const quote: Action = { kind: 'link', label: 'Request a quote', to: '/contact' }

// words people use for each item, beyond its name
const ALIASES: Partial<Record<Gear['id'], string[]>> = {
  v10p: ['v10', 'v10p', 'tops', 'top', 'main speaker', 'mains', 'line array', 'd&b', 'dnb', 'db'],
  b22: ['b22', 'sub', 'subs', 'subwoofer', 'subwoofers', 'bass', 'low end'],
  art915: ['rcf', '915', 'art', 'monitor', 'monitors', 'booth monitor', 'active speaker'],
  d40: ['d40', 'amp', 'amps', 'amplifier', 'amplifiers'],
  dm3: ['dm3', 'yamaha', 'mixer', 'console', 'desk', 'foh', 'mixing'],
  cdj: ['cdj', 'cdjs', 'cdj-3000x', 'cdj3000', 'cdj 3000', 'player', 'players', 'decks', 'pioneer', 'alphatheta'],
  djm: ['djm', 'v10-lf', 'djm-v10', 'dj mixer', 'pioneer mixer'],
  di: ['di', 'di box', 'di boxes', 'bss', 'ar-133', 'ar133', 'direct box'],
  sharpy: ['sharpy', 'sharpys', 'sharpie', 'sharpies', 'beam', 'beams', 'moving head', 'moving heads'],
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

const GROUP_OF: Record<string, GearGroup> = {
  sound: 'Sound',
  infra: 'Audio Infrastructure',
  lighting: 'Stage Lighting',
  structure: 'Structure',
}

// what each intent is called when the assistant isn't sure and offers a choice
const TOPIC: Record<string, string> = {
  price: 'Prices',
  quote: 'Booking a date',
  process: 'How hiring works',
  location: 'Where we work',
  capacity: 'Crowd size',
  crew: 'Crew and setup',
  payment: 'Payment and invoices',
  installations: 'Permanent installations',
  visuals: 'Visuals',
  explore3d: 'The 3D rig',
  gear: 'Our equipment',
  equipment: 'Our equipment',
  sound: 'Sound',
  infra: 'Audio Infrastructure',
  lighting: 'Stage Lighting',
  structure: 'Structure',
  services: 'Our services',
  story: 'Our story',
  careers: 'Careers',
  contact: 'Contact',
  work: 'Our work',
}

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9&\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `

const has = (q: string, words: string[]) => words.some((w) => q.includes(` ${w} `) || (w.length > 4 && q.includes(w)))

/** Edit distance (with swapped letters counting as one edit), stopping early past `max`. */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prev2[j - 2] + 1)
    }
    if (Math.min(...row) > max) return max + 1
    prev2 = prev
    prev = row
  }
  return prev[b.length]
}

/** The equipment a message names, allowing for a typo in longer names ("subwofer", "warcarft"). */
function gearHits(q: string) {
  const words = q.trim().split(' ')
  return gear.filter((g) => {
    const names = [g.name.toLowerCase(), ...(ALIASES[g.id] ?? [])]
    if (has(q, names)) return true
    return names.some((n) => {
      if (n.length < 6 || n.includes(' ')) return false
      const max = n.length >= 8 ? 2 : 1
      return words.some((w) => w.length >= 5 && distance(w, n, max) <= max)
    })
  })
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

const notSure = (input: string): Reply => ({
  text: 'I’m not sure about that one. The team can answer it on WhatsApp, and your question is already typed in.',
  actions: [wa(`Hi Vital Acoustica, ${input.trim()}`), ...SUGGESTIONS.slice(0, 2)],
})

type Handler = (items: Gear[], input: string) => Reply

const HANDLERS: Record<string, Handler> = {
  greeting: () => GREETING,

  smalltalk: () => ({
    text: 'Doing well, thanks for asking! I’m Vital Acoustica’s assistant, a small model trained on the questions people ask us. I can help with our equipment, prices, bookings and how hiring works, and the team is a tap away on WhatsApp.',
    actions: SUGGESTIONS,
  }),

  thanks: () => ({ text: 'Anytime! Anything else I can help with?', actions: SUGGESTIONS }),

  price: (items) => ({
    text: `Every quote depends on the venue, the date, the crowd and how much of the setup you need us to run, so we price each event individually.${
      items.length === 1 ? ` For the ${fullName(items[0])}, tell` : ' Tell'
    } us a little about your event and we’ll send a clear, itemised quote, usually within a day.`,
    actions: [
      items.length === 1 ? { kind: 'link', label: 'Get a quote for this', to: `/contact?item=${items[0].id}` } : quote,
      wa(`Hi Vital Acoustica, I'd like a price for ${items.length === 1 ? `the ${fullName(items[0])}` : 'an event'}.`),
    ],
  }),

  quote: (items) => ({
    text: 'Happy to help! Send us the date, the venue and roughly how many people through the quote form, or message us on WhatsApp if that’s quicker.',
    actions: [
      items.length === 1 ? { kind: 'link', label: 'Get a quote for this', to: `/contact?item=${items[0].id}` } : quote,
      wa("Hi Vital Acoustica, I'd like to check availability for an event."),
    ],
  }),

  process: () => ({
    text: 'It’s four steps: 1) Enquire with the date, venue and audience. 2) We recommend a system and send an itemised quote. 3) We deliver, rig and cable everything, then tune the sound and focus the lights before doors. 4) Our engineer and lighting operator can run the show, and we load out afterwards.',
    actions: [quote, { kind: 'link', label: 'Browse equipment', to: '/equipment' }],
  }),

  location: () => ({
    text: 'We’re based in Bengaluru and work all over the city, across Karnataka and South India: Mysuru, Hubballi, Belagavi, Mangaluru, Hyderabad and more. For anything further, just ask.',
    actions: [quote, wa('Hi Vital Acoustica, do you cover an event in ')],
  }),

  capacity: () => ({
    text: 'Our systems are built for shows of up to around 1,000 people: club nights, open-airs, brand events and private celebrations. Tell us the crowd and the venue and we’ll size the system to fit.',
    actions: [quote],
  }),

  crew: () => ({
    text: 'Every hire includes delivery, rigging, cabling and setup. If you want, a sound engineer and a lighting operator stay through the show, and we handle load-out at the end.',
    actions: [quote],
  }),

  installations: () => ({
    text: 'We design and set up permanent sound and lighting for venues: assessment, system design, installation, tuning and training for your team.',
    actions: [
      { kind: 'link', label: 'Audio & Lighting Integration', to: '/capabilities/installations' },
      wa("Hi Vital Acoustica, I'd like to talk about a permanent installation."),
    ],
  }),

  visuals: () => ({
    text: 'Projection mapping and generative visuals are something we’re still building. Our visual experiences are coming soon. For now we do LED matrix panels and pixel mapping as part of the lighting.',
    actions: [{ kind: 'link', label: 'Visuals', to: '/capabilities/visuals' }],
  }),

  explore3d: (items) => {
    const g = items.find(inRig)
    return {
      text: g
        ? `The ${fullName(g)}, on our stage in 3D. Walk around it, tap the other lights, or fly through like a drone.`
        : 'You can walk around our stage in 3D: tap any light for its details, run the lighting desk, or fly through it like a drone.',
      actions: [{ kind: 'explore', label: g ? 'See it in 3D' : 'Open the 3D rig', gear: g?.id ?? null }],
    }
  },

  equipment: () => ({
    text: `We hire out ${gear.length} kinds of kit in four groups. Which would you like to see?`,
    actions: GEAR_GROUPS.filter((g) => gear.some((x) => x.group === g)).map(
      (g) => ({ kind: 'ask', label: g, query: g, intent: Object.keys(GROUP_OF).find((k) => GROUP_OF[k] === g) }) as Action,
    ),
  }),

  payment: () => ({
    text: `Payment terms, including any advance to hold your date, are set out in your quote, and we send a GST invoice (GSTIN ${site.gst}). Ask the team if you need something specific.`,
    actions: [quote, wa('Hi Vital Acoustica, a question about payment: ')],
  }),

  services: () => ({
    text: `We do ${capabilities.map((c) => c.name.toLowerCase()).join(', ')}: hire the kit on its own, or with the crew to design, set up and run the night.`,
    actions: [{ kind: 'link', label: 'Our services', to: '/capabilities' }, quote],
  }),

  story: () => ({
    text: 'Vital Acoustica was started by two best friends, Sankarsh and Harsh, who loved music and wanted shows to sound and feel the way they should.',
    actions: [{ kind: 'link', label: 'Read our story', to: '/story' }],
  }),

  careers: () => ({
    text: 'The crew is full right now, but we’d still love to hear from you.',
    actions: [{ kind: 'link', label: 'Careers', to: '/careers' }],
  }),

  contact: () => ({
    text: `You can reach us on WhatsApp or phone at ${site.contact.phone}, by email at ${site.contact.email}, or on Instagram at @${site.contact.instagram}.`,
    actions: [wa('Hi Vital Acoustica, '), quote],
  }),

  work: () => ({
    text: 'Have a look at some of the shows we’ve put on.',
    actions: [
      { kind: 'link', label: 'Our work', to: '/work' },
      { kind: 'link', label: 'Testimonials', to: '/testimonials' },
    ],
  }),

  unknown: (_, input) => ({
    text: 'That one’s outside what I know. I can help with our equipment, services and bookings, and the team is happy to chat on WhatsApp.',
    actions: [wa(`Hi Vital Acoustica, ${input.trim()}`), ...SUGGESTIONS.slice(0, 2)],
  }),
}

// a question about one of these with an item named in it is a question about that item
const ABOUT_ITEMS = new Set(['gear', 'equipment', 'sound', 'infra', 'lighting', 'structure', 'greeting', 'thanks', 'capacity', 'unknown'])

for (const [intent, group] of Object.entries(GROUP_OF)) {
  HANDLERS[intent] = () => ({
    text: `Our ${group.toLowerCase()} for hire:`,
    gear: gear.filter((g) => g.group === group),
    actions: [{ kind: 'link', label: `See ${group}`, to: '/equipment' }, quote],
  })
}
// asked about a specific item that isn't one of ours
HANDLERS.gear = (_, input) => ({
  ...HANDLERS.equipment([], input),
  text: 'I couldn’t find that in our equipment. Here’s what we hire out, or ask the team, as we can often source more.',
  actions: [...(HANDLERS.equipment([], input).actions ?? []), wa(`Hi Vital Acoustica, ${input.trim()}`)],
})

/**
 * Finds the best answer to a visitor's message. Pass `intent` when the visitor tapped a
 * suggestion, so we already know what they mean.
 */
export async function answer(input: string, intent?: string): Promise<Reply> {
  const items = gearHits(norm(input))
  let topic = intent
  if (!topic) {
    let ranked: Awaited<ReturnType<typeof predict>>
    try {
      ranked = await predict(input)
    } catch {
      // the model didn't load (offline?): answer what we can by name
      return items.length ? gearReply(items) : notSure(input)
    }
    const [best, next] = ranked
    if (items.length && (ABOUT_ITEMS.has(best.intent) || best.p < SURE)) return gearReply(items)
    if (best.p < SURE) {
      // two good guesses: ask which one they meant
      const guesses = [best, next].filter((g) => TOPIC[g.intent] && g.p > 0.15)
      if (guesses.length && best.intent !== 'unknown') {
        return {
          text: 'Just to check, are you asking about one of these?',
          actions: [
            ...guesses.map((g) => ({ kind: 'ask', label: TOPIC[g.intent], query: TOPIC[g.intent], intent: g.intent }) as Action),
            wa(`Hi Vital Acoustica, ${input.trim()}`),
          ],
        }
      }
      return notSure(input)
    }
    topic = best.intent
  }
  return HANDLERS[topic]?.(items, input) ?? notSure(input)
}
