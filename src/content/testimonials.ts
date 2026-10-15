// Testimonials, published only with the person's permission and in their own words.
// The page shows them as cards; the first three also appear on the homepage.
//
// DUMMY: the entries marked `sample: true` are placeholders so the layout can be reviewed.
// They show a "Sample" tag on the site. Replace them with real testimonials (and delete
// the samples) before launch: publishing invented reviews as real ones misleads customers.

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
    quote: 'The system sounded the same at the bar as it did in front of the booth. The low end was huge, and the neighbours never called.',
    name: 'Promoter',
    context: 'Open-air techno night, Bengaluru',
    sample: true,
  },
  {
    quote: 'They turned a plain room into one red space. The crew had everything rigged, tuned and focused before doors, and stayed until the last track.',
    name: 'Club manager',
    context: 'Club night, Hubli',
    sample: true,
  },
  {
    quote: 'We asked for speakers and got a plan: where everything should go, why, and who would run it. The night ran without a single problem.',
    name: 'Event lead',
    context: 'Brand launch, Mangaluru',
    sample: true,
  },
  {
    quote: 'Warm light, clean sound, and nobody had to shout across the dance floor. Exactly the mood we wanted for the evening.',
    name: 'Host',
    context: 'Private celebration, Mysuru',
    sample: true,
  },
]
