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
