// Testimonials, published only with the person's permission and in their own words.
// Add real ones here; the page shows them as cards. While the list is empty the page
// invites clients to send one instead. Never add invented quotes.

export type Testimonial = {
  quote: string
  name: string
  /** role, organisation or event, e.g. "Promoter, Night Shift" */
  context?: string
  /** a project slug from projects.ts, to link the quote to the case study */
  project?: string
}

export const testimonials: Testimonial[] = [
  // {
  //   quote: 'The system sounded the same at the bar as it did in front of the booth.',
  //   name: 'Client name',
  //   context: 'Role, organisation or event',
  //   project: 'the-park-bangalore',
  // },
]
