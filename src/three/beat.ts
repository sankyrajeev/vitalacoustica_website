import { show } from './show'
import { site } from '../content/site'

// A shared tempo clock so every fixture in the scene moves to the same groove.
export const BEAT_SECONDS = 60 / site.bpm

/** Beats elapsed since t = 0. */
export const beatsAt = (t: number) => t / BEAT_SECONDS

/** 1 on the kick, decaying towards 0 before the next beat. */
export const kickAt = (t: number, decay = 5) => Math.exp(-(beatsAt(t) % 1) * decay)

/** Which bar of 4 beats we're in. */
export const barAt = (t: number) => Math.floor(beatsAt(t) / 4)

export const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

export const RED = '#ff2414'
export const AMBER = '#ff9a1f'

const BARS_PER_LOOK = 4

/** Which 4-bar "look" of the show we're in — patterns and colours change together. */
export const lookAt = (t: number) => Math.floor(beatsAt(t) / 4 / BARS_PER_LOOK)

/** Position (0..BARS_PER_LOOK) inside the current look, in bars. */
export const barInLook = (t: number) => (beatsAt(t) / 4) % BARS_PER_LOOK

export const LOOK_BARS = BARS_PER_LOOK

/**
 * Sharpies only ever run red or amber. In auto, each look picks how they're split:
 * alternating, all red, halves, all amber. The desk can lock one of those.
 */
export function sharpyColor(t: number, i: number, n: number) {
  const mode = show.colour === 'auto' ? (['alternate', 'red', 'split', 'amber'] as const)[lookAt(t) % 4] : show.colour
  switch (mode) {
    case 'alternate':
      return i % 2 ? AMBER : RED
    case 'red':
      return RED
    case 'split':
      return i < n / 2 ? RED : AMBER
    default:
      return AMBER
  }
}
