import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'

const trussMaterial = new MeshStandardMaterial({ color: '#8d8d8d', metalness: 1, roughness: 0.35 })
const cabinetMaterial = new MeshStandardMaterial({ color: '#0e0e0e', metalness: 0.2, roughness: 0.7 })
const grilleMaterial = new MeshStandardMaterial({ color: '#050505', metalness: 0.5, roughness: 0.9 })

type Tube = { from: Vector3; to: Vector3; r: number }

/** A 30cm square box truss between two points, built from chords + zig-zag lacing. */
function boxTruss(from: Vector3, to: Vector3, size = 0.3, bay = 0.5): Tube[] {
  const dir = to.clone().sub(from)
  const length = dir.length()
  dir.normalize()
  // two axes perpendicular to the run
  const up = Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const a = new Vector3().crossVectors(dir, up).normalize().multiplyScalar(size / 2)
  const b = new Vector3().crossVectors(dir, a).normalize().multiplyScalar(size / 2)
  const corners = [a.clone().add(b), a.clone().sub(b), a.clone().negate().sub(b), a.clone().negate().add(b)]
  const tubes: Tube[] = corners.map((c) => ({ from: from.clone().add(c), to: to.clone().add(c), r: 0.025 }))
  const bays = Math.max(1, Math.round(length / bay))
  for (let face = 0; face < 4; face++) {
    const c0 = corners[face]
    const c1 = corners[(face + 1) % 4]
    for (let i = 0; i < bays; i++) {
      const p0 = from.clone().addScaledVector(dir, (length * i) / bays)
      const p1 = from.clone().addScaledVector(dir, (length * (i + 1)) / bays)
      const zig = i % 2 === 0
      tubes.push({ from: p0.clone().add(zig ? c0 : c1), to: p1.clone().add(zig ? c1 : c0), r: 0.012 })
    }
  }
  return tubes
}

function Tubes({ tubes }: { tubes: Tube[] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new Object3D()
    const yAxis = new Vector3(0, 1, 0)
    tubes.forEach((t, i) => {
      const d = t.to.clone().sub(t.from)
      o.position.copy(t.from).addScaledVector(d, 0.5)
      o.quaternion.copy(new Quaternion().setFromUnitVectors(yAxis, d.clone().normalize()))
      o.scale.set(t.r, d.length(), t.r)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
  }, [tubes])
  return (
    <instancedMesh ref={ref} args={[undefined, trussMaterial, tubes.length]}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
    </instancedMesh>
  )
}

/** Goal-post truss: two towers and a header spanning the stage. */
export function Truss({ width = 12, height = 4.6, z = -0.6 }) {
  const tubes = useMemo(() => {
    const h = width / 2
    return [
      ...boxTruss(new Vector3(-h, height, z), new Vector3(h, height, z)),
      ...boxTruss(new Vector3(-h, 0, z), new Vector3(-h, height - 0.15, z)),
      ...boxTruss(new Vector3(h, 0, z), new Vector3(h, height - 0.15, z)),
    ]
  }, [width, height, z])
  return <Tubes tubes={tubes} />
}

/** A flown line array: cabinets hung in a J-curve, with a sub stack below. */
export function LineArray({ x = 0, flyHeight = 4.1, boxes = 7, z = 0.2 }) {
  const cabinets = Array.from({ length: boxes }, (_, i) => i)
  let y = flyHeight
  let angle = 0
  let zOff = 0
  return (
    <group position={[x, 0, z]}>
      {/* rigging chains */}
      <mesh material={trussMaterial} position={[0, flyHeight + 0.3, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.6, 4]} />
      </mesh>
      {cabinets.map((i) => {
        angle += i < 3 ? 0.02 : 0.07 + i * 0.015
        y -= 0.3 * Math.cos(angle)
        zOff += 0.3 * Math.sin(angle)
        return (
          <group key={i} position={[0, y, zOff]} rotation-x={angle}>
            <mesh material={cabinetMaterial}>
              <boxGeometry args={[1.05, 0.28, 0.55]} />
            </mesh>
            <mesh material={grilleMaterial} position={[0, 0, 0.276]}>
              <planeGeometry args={[0.98, 0.22]} />
            </mesh>
          </group>
        )
      })}
      {/* ground-stacked subs */}
      {[0, 1].map((i) => (
        <group key={i} position={[0, 0.36 + i * 0.72, 0.3]}>
          <mesh material={cabinetMaterial}>
            <boxGeometry args={[1.1, 0.7, 0.85]} />
          </mesh>
          <mesh material={grilleMaterial} position={[0, 0, 0.426]}>
            <circleGeometry args={[0.27, 32]} />
          </mesh>
          <mesh position={[0, 0, 0.43]}>
            <torusGeometry args={[0.28, 0.018, 8, 40]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A DJ booth silhouette for scale. */
export function Booth() {
  return (
    <group position={[0, 0, 1.2]}>
      <mesh material={cabinetMaterial} position={[0, 0.5, 0]}>
        <boxGeometry args={[2.4, 1, 0.8]} />
      </mesh>
      <mesh position={[0, 1.005, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.3, 0.7]} />
        <meshStandardMaterial color="#111" metalness={0.4} roughness={0.5} />
      </mesh>
      {[-0.75, 0, 0.75].map((x) => (
        <mesh key={x} position={[x, 1.03, 0]} material={grilleMaterial}>
          <boxGeometry args={[0.55, 0.05, 0.5]} />
        </mesh>
      ))}
    </group>
  )
}
