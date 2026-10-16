import type { RigId } from '../content/gear'

type V3 = [number, number, number]

// Where each piece of gear sits in the 3D stage, and where the camera goes to look at it.
// Positions are in metres (see layout.ts); the stage faces +Z.
export const HOTSPOTS: Record<RigId, { at: V3; camera: V3 }> = {
  v10p: { at: [-6.53, 2.12, -0.23], camera: [-4.3, 2.4, 3.6] },
  b22: { at: [6.3, 0.75, 1.4], camera: [4.4, 1.5, 4.9] },
  art915: { at: [-1.55, 1.96, -0.35], camera: [-0.3, 2.4, -2.1] },
  cdj: { at: [-0.41, 1.75, -0.2], camera: [-0.75, 2.55, -1.45] },
  djm: { at: [0, 1.74, -0.2], camera: [0.35, 2.6, -1.4] },
  dm3: { at: [0, 1.08, 19.75], camera: [1.3, 2.2, 22.0] },
  sharpy: { at: [0.6, 4.45, -0.6], camera: [1.6, 3.4, 3.4] },
  matrix: { at: [-3.4, 3.1, -1.45], camera: [-2.5, 2.7, 1.7] },
  trefoil: { at: [2.4, 2.9, -1.45], camera: [1.9, 2.6, 1.5] },
  hex: { at: [3.6, 2.05, -1.45], camera: [3.0, 2.0, 1.3] },
  warcraft: { at: [-3.9, 0.92, 0.55], camera: [-3.1, 1.55, 3.0] },
  cob: { at: [-2.25, 0.98, 0.65], camera: [-1.7, 1.5, 3.0] },
  dotbar: { at: [-2.75, 2.4, -1.45], camera: [-2.1, 2.3, 1.4] },
  pixelbar: { at: [3.0, 1.45, -1.45], camera: [2.4, 1.6, 1.6] },
  rope: { at: [-5, 4.3, -0.4], camera: [-3.4, 3.9, 2.6] },
  hazer: { at: [-4.9, 0.75, 2.1], camera: [-3.3, 1.7, 5.0] },
  smoke: { at: [-1.25, 0.95, 0.62], camera: [-0.5, 1.7, 3.4] },
  table: { at: [0.72, 0.98, 19.7], camera: [2.0, 1.9, 22.2] },
  truss: { at: [-5, 3.6, -0.6], camera: [-2.8, 3.1, 4.2] },
}

// Every other instance of each item in the model, so each fixture gets its own marker.
// (Wing fixtures mirror across the centre line; sharpies are spread along the front truss.)
const EXTRA: Partial<Record<RigId, V3[]>> = {
  v10p: [[6.53, 2.12, -0.23]],
  b22: [[-6.3, 0.75, 1.4]],
  art915: [[1.55, 1.96, -0.35]],
  cdj: [[0.41, 1.75, -0.2]],
  matrix: [[3.4, 3.1, -1.45]],
  trefoil: [[-2.4, 2.9, -1.45]],
  hex: [
    [-3.6, 2.05, -1.45],
    [-5, 1.8, -0.36],
    [-5, 3.3, -0.36],
    [5, 1.8, -0.36],
    [5, 3.3, -0.36],
  ],
  warcraft: [[3.9, 0.92, 0.55]],
  cob: [[2.25, 0.98, 0.65]],
  dotbar: [[2.75, 2.4, -1.45]],
  pixelbar: [
    [-3.0, 1.45, -1.45],
    [2.98, 0.9, -1.45],
    [-2.98, 0.9, -1.45],
  ],
  rope: [
    [-2.6, 5.27, -0.4],
    [2.6, 5.27, -0.4],
    [5, 4.3, -0.4],
  ],
  truss: [[5, 3.6, -0.6]],
  smoke: [[1.25, 0.95, 0.62]],
  table: [[0.92, 1.3, -0.2]],
}

export type Spot = { id: RigId; key: string; at: V3 }

const SHARPY_SPAN = 8.4

/** Every marker position in the model: one per fixture, not one per product. */
export function rigSpots(small: boolean): Spot[] {
  const out: Spot[] = []
  for (const id of Object.keys(HOTSPOTS) as RigId[]) {
    if (id === 'sharpy') {
      const n = small ? 6 : 8
      for (let i = 0; i < n; i++) out.push({ id, key: `${id}:${i}`, at: [-SHARPY_SPAN / 2 + (SHARPY_SPAN * i) / (n - 1), 4.45, -0.6] })
      continue
    }
    out.push({ id, key: `${id}:0`, at: HOTSPOTS[id].at })
    EXTRA[id]?.forEach((at, i) => out.push({ id, key: `${id}:${i + 1}`, at }))
  }
  return out
}

/** Camera framing for one instance: the item's usual view, moved to that fixture (mirrored across the centre line). */
export function spotView(id: RigId, at: V3 | null): { at: V3; camera: V3 } {
  const base = HOTSPOTS[id]
  if (!at) return base
  const flip = at[0] * base.at[0] < 0 ? -1 : 1
  return {
    at,
    camera: [at[0] + (base.camera[0] - base.at[0]) * flip, at[1] + base.camera[1] - base.at[1], at[2] + base.camera[2] - base.at[2]],
  }
}

export const EXPLORE_HOME = { camera: [0, 3.0, 11] as V3, target: [0, 2.0, -0.5] as V3 }
