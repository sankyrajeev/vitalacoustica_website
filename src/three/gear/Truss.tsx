import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'

// 290mm square box truss (H30V-style): 48mm chords, 16mm diagonal lacing,
// 1m-ish bays, couplers at every 2m section joint, cube corner blocks and base plates.
const SIZE = 0.29
const CHORD_R = 0.024
const BRACE_R = 0.008

// black-finish aluminium truss
const aluminium = new MeshStandardMaterial({ color: '#161616', metalness: 0.7, roughness: 0.42 })
const steel = new MeshStandardMaterial({ color: '#2b2b2b', metalness: 0.8, roughness: 0.5 })

type Tube = { a: Vector3; b: Vector3; r: number }

function corners(dir: Vector3) {
  const ref = Math.abs(dir.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
  const u = new Vector3().crossVectors(dir, ref).normalize().multiplyScalar(SIZE / 2)
  const v = new Vector3().crossVectors(dir, u).normalize().multiplyScalar(SIZE / 2)
  return [u.clone().add(v), u.clone().sub(v), u.clone().negate().sub(v), u.clone().negate().add(v)]
}

/** One straight run of truss from a to b (chord centrelines). */
function run(a: Vector3, b: Vector3): { tubes: Tube[]; joints: Vector3[] } {
  const dir = b.clone().sub(a)
  const len = dir.length()
  dir.normalize()
  const cs = corners(dir)
  const tubes: Tube[] = cs.map((c) => ({ a: a.clone().add(c), b: b.clone().add(c), r: CHORD_R }))
  const bays = Math.max(1, Math.round(len / 0.5))
  for (let f = 0; f < 4; f++) {
    const c0 = cs[f]
    const c1 = cs[(f + 1) % 4]
    for (let i = 0; i < bays; i++) {
      const p0 = a.clone().addScaledVector(dir, (len * i) / bays)
      const p1 = a.clone().addScaledVector(dir, (len * (i + 1)) / bays)
      // continuous zig-zag: each diagonal starts where the previous one ended
      const flip = i % 2 === 0
      tubes.push({ a: p0.clone().add(flip ? c0 : c1), b: p1.clone().add(flip ? c1 : c0), r: BRACE_R })
    }
  }
  // section joints every 2m get a coupler ring on each chord
  const joints: Vector3[] = []
  for (let d = 2; d < len - 0.2; d += 2) {
    const p = a.clone().addScaledVector(dir, d)
    cs.forEach((c) => joints.push(p.clone().add(c)))
  }
  return { tubes, joints }
}

/** Cube corner block: 12 edges of a SIZE cube with an X brace on each face. */
function cornerBlock(center: Vector3): Tube[] {
  const h = SIZE / 2
  const p = (x: number, y: number, z: number) => center.clone().add(new Vector3(x * h, y * h, z * h))
  const edges: [Vector3, Vector3][] = []
  for (const s of [-1, 1])
    for (const t of [-1, 1]) {
      edges.push([p(-1, s, t), p(1, s, t)], [p(s, -1, t), p(s, 1, t)], [p(s, t, -1), p(s, t, 1)])
    }
  return [
    ...edges.map(([a, b]) => ({ a, b, r: CHORD_R })),
    // face diagonals
    { a: p(-1, -1, 1), b: p(1, 1, 1), r: BRACE_R },
    { a: p(-1, -1, -1), b: p(1, 1, -1), r: BRACE_R },
    { a: p(1, -1, -1), b: p(1, 1, 1), r: BRACE_R },
    { a: p(-1, -1, -1), b: p(-1, 1, 1), r: BRACE_R },
  ]
}

function TubeInstances({ tubes, segments }: { tubes: Tube[]; segments: number }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new Object3D()
    const y = new Vector3(0, 1, 0)
    const q = new Quaternion()
    tubes.forEach((t, i) => {
      const d = t.b.clone().sub(t.a)
      o.position.copy(t.a).addScaledVector(d, 0.5)
      o.quaternion.copy(q.setFromUnitVectors(y, d.clone().normalize()))
      o.scale.set(t.r, d.length(), t.r)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
  }, [tubes])
  return (
    <instancedMesh ref={ref} args={[undefined, aluminium, tubes.length]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, segments]} />
    </instancedMesh>
  )
}

function Couplers({ joints, vertical }: { joints: Vector3[]; vertical: Vector3[] }) {
  const ref = useRef<InstancedMesh>(null)
  const all = [...joints.map((p) => ({ p, v: false })), ...vertical.map((p) => ({ p, v: true }))]
  useLayoutEffect(() => {
    const o = new Object3D()
    all.forEach(({ p, v }, i) => {
      o.position.copy(p)
      o.rotation.set(0, 0, v ? 0 : Math.PI / 2)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, aluminium, all.length]} frustumCulled={false}>
      <cylinderGeometry args={[CHORD_R * 1.45, CHORD_R * 1.45, 0.07, 12]} />
    </instancedMesh>
  )
}

/** Goal-post truss: two towers on base plates, corner blocks, and a header span. */
export function GoalPostTruss({ span = 10, height = 5.2, z = -0.6 }) {
  const { tubes, joints, vJoints } = useMemo(() => {
    const h = span / 2
    const top = height - SIZE / 2
    const header = run(new Vector3(-h + SIZE / 2, top, z), new Vector3(h - SIZE / 2, top, z))
    const left = run(new Vector3(-h, 0.02, z), new Vector3(-h, top - SIZE / 2, z))
    const right = run(new Vector3(h, 0.02, z), new Vector3(h, top - SIZE / 2, z))
    return {
      tubes: [
        ...header.tubes,
        ...left.tubes,
        ...right.tubes,
        ...cornerBlock(new Vector3(-h, top, z)),
        ...cornerBlock(new Vector3(h, top, z)),
      ],
      joints: header.joints,
      vJoints: [...left.joints, ...right.joints],
    }
  }, [span, height, z])

  return (
    <group>
      <TubeInstances tubes={tubes} segments={10} />
      <Couplers joints={joints} vertical={vJoints} />
      {[-span / 2, span / 2].map((x) => (
        <group key={x} position={[x, 0, z]}>
          {/* steel base plate with outrigger feet */}
          <mesh material={steel} position={[0, 0.01, 0]}>
            <boxGeometry args={[0.8, 0.02, 0.8]} />
          </mesh>
          <mesh material={steel} position={[0, 0.03, 0]}>
            <boxGeometry args={[SIZE + 0.04, 0.04, SIZE + 0.04]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Half-coupler clamp + safety: what fixtures actually hang from. */
export function TrussClamp() {
  return (
    <group>
      <mesh material={steel} position={[0, 0.03, 0]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[CHORD_R + 0.008, 0.008, 6, 14]} />
      </mesh>
      <mesh material={steel} position={[0, -0.03, 0]}>
        <boxGeometry args={[0.04, 0.07, 0.03]} />
      </mesh>
    </group>
  )
}
