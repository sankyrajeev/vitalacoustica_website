import { MeshReflectorMaterial } from '@react-three/drei'
import { useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import { usePalette } from './palette'

// A warehouse room for the show: concrete shell, steel roof trusses, columns,
// a raised stage deck, DJ booth and FOH position.

import { DJSet } from './gear/DJ'
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

/** Stage deck with skirting, steps, and the DJ booth with the Pioneer DJ set. */
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
        {/* two CDJ-3000X and a DJM-V10-LF */}
        <group position={[0, 1.025, 0]}>
          <DJSet />
        </group>
      </group>
    </group>
  )
}

/** Yamaha DM3: 320 W × 140 H × 455 D mm, 9" touchscreen above 8 + 1 faders. */
function DM3() {
  return (
    <group rotation-x={0.12}>
      <mesh material={gearMat} position={[0, 0.035, 0]}>
        <boxGeometry args={[0.32, 0.07, 0.455]} />
      </mesh>
      {/* raised screen bay at the back */}
      <mesh material={gearMat} position={[0, 0.085, -0.13]} rotation-x={-0.35}>
        <boxGeometry args={[0.3, 0.02, 0.17]} />
      </mesh>
      <mesh position={[0, 0.097, -0.127]} rotation-x={-Math.PI / 2 - 0.35}>
        <planeGeometry args={[0.2, 0.12]} />
        <meshBasicMaterial color="#3d6c94" toneMapped={false} />
      </mesh>
      {/* faders */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} material={fader} position={[-0.135 + i * 0.033 + (i === 8 ? 0.008 : 0), 0.074, 0.12 - (i * 7) % 5 * 0.006]}>
          <boxGeometry args={[0.012, 0.01, 0.02]} />
        </mesh>
      ))}
    </group>
  )
}

const fader = new MeshStandardMaterial({ color: '#d9d9d9', roughness: 0.4 })

/** Front-of-house: a table on a riser in the middle of the room with the DM3. */
function FOH() {
  return (
    <group position={[0, 0, 20]}>
      <mesh material={deckMat} position={[0, 0.15, 0]}>
        <boxGeometry args={[3.2, 0.3, 2.2]} />
      </mesh>
      {/* table */}
      <mesh material={gearMat} position={[0, 1.0, -0.3]}>
        <boxGeometry args={[1.6, 0.04, 0.7]} />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} material={gearMat} position={[x, 0.65, -0.3]}>
          <boxGeometry args={[0.04, 0.68, 0.62]} />
        </mesh>
      ))}
      <group position={[0, 1.02, -0.25]}>
        <DM3 />
      </group>
      {/* FOH barrier */}
      <mesh material={gearMat} position={[0, 0.55, 1.2]}>
        <boxGeometry args={[3.4, 1.1, 0.05]} />
      </mesh>
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

export function Venue({ small }: { small: boolean }) {
  return (
    <group>
      <Shell />
      <Barrier />
      <Floor small={small} />
      <StageDeck />
      <FOH />
    </group>
  )
}
