/** URL of a show photo in /public/shows at one of the two exported widths. */
export const img = (name: string, w: 800 | 1600) => `${import.meta.env.BASE_URL}shows/${name}-${w}.webp`

/** URL of a file in /public/media (renders, posters). */
export const mediaUrl = (file: string) => `${import.meta.env.BASE_URL}media/${file}`
