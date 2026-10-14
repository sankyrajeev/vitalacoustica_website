import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three'

// The Resonance Form: one continuous ribbon of metal swept along a closed,
// gently folded loop. Its cross-section is a rounded flat bar whose width
// breathes along the length, and it turns three half-turns before closing on itself.

const HALF_TURNS = 3
const THICKNESS = 0.032
const SECTION = 24 // points around the cross-section

function loopPoint(t: number) {
  const a = t * Math.PI * 2
  return new Vector3(
    1.6 * Math.sin(a) + 0.42 * Math.sin(2 * a),
    0.5 * Math.sin(3 * a) + 0.22 * Math.cos(a),
    1.55 * Math.cos(a) - 0.42 * Math.cos(2 * a),
  )
}

const halfWidth = (t: number) => 0.4 + 0.17 * Math.sin(t * Math.PI * 4 + 0.6) + 0.05 * Math.sin(t * Math.PI * 10)

/** Rounded-rectangle (superellipse) cross-section in the ribbon's local plane. */
function section(j: number) {
  const phi = (j / SECTION) * Math.PI * 2
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  const e = 2 / 7
  return [Math.sign(c) * Math.pow(Math.abs(c), e), Math.sign(s) * Math.pow(Math.abs(s), e)] as const
}

export type ResonanceGeometry = { surface: BufferGeometry; lines: BufferGeometry }

export function buildResonance(segments: number): ResonanceGeometry {
  const curve = new CatmullRomCurve3(
    Array.from({ length: 200 }, (_, i) => loopPoint(i / 200)),
    true,
    'centripetal',
  )
  const frames = curve.computeFrenetFrames(segments, true)
  const ring = SECTION + 1
  const pos = new Float32Array((segments + 1) * ring * 3)
  const uv = new Float32Array((segments + 1) * ring * 2)
  const coord = new Float32Array((segments + 1) * ring * 2)
  const tangent = new Float32Array((segments + 1) * ring * 4)
  const p = new Vector3()
  const across = new Vector3()
  const up = new Vector3()
  const v = new Vector3()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    curve.getPointAt(t % 1, p)
    const k = i % segments
    const N = frames.normals[k]
    const B = frames.binormals[k]
    const T = frames.tangents[k]
    const theta = (HALF_TURNS * Math.PI * t) + 0.4
    across.copy(N).multiplyScalar(Math.cos(theta)).addScaledVector(B, Math.sin(theta))
    up.copy(N).multiplyScalar(-Math.sin(theta)).addScaledVector(B, Math.cos(theta))
    const w = halfWidth(t)
    for (let j = 0; j <= SECTION; j++) {
      const [sx, sy] = section(j % SECTION)
      v.copy(p).addScaledVector(across, sx * w).addScaledVector(up, sy * THICKNESS)
      const o = i * ring + j
      pos.set([v.x, v.y, v.z], o * 3)
      uv.set([t * 24, j / SECTION], o * 2)
      coord.set([t, sx], o * 2)
      tangent.set([T.x, T.y, T.z, 1], o * 4)
    }
  }

  const index: number[] = []
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < SECTION; j++) {
      const a = i * ring + j
      const b = (i + 1) * ring + j
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }

  const surface = new BufferGeometry()
  surface.setAttribute('position', new BufferAttribute(pos, 3))
  surface.setAttribute('uv', new BufferAttribute(uv, 2))
  surface.setAttribute('aCoord', new BufferAttribute(coord, 2))
  surface.setAttribute('tangent', new BufferAttribute(tangent, 4))
  surface.setIndex(index)
  surface.computeVertexNormals()
  surface.computeBoundingSphere()

  // Structural line drawing of the same form: cross-section ribs and four long edges.
  const linePts: number[] = []
  const at = (i: number, j: number) => {
    const o = (i * ring + j) * 3
    return [pos[o], pos[o + 1], pos[o + 2]]
  }
  const ribEvery = Math.max(2, Math.round(segments / 120))
  for (let i = 0; i <= segments; i += ribEvery)
    for (let j = 0; j < SECTION; j++) linePts.push(...at(i, j), ...at(i, j + 1))
  for (const j of [0, Math.round(SECTION / 4), Math.round(SECTION / 2), Math.round((3 * SECTION) / 4)])
    for (let i = 0; i < segments; i++) linePts.push(...at(i, j), ...at(i + 1, j))
  const lines = new BufferGeometry()
  lines.setAttribute('position', new Float32BufferAttribute(linePts, 3))

  return { surface, lines }
}
