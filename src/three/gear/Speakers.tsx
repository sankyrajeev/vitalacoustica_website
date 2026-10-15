import { useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'

// Loudspeakers, modelled to their published dimensions:
//   d&b V10P      — 308 W × 700 H × 466 D mm, 2×10" + 8" + 1.4" HF, 110°×40°
//   d&b B22-SUB   — 1160 W × 585 H × 920 D mm, 2×18" bandpass
//   RCF ART 915-A — 410 W × 716 H × 415 D mm, 15" + 1.75" HF, 100°×60°

/** Perforated steel grille as a tiling texture. */
function useGrilleTexture(repeatX: number, repeatY: number) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = '#1a1a1a'
    g.fillRect(0, 0, 64, 64)
    g.fillStyle = '#020202'
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.beginPath()
        g.arc(x * 16 + 8 + (y % 2) * 8, y * 16 + 8, 5, 0, Math.PI * 2)
        g.fill()
      }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [repeatX, repeatY])
}

const cabinet = new MeshStandardMaterial({ color: '#141414', metalness: 0.1, roughness: 0.85 })
const hardware = new MeshStandardMaterial({ color: '#2e2e2e', metalness: 0.9, roughness: 0.4 })
const badge = new MeshStandardMaterial({ color: '#d8d8d8', metalness: 1, roughness: 0.25 })

export function V10P({ tilt = -0.06 }) {
  const grille = useGrilleTexture(5, 11)
  const W = 0.308
  const H = 0.7
  const D = 0.466
  return (
    <group rotation-x={tilt}>
      <mesh material={cabinet} position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2 + 0.003]}>
        <planeGeometry args={[W - 0.02, H - 0.02]} />
        <meshStandardMaterial map={grille} metalness={0.7} roughness={0.55} />
      </mesh>
      {/* d&b badge */}
      <mesh material={badge} position={[0, 0.045, D / 2 + 0.006]}>
        <boxGeometry args={[0.06, 0.016, 0.004]} />
      </mesh>
      {/* side handles */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={hardware} position={[(s * W) / 2 + s * 0.006, H * 0.62, -0.05]}>
          <boxGeometry args={[0.012, 0.03, 0.14]} />
        </mesh>
      ))}
    </group>
  )
}

export function B22Sub() {
  const grille = useGrilleTexture(14, 3)
  const W = 1.16
  const H = 0.585
  const D = 0.92
  return (
    <group>
      <mesh material={cabinet} position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {/* bandpass mouth behind the grille */}
      <mesh position={[0, H / 2, D / 2 + 0.003]}>
        <planeGeometry args={[W - 0.06, H - 0.1]} />
        <meshStandardMaterial map={grille} metalness={0.7} roughness={0.55} />
      </mesh>
      <mesh material={badge} position={[W / 2 - 0.09, 0.03, D / 2 + 0.006]}>
        <boxGeometry args={[0.08, 0.02, 0.004]} />
      </mesh>
      {/* recessed side handles */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={hardware} position={[(s * W) / 2 + s * 0.004, H * 0.6, 0]}>
          <boxGeometry args={[0.01, 0.05, 0.22]} />
        </mesh>
      ))}
      {/* castor board feet */}
      {[-1, 1].map((s) => (
        <mesh key={`f${s}`} material={hardware} position={[s * (W / 2 - 0.12), -0.01, 0]}>
          <boxGeometry args={[0.12, 0.02, D - 0.1]} />
        </mesh>
      ))}
    </group>
  )
}

/** RCF ART 915-A: tapered moulded cabinet with a full-front grille and side handle pockets. */
export function ART915() {
  const grille = useGrilleTexture(6, 10)
  const W = 0.41
  const H = 0.716
  const D = 0.415
  return (
    <group>
      {/* front section, then the tapered back */}
      <mesh material={cabinet} position={[0, H / 2, D * 0.2]}>
        <boxGeometry args={[W, H, D * 0.6]} />
      </mesh>
      <mesh material={cabinet} position={[0, H / 2, -D * 0.2]}>
        <boxGeometry args={[W * 0.8, H * 0.94, D * 0.4]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2 + 0.003]}>
        <planeGeometry args={[W - 0.03, H - 0.03]} />
        <meshStandardMaterial map={grille} metalness={0.7} roughness={0.55} />
      </mesh>
      {/* RCF badge */}
      <mesh material={hardware} position={[0, 0.07, D / 2 + 0.006]}>
        <boxGeometry args={[0.05, 0.05, 0.004]} />
      </mesh>
      {/* side handle pockets */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={hardware} position={[(s * W) / 2 + s * 0.004, H * 0.6, D * 0.05]}>
          <boxGeometry args={[0.01, 0.15, 0.1]} />
        </mesh>
      ))}
    </group>
  )
}

const STAND_HEIGHT = 1.05
const LEG_SPREAD = 0.42
const LEG_TOP = 0.42

/** Tripod speaker stand: three splayed legs, a collar and a pole. */
function SpeakerStand() {
  const leg = Math.hypot(LEG_SPREAD, LEG_TOP)
  const tilt = Math.atan2(LEG_SPREAD, LEG_TOP)
  return (
    <group>
      <mesh material={hardware} position={[0, STAND_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.017, 0.017, STAND_HEIGHT, 12]} />
      </mesh>
      <mesh material={hardware} position={[0, LEG_TOP, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 12]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation-y={(i * Math.PI * 2) / 3}>
          <mesh material={hardware} position={[LEG_SPREAD / 2, LEG_TOP / 2, 0]} rotation-z={tilt}>
            <cylinderGeometry args={[0.011, 0.011, leg, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** DJ booth monitors: a pair of ART 915-A on tripod stands either side of the booth, angled at the DJ. */
export function BoothMonitors({ deckTop }: { deckTop: number }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.55, deckTop, -0.35]}>
          <SpeakerStand />
          <group position={[0, STAND_HEIGHT, 0]} rotation-y={-s * 1.9}>
            <ART915 />
          </group>
        </group>
      ))}
    </group>
  )
}

/** One side of the PA: two stacked B22-SUBs with a V10P on top, toed in. */
export function PAStack({ x = 0, z = 0, toe = 0 }) {
  return (
    <group position={[x, 0.02, z]} rotation-y={toe}>
      <B22Sub />
      <group position={[0, 0.605, 0]}>
        <B22Sub />
      </group>
      <group position={[0, 1.21, 0.15]}>
        <V10P />
      </group>
    </group>
  )
}
