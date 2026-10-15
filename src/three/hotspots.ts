import type { RigId } from '../content/gear'

type V3 = [number, number, number]

// Where each piece of gear sits in the 3D stage, and where the camera goes to look at it.
// Positions are in metres (see layout.ts); the stage faces +Z.
export const HOTSPOTS: Record<RigId, { at: V3; camera: V3 }> = {
  v10p: { at: [-6.3, 1.65, 1.1], camera: [-4.4, 2.1, 4.4] },
  b22: { at: [6.3, 0.75, 1.4], camera: [4.4, 1.5, 4.9] },
  art915: { at: [-1.55, 0.98, -0.35], camera: [-0.2, 1.9, -1.9] },
  pioneer: { at: [0.62, 1.78, -0.2], camera: [1.2, 2.7, 1.6] },
  dm3: { at: [0, 1.08, 19.75], camera: [1.3, 2.2, 22.0] },
  sharpy: { at: [0.6, 4.45, -0.6], camera: [1.6, 3.4, 3.4] },
  matrix: { at: [-3.4, 3.1, -1.45], camera: [-2.5, 2.7, 1.7] },
  trefoil: { at: [2.4, 2.9, -1.45], camera: [1.9, 2.6, 1.5] },
  hex: { at: [3.5, 2.15, -1.45], camera: [3.0, 2.0, 1.3] },
  dotbar: { at: [-2.75, 2.4, -1.45], camera: [-2.1, 2.3, 1.4] },
  pixelbar: { at: [3.0, 1.45, -1.45], camera: [2.4, 1.6, 1.6] },
  rope: { at: [-1.5, 2.1, -2.0], camera: [-0.6, 2.2, 1.8] },
  truss: { at: [-5, 3.6, -0.6], camera: [-2.8, 3.1, 4.2] },
}

export const EXPLORE_HOME = { camera: [0, 3.0, 11] as V3, target: [0, 2.0, -0.5] as V3 }
