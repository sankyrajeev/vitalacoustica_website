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
  // the homepage enquiry: the sculpture sits centred behind the call to action
  enquiry: { dist: 13, x: 0, y: 0.1, turn: 5.4, scale: 0.85, calm: 1, opacity: 0.55 },
}

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
  if (mobile) {
    // on phones the sculpture sits behind the text, quieter
    out.x = 0
    out.y += 0.7
    out.dist *= 1.45
    out.opacity *= 0.55
  }
  return out
}

export const initialParams = (): SceneParams => ({ ...base })
