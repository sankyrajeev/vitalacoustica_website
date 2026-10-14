// Single source of truth for brand copy and business details.
// Edit text here and it updates everywhere on the site.

export const site = {
  name: 'Vital Acoustica',
  domain: 'vitalacoustica.com',
  eyebrow: 'Sound & lighting rental · Production',
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

  // what the company does, in one plain sentence (homepage hero, meta description)
  rental:
    'Professional sound and lighting hire, with the crew to run it. d&b audiotechnik systems, beam and LED lighting, delivered, set up and operated for club nights, festivals, brand events and private celebrations.',

  nav: [
    { label: 'Equipment', to: '/equipment' },
    { label: 'Services', to: '/capabilities' },
    { label: 'Work', to: '/work' },
    { label: 'Studio', to: '/studio' },
  ],

  /*
   * Contact details. Anything left empty is simply not shown.
   * DUMMY: the values below are stand-ins — replace with the real ones.
   */
  contact: {
    email: 'hello@vitalacoustica.com' as string, // DUMMY
    phone: '+91 98765 43210' as string, // DUMMY
    whatsapp: '919876543210' as string, // DUMMY — digits only with country code
    instagram: 'vitalacoustica' as string, // DUMMY — handle without @
    location: '' as string, // e.g. 'Bangalore, India' — only once approved for publication
  },

  /*
   * Where the enquiry form sends submissions. Set ONE of these:
   *  - Formspree:  endpoint 'https://formspree.io/f/<form-id>'
   *  - FormSubmit: endpoint 'https://formsubmit.co/ajax/<your-email>' (confirm the first email it sends you)
   *  - Web3Forms:  endpoint 'https://api.web3forms.com/submit' plus accessKey
   * Can also be set at build time with VITE_ENQUIRY_ENDPOINT / VITE_ENQUIRY_KEY.
   * Until one is set, the form opens the visitor's email app addressed to contact.email.
   */
  enquiry: {
    endpoint: (import.meta.env.VITE_ENQUIRY_ENDPOINT as string | undefined) ?? '',
    accessKey: (import.meta.env.VITE_ENQUIRY_KEY as string | undefined) ?? '',
  },
}
