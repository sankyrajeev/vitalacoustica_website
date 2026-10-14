import { MeshReflectorMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, InstancedMesh, MeshStandardMaterial, Object3D, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'
import { kickAt } from './beat'
import { usePalette } from './palette'

// A warehouse room for the show: concrete shell, steel roof trusses, columns,
// a raised stage deck, DJ booth, FOH position and a crowd that moves to the kick.

import { DECK, VENUE } from './layout'

function concreteTexture(base: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  // mottling + formwork tie holes, like poured concrete panels
  for (let i = 0; i < 2200; i++) {
    const v = Math.random() * 30 - 15
    g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 300})`
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6)
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.strokeRect(0.5, 0.5, 255, 255)
  g.fillStyle = 'rgba(0,0,0,0.35)'
  for (const [x, y] of [[48, 64], [208, 64], [48, 192], [208, 192]]) {
    g.beginPath()
    g.arc(x, y, 3, 0, Math.PI * 2)
    g.fill()
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

function Shell() {
  const p = usePalette()
  const { halfWidth: hw, front, back, height } = VENUE
  const depth = back - front
  const wall = useMemo(() => {
    const tex = concreteTexture(p.wall)
    tex.repeat.set(8, 3)
    return new MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
  }, [p.wall])
  const steel = useMemo(() => new MeshStandardMaterial({ color: p.steel, metalness: 0.7, roughness: 0.55 }), [p.steel])
  const midZ = (front + back) / 2

  // roof trusses every 4 m, columns every 8 m along the side walls
  const trussZ = Array.from({ length: Math.floor(depth / 4) }, (_, i) => front + 2 + i * 4)
  const columnZ = Array.from({ length: Math.floor(depth / 8) + 1 }, (_, i) => front + i * 8)

  return (
    <group>
      {/* walls */}
      <mesh material={wall} position={[0, height / 2, front]}>
        <planeGeometry args={[hw * 2, height]} />
      </mesh>
      <mesh material={wall} position={[0, height / 2, back]} rotation-y={Math.PI}>
        <planeGeometry args={[hw * 2, height]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={wall} position={[s * hw, height / 2, midZ]} rotation-y={(-s * Math.PI) / 2}>
          <planeGeometry args={[depth, height]} />
        </mesh>
      ))}
      {/* roof deck */}
      <mesh position={[0, height, midZ]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[hw * 2, depth]} />
        <meshStandardMaterial color={p.wall} roughness={1} />
      </mesh>
      {/* steel roof trusses: bottom chord, top chord, verticals */}
      {trussZ.map((z) => (
        <group key={z} position={[0, height - 1.1, z]}>
          <mesh material={steel}>
            <boxGeometry args={[hw * 2, 0.12, 0.12]} />
          </mesh>
          <mesh material={steel} position={[0, 0.9, 0]}>
            <boxGeometry args={[hw * 2, 0.12, 0.12]} />
          </mesh>
          {Array.from({ length: 15 }, (_, i) => -hw + 1 + i * 1.85).map((x) => (
            <mesh key={x} material={steel} position={[x, 0.45, 0]} rotation-z={0.6}>
              <boxGeometry args={[0.06, 1.1, 0.06]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* side columns */}
      {columnZ.flatMap((z) =>
        [-1, 1].map((s) => (
          <mesh key={`${z}${s}`} material={steel} position={[s * (hw - 0.25), height / 2, z]}>
            <boxGeometry args={[0.35, height, 0.35]} />
          </mesh>
        )),
      )}
      {/* green emergency exit signs */}
      {[[-hw + 0.02, 2.6, 20, Math.PI / 2], [hw - 0.02, 2.6, 20, -Math.PI / 2], [-4, 3.2, back - 0.02, Math.PI]].map(
        ([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} rotation-y={r}>
            <planeGeometry args={[0.5, 0.2]} />
            <meshBasicMaterial color="#19c26a" toneMapped={false} />
          </mesh>
        ),
      )}
    </group>
  )
}

function Floor({ small }: { small: boolean }) {
  const p = usePalette()
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, (VENUE.front + VENUE.back) / 2]}>
      <planeGeometry args={[VENUE.halfWidth * 2, VENUE.back - VENUE.front]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={small ? 256 : 640}
        mixBlur={1}
        mixStrength={p.theme === 'dark' ? 18 : 3}
        roughness={1}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color={p.floor}
        metalness={0.5}
      />
    </mesh>
  )
}

const deckMat = new MeshStandardMaterial({ color: '#111', roughness: 0.8 })
const skirtMat = new MeshStandardMaterial({ color: '#070707', roughness: 1 })
const gearMat = new MeshStandardMaterial({ color: '#1c1c1c', metalness: 0.4, roughness: 0.5 })

/** Stage deck with skirting, steps, and the DJ booth with two players and a mixer. */
function StageDeck() {
  const { halfWidth: hw, front, back, height } = DECK
  const depth = front - back
  return (
    <group>
      <mesh material={deckMat} position={[0, height - 0.02, (front + back) / 2]}>
        <boxGeometry args={[hw * 2, 0.04, depth]} />
      </mesh>
      <mesh material={skirtMat} position={[0, (height - 0.04) / 2, (front + back) / 2]}>
        <boxGeometry args={[hw * 2 - 0.02, height - 0.04, depth - 0.02]} />
      </mesh>
      {/* steps, stage left */}
      {[0, 1].map((i) => (
        <mesh key={i} material={deckMat} position={[-hw - 0.35, 0.15 + i * 0.2 - 0.05, back + 0.8]}>
          <boxGeometry args={[0.7, 0.2 + i * 0.2, 0.8]} />
        </mesh>
      ))}
      {/* DJ booth */}
      <group position={[0, height, -0.2]}>
        <mesh material={skirtMat} position={[0, 0.5, 0]}>
          <boxGeometry args={[2.2, 1, 0.75]} />
        </mesh>
        <mesh material={deckMat} position={[0, 1.01, 0]}>
          <boxGeometry args={[2.3, 0.03, 0.8]} />
        </mesh>
        {[-0.62, 0.62].map((x) => (
          <group key={x} position={[x, 1.06, 0]}>
            <mesh material={gearMat}>
              <boxGeometry args={[0.33, 0.07, 0.45]} />
            </mesh>
            <mesh position={[0, 0.04, 0.02]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.1, 24]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.045, -0.15]} rotation-x={-1.1}>
              <planeGeometry args={[0.16, 0.08]} />
              <meshBasicMaterial color="#5a7fa0" toneMapped={false} />
            </mesh>
          </group>
        ))}
        <mesh material={gearMat} position={[0, 1.06, 0]}>
          <boxGeometry args={[0.32, 0.08, 0.4]} />
        </mesh>
      </group>
    </group>
  )
}

/** Front-of-house: mix position on a riser in the middle of the room. */
function FOH() {
  return (
    <group position={[0, 0, 20]}>
      <mesh material={deckMat} position={[0, 0.15, 0]}>
        <boxGeometry args={[3.2, 0.3, 2.2]} />
      </mesh>
      <mesh material={gearMat} position={[0, 0.75, -0.3]}>
        <boxGeometry args={[1.8, 0.9, 0.7]} />
      </mesh>
      <mesh position={[0, 1.22, -0.3]} rotation-x={-0.25}>
        <planeGeometry args={[1.7, 0.6]} />
        <meshStandardMaterial color="#111" emissive="#2b4a66" emissiveIntensity={0.6} />
      </mesh>
      {/* FOH barrier */}
      <mesh material={gearMat} position={[0, 0.55, 1.2]}>
        <boxGeometry args={[3.4, 1.1, 0.05]} />
      </mesh>
    </group>
  )
}

/** Body profile (radius, height) for a lathe — legs, hips, waist, chest, shoulders, neck. */
const BODY_PROFILE: [number, number][] = [
  [0.001, 0],
  [0.13, 0.02],
  [0.12, 0.78],
  [0.165, 0.92],
  [0.15, 1.1],
  [0.2, 1.3],
  [0.23, 1.4],
  [0.16, 1.46],
  [0.06, 1.5],
  [0.001, 1.52],
]
const BODY_HEIGHT = 1.52

/** Crowd silhouettes — instanced bodies, heads and raised hands, moving on the kick with their own timing. */
function Crowd({ count, timeScale }: { count: number; timeScale: number }) {
  const p = usePalette()
  const bodies = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const arms = useRef<InstancedMesh>(null)
  const profile = useMemo(() => BODY_PROFILE.map(([r, h]) => new Vector2(r, h)), [])
  const people = useMemo(() => {
    const out: { x: number; z: number; h: number; phase: number; amp: number; r: number; hands: boolean }[] = []
    let seed = 7
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    while (out.length < count) {
      const x = (rand() * 2 - 1) * 10.5
      // denser near the stage
      const z = 4.3 + Math.pow(rand(), 1.5) * 20
      if (Math.abs(x) < 2.2 && z > 18.4 && z < 21.8) continue // keep FOH clear
      out.push({ x, z, h: 1.6 + rand() * 0.3, phase: rand() * 0.25, amp: 0.03 + rand() * 0.05, r: (rand() - 0.5) * 0.6, hands: rand() < 0.13 })
    }
    return out
  }, [count])
  const raised = useMemo(() => people.filter((pp) => pp.hands), [people])
  const material = useMemo(() => new MeshStandardMaterial({ color: p.crowd, roughness: 0.9 }), [p.crowd])
  const o = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    for (const m of [bodies, heads, arms]) if (m.current) m.current.material = material
  }, [material])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * timeScale
    let a = 0
    people.forEach((pp, i) => {
      const bob = kickAt(t + pp.phase, 6) * pp.amp
      const s = (pp.h - 0.24) / BODY_HEIGHT
      const sway = Math.sin(t * 1.7 + i) * 0.03
      o.position.set(pp.x, bob, pp.z)
      o.rotation.set(0, pp.r, sway)
      o.scale.set(s, s, s * 0.62)
      o.updateMatrix()
      bodies.current!.setMatrixAt(i, o.matrix)
      const top = BODY_HEIGHT * s
      o.position.set(pp.x - sway * top, top + 0.11 + bob * 1.3, pp.z)
      o.rotation.set(0, 0, 0)
      o.scale.set(1, 1.12, 1)
      o.updateMatrix()
      heads.current!.setMatrixAt(i, o.matrix)
      if (pp.hands) {
        // two arms up in a V, pumping a little on the kick
        const lift = 0.25 + 0.2 * kickAt(t + pp.phase, 4)
        for (const side of [-1, 1]) {
          o.position.set(pp.x + side * 0.2 * s - sway * top, top - 0.02 + bob, pp.z)
          o.rotation.set(0, pp.r, -side * lift)
          o.scale.set(1, 1, 1)
          o.translateY(0.33)
          o.updateMatrix()
          arms.current!.setMatrixAt(a++, o.matrix)
        }
      }
    })
    bodies.current!.instanceMatrix.needsUpdate = true
    heads.current!.instanceMatrix.needsUpdate = true
    arms.current!.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, material, count]} frustumCulled={false}>
        <latheGeometry args={[profile, 14]} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, material, count]} frustumCulled={false}>
        <sphereGeometry args={[0.105, 14, 10]} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, material, raised.length * 2]} frustumCulled={false}>
        <capsuleGeometry args={[0.032, 0.56, 3, 8]} />
      </instancedMesh>
    </group>
  )
}

/** Front-of-stage crowd barrier with a pit between it and the stage/PA. */
function Barrier() {
  const steel = useMemo(() => new MeshStandardMaterial({ color: '#8a8c8f', metalness: 0.9, roughness: 0.35 }), [])
  const sections = Array.from({ length: 16 }, (_, i) => -7.5 + i)
  return (
    <group position={[0, 0, 3.6]}>
      {sections.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={steel} position={[0, 1.1, 0]}>
            <boxGeometry args={[0.98, 0.05, 0.05]} />
          </mesh>
          <mesh material={steel} position={[0, 0.55, 0.01]}>
            <boxGeometry args={[0.98, 1.0, 0.012]} />
          </mesh>
          <mesh material={steel} position={[0, 0.02, -0.45]}>
            <boxGeometry args={[0.98, 0.03, 0.9]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Venue({ small, timeScale }: { small: boolean; timeScale: number }) {
  return (
    <group>
      <Shell />
      <Barrier />
      <Floor small={small} />
      <StageDeck />
      <FOH />
      <Crowd count={small ? 180 : 420} timeScale={timeScale} />
    </group>
  )
}
