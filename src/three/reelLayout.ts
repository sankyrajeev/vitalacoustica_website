import type { ShowPhoto } from '../content/shows'

// Show reel geometry, shared by the WebGL reel and the DOM controls around it.
export const REEL_HEIGHT = 2.6
export const REEL_GAP = 0.45

export const reelWidth = (p: ShowPhoto) => REEL_HEIGHT * (p.width / p.height)

/** Where each photo's centre sits along the reel, for snapping. */
export function reelStops(photos: ShowPhoto[]) {
  let x = 0
  return photos.map((p) => {
    const at = x
    x += reelWidth(p) + REEL_GAP
    return at
  })
}
