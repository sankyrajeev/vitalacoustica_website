// Scroll choreography for the Resonance Form.
// Each homepage section declares `data-scene="<key>"`; every frame we weight the
// matching parameter sets by how centred each section is, so the sculpture moves
// continuously between states instead of jumping.

export type SceneParams = {
  opacity: number // canvas visibility (content takes over at 0)
  dist: number // camera distance
  x: number // horizontal offset of the sculpture (desktop)
  y: number
  turn: number // extra rotation in radians
  tilt: number // pitch towards a "plan" view
  scale: number
  wave: number // sound: travelling displacement along the ribbon
  sweep: number // light: a moving highlight across the surface
  mesh: number // visuals: layered wireframe structure
  grid: number // production: architectural floor grid
  calm: number // slows autonomous motion
}

const base: SceneParams = { opacity: 1, dist: 9, x: 1.75, y: 0, turn: 0, tilt: 0, scale: 1, wave: 0, sweep: 0.15, mesh: 0, grid: 0, calm: 0 }

export const SCENES: Record<string, Partial<SceneParams>> = {
  // the opening frame, composed like the share image: sculpture on the right, logo on the left
  intro: {},
  entrance: { dist: 8.2, x: 1.9, turn: 0.75, tilt: 0.12 },
  // the sound wave runs along the ribbon beside the statement
  manifesto: { dist: 7.2, x: 2.4, turn: 1.1, tilt: 0.2, opacity: 0.6, wave: 1 },
  // testimonials: the light sweep, the form turning slowly behind the quotes
  voices: { dist: 11, x: 1.6, y: 0.9, turn: 3.2, sweep: 1, mesh: 0.4, opacity: 0.22, calm: 0.5 },
  enquiry: { dist: 13, x: 0, y: 0.1, turn: 5.4, scale: 0.85, calm: 1, opacity: 0.55 },

  // Our Story: one state per chapter, turning a little further each time
  'story-open': { dist: 8.2, x: 1.9, turn: 0.4, tilt: 0.1 },
  'story-friends': { dist: 13, x: 0, turn: 1.0, opacity: 0.3 },
  'story-missing': { dist: 14, x: 0, turn: 1.6, tilt: 0.35, calm: 1, opacity: 0.24, sweep: 0 },
  'story-question': { dist: 10.5, x: 0, y: 0.15, turn: 2.4, scale: 0.92, opacity: 0.5 },
  'story-feeling': { dist: 12, x: 0, turn: 3.0, wave: 0.5, opacity: 0.3 },
  'story-sound': { dist: 9.5, x: 0, y: 0.9, turn: 3.6, wave: 1, opacity: 0.55 },
  'story-curious': { dist: 13, x: 0, turn: 4.2, mesh: 1, tilt: 0.1, opacity: 0.28 },
  'story-purpose': { dist: 12, x: 0, turn: 4.8, sweep: 1, tilt: -0.15, opacity: 0.3 },
  'story-night': { dist: 13.5, x: 0, turn: 5.4, tilt: 0.55, grid: 0.8, calm: 1, opacity: 0.38 },
  'story-end': { dist: 12, x: 0, y: 0.1, turn: 6.2, scale: 0.9, calm: 0.6, opacity: 0.6 },

  // pointed at by the "depth, clarity, warmth, impact" tiles
  'feel-depth': { grid: 1, tilt: 0.5, sweep: 0.2 },
  'feel-clarity': { mesh: 1, wave: 0.2, tilt: 0.1 },
  'feel-warmth': { sweep: 1, calm: 0.4 },
  'feel-impact': { wave: 1, scale: 1.12 },
}

/** A scene the visitor is pointing at (hover/tap), blended over the scroll position. */
const pointed: { scene: string | null } = { scene: null }
export function pointAt(scene: string | null) {
  pointed.scene = scene
}
const POINTED_KEYS: (keyof SceneParams)[] = ['wave', 'sweep', 'mesh', 'grid', 'calm', 'tilt', 'scale']

const KEYS = Object.keys(base) as (keyof SceneParams)[]

/** Current target parameters, computed from section positions. */
export function targetParams(sections: HTMLElement[], vh: number, mobile: boolean, out: SceneParams) {
  let total = 0
  for (const k of KEYS) out[k] = 0
  const centre = vh / 2
  for (const el of sections) {
    const r = el.getBoundingClientRect()
    if (r.bottom < -vh || r.top > vh * 2) continue
    // 1 when the section spans the viewport centre, falling off over half a screen
    const mid = Math.max(r.top, Math.min(centre, r.bottom))
    const d = Math.abs(mid - centre)
    const w = Math.max(0, 1 - d / (vh * 0.5))
    if (w <= 0) continue
    const set = { ...base, ...SCENES[el.dataset.scene ?? ''] }
    for (const k of KEYS) out[k] += set[k] * w
    total += w
  }
  if (total === 0) {
    Object.assign(out, base, { opacity: 0 })
    return out
  }
  for (const k of KEYS) out[k] /= total
  if (pointed.scene && SCENES[pointed.scene]) {
    const set = { ...base, ...SCENES[pointed.scene] }
    for (const k of POINTED_KEYS) out[k] = out[k] * 0.15 + set[k] * 0.85
    out.opacity = Math.max(out.opacity, 0.7)
  }
  if (mobile) {
    // on phones the sculpture sits behind the text, smaller and quieter
    // (a narrow screen crops the wide ribbon, so it's scaled down to fit the width)
    out.x = -0.35
    out.y += 0.95
    out.dist *= 1.45
    out.scale *= 0.58
    out.opacity *= 0.55
  }
  return out
}

export const initialParams = (): SceneParams => ({ ...base })
