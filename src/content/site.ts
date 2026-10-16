// Single source of truth for brand copy and business details.
// Edit text here and it updates everywhere on the site.

export const site = {
  name: 'Vital Acoustica',
  domain: 'vitalacoustica.com',
  gst: '29ABCFV2853P1ZF',
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
    { label: 'Home', to: '/' },
    { label: 'Our Story', to: '/story' },
    { label: 'Equipment', to: '/equipment' },
    { label: 'Services', to: '/capabilities' },
    { label: 'Work', to: '/work' },
    { label: 'Shop', to: '/shop' },
    { label: 'Testimonials', to: '/testimonials' },
  ],

  /*
   * Contact details. Anything left empty is simply not shown.
   * Contact details used across the site (footer, contact page, legal pages, assistant).
   */
  contact: {
    email: 'lakshmiranganatha@thevitalvines.com' as string,
    phone: '+91 89048 58422' as string,
    whatsapp: '918904858422' as string, // digits only with country code
    instagram: 'vitalacoustica' as string, // handle without @
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

/** Sections held back until they're ready. Flip one to true to bring its page back. */
export const published = {
  work: false, // case studies and show photos, until the new ones are posted
  testimonials: false, // until the collected testimonials are ready to publish
}
