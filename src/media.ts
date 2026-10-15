import type { CSSProperties } from 'react'

export type ShowWidth = 160 | 480 | 800 | 1600

/** URL of a show photo in /public/shows at one of the exported widths. */
export const img = (name: string, w: ShowWidth) => `${import.meta.env.BASE_URL}shows/${name}-${w}.webp`

/** Every width of a show photo, so the browser picks the smallest that fills the slot. */
export const imgSet = (name: string) => `${img(name, 480)} 480w, ${img(name, 800)} 800w, ${img(name, 1600)} 1600w`

/** A tiny blurred copy shown instantly behind a photo while the real one loads. */
export const preview = (name: string): CSSProperties => ({
  backgroundImage: `url(${img(name, 160)})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
})

/** URL of a file in /public/media (renders, posters). */
export const mediaUrl = (file: string) => `${import.meta.env.BASE_URL}media/${file}`
