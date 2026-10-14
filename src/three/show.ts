import { site } from '../content/site'

// Live show state — the "lighting desk". Every fixture reads this each frame.
// The desk UI writes to it; plain mutable object so faders never trigger React renders.

export type ColourMode = 'auto' | 'red' | 'amber' | 'split' | 'alternate'

export const show = {
  /** musical time in seconds at the reference tempo; advances faster at higher BPM */
  time: 0,
  bpm: site.bpm as number,
  /** null = the show runs its own looks; 0..3 locks one movement pattern */
  look: null as number | null,
  colour: 'auto' as ColourMode,
  /** 0..1 grand master for every light */
  master: 1,
  /** 0..1 how much haze is in the room (beam visibility) */
  haze: 0.6,
}

export const REFERENCE_BPM = site.bpm as number

export const LOOK_NAMES = ['Wave', 'Fan', 'Scissors', 'Converge'] as const

export function resetShow() {
  show.bpm = REFERENCE_BPM
  show.look = null
  show.colour = 'auto'
  show.master = 1
  show.haze = 0.6
}

/** Advance the show clock; call once per frame before any fixture reads it. */
export function tickShow(dt: number, timeScale: number) {
  show.time += Math.min(dt, 0.1) * timeScale * (show.bpm / REFERENCE_BPM)
}
