// Single source of truth for brand copy and business details.
// Edit text here and it updates everywhere on the site.

export const site = {
  name: 'Vital Acoustica',
  domain: 'vitalacoustica.com',
  eyebrow: 'Independent creative production',
  headline: 'We shape the way an experience feels.',
  supporting: 'Sound, light and production. Conceived as one.',
  intro:
    'Sound, light and production, conceived as one. We create carefully considered experiences where technical precision meets creative intent.',
  bpm: 124,

  // Approved brand lines — use sparingly, one at a time.
  lines: {
    felt: 'Sound is felt. Light is experienced.',
    equipment: 'Production is more than equipment.',
    purpose: 'Every detail has a purpose.',
    intent: 'Designed with intent. Engineered with precision.',
    noise: 'Less noise. More intention.',
    space: 'Where sound meets space.',
    selective: 'Selective by design.',
    precision: 'Precision behind the experience.',
    different: 'A different kind of production.',
    built: 'Built around the experience.',
    art: 'The art of how it feels.',
    exceptional: 'Let’s shape something exceptional.',
  },

  nav: [
    { label: 'Work', to: '/work' },
    { label: 'Capabilities', to: '/capabilities' },
    { label: 'Studio', to: '/studio' },
  ],

  /*
   * TODO (Vital Acoustica): fill these in. Anything left empty is simply not shown.
   */
  contact: {
    email: '' as string,
    phone: '' as string,
    whatsapp: '' as string, // digits only with country code, e.g. 919800000000
    instagram: '' as string, // handle without @
    location: '' as string, // e.g. 'Bangalore, India' — only once approved for publication
  },

  /*
   * Where the enquiry form sends submissions. Set ONE of these:
   *  - Formspree:  endpoint 'https://formspree.io/f/<form-id>'
   *  - FormSubmit: endpoint 'https://formsubmit.co/ajax/<your-email>' (confirm the first email it sends you)
   *  - Web3Forms:  endpoint 'https://api.web3forms.com/submit' plus accessKey
   * Can also be set at build time with VITE_ENQUIRY_ENDPOINT / VITE_ENQUIRY_KEY.
   */
  enquiry: {
    endpoint: (import.meta.env.VITE_ENQUIRY_ENDPOINT as string | undefined) ?? '',
    accessKey: (import.meta.env.VITE_ENQUIRY_KEY as string | undefined) ?? '',
  },
}
