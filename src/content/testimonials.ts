// Testimonials, published only with the person's permission and in their own words (lightly
// trimmed for length). The page and the homepage show them in a slider.

export type Testimonial = {
  quote: string
  name: string
  /** role, organisation or event, e.g. "Promoter, techno night" */
  context?: string
  /** a project slug from projects.ts, to link the quote to the case study */
  project?: string
  /** placeholder copy, not a real client */
  sample?: boolean
}

export const testimonials: Testimonial[] = [
  {
    quote:
      'Until now, our audience feedback mostly revolved around the artists, with production rarely the highlight. Since we started collaborating with Vital Acoustica, the response to the sound, the production and the overall experience has been absolutely phenomenal. The comfort, professionalism, quality and trust we share with them are unmatched. We now prefer to host our shows only when Vital Acoustica is available. The best in the business.',
    name: 'Suraj',
    context: 'Owner, Inside Out, Mysuru',
  },
  {
    quote:
      'Massive shoutout to the sound team at Vital Acoustica. Back in the day it was ‘Last Night a DJ Saved My Life.’ These days, honestly… a great sound system saves the night.',
    name: 'Vinayaka Music',
    context: 'Artist',
  },
]
