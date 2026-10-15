// Open positions. While the list is empty, the careers page says so (with a smile).
// To advertise a role, add an entry here; it appears on /careers straight away.

export type Position = {
  title: string
  /** e.g. 'Full time', 'Freelance', 'Weekends' */
  type: string
  location: string
  summary: string
}

export const positions: Position[] = []
