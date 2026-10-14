// Single source of truth for business copy and details.
// Edit text here and it updates everywhere on the site.

export const site = {
  name: 'Vital Acoustica',
  domain: 'vitalacoustica.com',
  tagline: 'Experience, Amplified.',
  descriptor: 'Pro Audio · Lighting · Rentals',
  homeBase: 'Bangalore',
  region: 'South India',
  maxCapacity: 1000,
  bpm: 124,

  // TODO: fill in once confirmed — sections that need these hide gracefully while empty.
  contact: {
    phone: '' as string,
    whatsapp: '' as string, // digits only with country code, e.g. 919800000000
    email: '' as string,
    instagram: '' as string, // handle without @
  },

  cities: ['Bangalore', 'Mysore', 'Hubli', 'Belgaum', 'Mangalore', 'Hyderabad'],

  nav: [
    { label: 'Shows', href: '#shows' },
    { label: 'The rig', href: '#rig' },
    { label: 'Services', href: '#services' },
    { label: 'Reach', href: '#reach' },
    { label: 'Contact', href: '#contact' },
  ],

  stats: [
    { value: '1,000', label: 'Guests per show, max capacity' },
    { value: '6+', label: 'Cities across South India' },
    { value: '1 crew', label: 'Sound, light, visuals — end to end' },
  ],

  services: [
    {
      id: 'production',
      index: '01',
      title: 'Event Production & Rentals',
      body:
        'd&b tops and subs, sharpies, LED and haze, plus the crew who run them. Built for techno and house, from warehouse floors to 1,000-capacity rooms.',
      tags: ['Sound systems', 'Stage lighting', 'Crew & operation'],
    },
    {
      id: 'installations',
      index: '02',
      title: 'Permanent Installations',
      body:
        'Consulting, system design and installation for clubs, bars and venues that need their room to sound and look right every single night.',
      tags: ['Consulting', 'System design', 'Install & tuning'],
    },
    {
      id: 'mapping',
      index: '03',
      title: '3D Projection Mapping',
      body:
        'Visual content mapped onto stages, walls and structures — turning the venue itself into part of the show.',
      tags: ['Stage mapping', 'Visual content', 'LED & projection'],
      badge: 'New',
    },
    {
      id: 'experience',
      index: '04',
      title: 'Experience Design',
      body:
        'Lights programmed to the music, sound tuned to the room, timing planned with the artist. The difference between a rental and a night people remember.',
      tags: ['Show design', 'Programming', 'Artist liaison'],
    },
  ],
} as const

export type Service = (typeof site.services)[number]
