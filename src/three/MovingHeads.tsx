import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CylinderGeometry, Group, MeshStandardMaterial, Object3D, SpotLight } from 'three'
import { AMBER, BEAT_SECONDS, beatsAt, kickAt, RED, smoothstep } from './beat'
import { createBeamMaterial } from './BeamMaterial'

const BEAM_LENGTH = 16

type Aim = { swing: number; tilt: number }
type Pattern = (t: number, i: number, n: number) => Aim

// Each pattern returns where head i should point at time t.
const PATTERNS: Pattern[] = [
  // Wave: a ripple travelling across the rig
  (t, i) => ({ swing: 0.55 * Math.sin(t * 0.9 + i * 0.55), tilt: -0.45 - 0.2 * Math.sin(t * 0.6 + i * 0.35) }),
  // Fan: open and close from the centre
  (t, i, n) => {
    const side = (i - (n - 1) / 2) / ((n - 1) / 2)
    return { swing: side * 0.75 * (0.55 + 0.45 * Math.sin(t * 0.8)), tilt: -0.55 }
  },
  // Cross: neighbours scissor past each other
  (t, i) => ({ swing: (i % 2 ? 1 : -1) * 0.5 * Math.sin(t * 0.75), tilt: -0.35 - 0.3 * Math.abs(Math.sin(t * 0.75 + i)) }),
  // Ballyhoo: lazy circles
  (t, i) => ({ swing: 0.35 * Math.sin(t * 1.1 + i), tilt: -0.5 + 0.3 * Math.cos(t * 1.1 + i) }),
]

const BARS_PER_PATTERN = 4

function aimAt(t: number, i: number, n: number): Aim {
  const bars = beatsAt(t) / 4
  const block = Math.floor(bars / BARS_PER_PATTERN)
  const current = PATTERNS[block % PATTERNS.length]
  const next = PATTERNS[(block + 1) % PATTERNS.length]
  // crossfade into the next pattern during the last bar of each block
  const k = smoothstep(BARS_PER_PATTERN - 1, BARS_PER_PATTERN, bars % BARS_PER_PATTERN)
  const a = current(t, i, n)
  const b = next(t, i, n)
  return { swing: a.swing + (b.swing - a.swing) * k, tilt: a.tilt + (b.tilt - a.tilt) * k }
}

const bodyMaterial = new MeshStandardMaterial({ color: '#141414', metalness: 0.6, roughness: 0.45 })
const beamGeometry = (() => {
  // narrow at the lens (origin), wide at the far end, pointing down -Y
  const g = new CylinderGeometry(0.06, 1.25, BEAM_LENGTH, 40, 1, true)
  g.translate(0, -BEAM_LENGTH / 2, 0)
  return g
})()

type HeadProps = { index: number; count: number; x: number; color: string; timeScale: number; withLight: boolean }

function MovingHead({ index, count, x, color, timeScale, withLight }: HeadProps) {
  const head = useRef<Group>(null)
  const light = useRef<SpotLight>(null)
  const target = useRef<Object3D>(null)
  const lens = useRef<MeshStandardMaterial>(null)
  const beam = useMemo(() => createBeamMaterial(color), [color])

  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * timeScale
    const { swing, tilt } = aimAt(t, index, count)
    if (head.current) {
      head.current.rotation.z = swing
      head.current.rotation.x = tilt
    }
    // Kick-driven intensity, alternate heads accent the off-beat
    const kick = kickAt(t + (index % 2 ? BEAT_SECONDS / 2 : 0), 4)
    const level = 0.45 + 0.55 * kick
    beam.uniforms.uOpacity.value = 0.5 * level
    beam.uniforms.uTime.value = t
    if (lens.current) lens.current.emissiveIntensity = 6 + 10 * kick
    if (light.current) light.current.intensity = 40 + 60 * kick
  })

  return (
    <group position={[x, 4.25, -0.6]}>
      {/* yoke */}
      <mesh material={bodyMaterial} position={[0, 0.18, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.26]} />
      </mesh>
      <group ref={head} rotation-order="ZXY">
        <mesh material={bodyMaterial} position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.15, 0.19, 0.38, 20]} />
        </mesh>
        <mesh position={[0, -0.25, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.13, 24]} />
          <meshStandardMaterial ref={lens} color="#000" emissive={color} emissiveIntensity={8} toneMapped={false} />
        </mesh>
        <mesh geometry={beamGeometry} material={beam} position={[0, -0.24, 0]} renderOrder={2} />
        {withLight && (
          <>
            <spotLight ref={light} color={color} angle={0.16} penumbra={0.6} distance={22} decay={1.4} />
            <object3D ref={target} position={[0, -10, 0]} />
          </>
        )}
      </group>
    </group>
  )
}

export function MovingHeads({ count = 8, span = 9, timeScale = 1, lights = true }) {
  const heads = Array.from({ length: count }, (_, i) => ({
    x: -span / 2 + (span * i) / (count - 1),
    color: i % 2 ? AMBER : RED,
  }))
  return (
    <>
      {heads.map((h, i) => (
        <MovingHead
          key={i}
          index={i}
          count={count}
          x={h.x}
          color={h.color}
          timeScale={timeScale}
          // real spotlights are expensive; only every other head casts one
          withLight={lights && i % 2 === 0}
        />
      ))}
    </>
  )
}
