import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, Group, MeshStandardMaterial, Object3D, SpotLight } from 'three'
import { BEAT_SECONDS, barInLook, kickAt, LOOK_BARS, lookAt, sharpyColor, smoothstep } from '../beat'
import { createBeamMaterial } from '../BeamMaterial'
import { usePalette } from '../palette'
import { show } from '../show'
import { TrussClamp } from './Truss'

// Sharpy-style beam moving heads, hung under the header truss.
// Tight, near-parallel shafts of light — each one is either red or amber.

const BEAM_LENGTH = 26

type Aim = { pan: number; tilt: number }
type Pattern = (t: number, i: number, n: number) => Aim

// Where head i points at time t. Tilt is measured from straight down, towards the crowd.
const PATTERNS: Pattern[] = [
  // wave rolling across the rig
  (t, i) => ({ pan: 0.5 * Math.sin(t * 0.9 + i * 0.6), tilt: 0.55 + 0.2 * Math.sin(t * 0.6 + i * 0.4) }),
  // fan opening and closing from the centre
  (t, i, n) => {
    const side = (i - (n - 1) / 2) / ((n - 1) / 2)
    return { pan: side * 0.8 * (0.5 + 0.5 * Math.sin(t * 0.7)), tilt: 0.75 }
  },
  // scissors: neighbours cross
  (t, i) => ({ pan: (i % 2 ? 1 : -1) * 0.55 * Math.sin(t * 0.8), tilt: 0.45 + 0.3 * Math.abs(Math.sin(t * 0.8 + i)) }),
  // all beams converge on one point that drifts over the crowd
  (t, i, n) => {
    const side = (i - (n - 1) / 2) / ((n - 1) / 2)
    return { pan: -side * 0.35 + 0.3 * Math.sin(t * 0.5), tilt: 0.95 + 0.1 * Math.sin(t * 0.9) }
  },
]

function aim(t: number, i: number, n: number): Aim {
  // the desk can lock one movement; otherwise the show cycles through them
  if (show.look !== null) return PATTERNS[show.look](t, i, n)
  const look = lookAt(t)
  const a = PATTERNS[look % PATTERNS.length](t, i, n)
  const b = PATTERNS[(look + 1) % PATTERNS.length](t, i, n)
  const k = smoothstep(LOOK_BARS - 1, LOOK_BARS, barInLook(t))
  return { pan: a.pan + (b.pan - a.pan) * k, tilt: a.tilt + (b.tilt - a.tilt) * k }
}

const body = new MeshStandardMaterial({ color: '#161616', metalness: 0.5, roughness: 0.45 })
const trim = new MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.9, roughness: 0.3 })
const beamGeometry = (() => {
  const g = new CylinderGeometry(0.035, 0.42, BEAM_LENGTH, 32, 1, true)
  g.translate(0, -BEAM_LENGTH / 2, 0)
  g.rotateX(Math.PI / 2) // point the beam down the head's local -Z (out of the lens)
  return g
})()

type HeadProps = { index: number; count: number; x: number; withLight: boolean }

function Sharpy({ index, count, x, withLight }: HeadProps) {
  const palette = usePalette()
  const yoke = useRef<Group>(null)
  const head = useRef<Group>(null)
  const light = useRef<SpotLight>(null)
  const target = useRef<Object3D>(null)
  const lens = useRef<MeshStandardMaterial>(null)
  const beam = useMemo(() => createBeamMaterial('#ff2414', palette.beamAdditive), [palette.beamAdditive])
  const color = useMemo(() => new Color(), [])

  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current
  }, [])

  useFrame(() => {
    const t = show.time
    const { pan, tilt } = aim(t, index, count)
    if (yoke.current) yoke.current.rotation.y = pan
    // head hangs lens-down; tilt swings it out towards the audience (+Z)
    if (head.current) head.current.rotation.x = -Math.PI / 2 - tilt
    color.set(sharpyColor(t, index, count))
    const kick = kickAt(t + (index % 2 ? BEAT_SECONDS / 2 : 0), 3.5)
    const level = 0.5 + 0.5 * kick
    beam.uniforms.uColor.value.copy(color)
    beam.uniforms.uOpacity.value = 0.62 * level * palette.beamOpacity * show.master * (0.2 + show.haze * 1.35)
    beam.uniforms.uTime.value = t
    if (lens.current) {
      lens.current.emissive.copy(color)
      lens.current.emissiveIntensity = (8 + 14 * kick) * show.master
    }
    if (light.current) {
      light.current.color.copy(color)
      light.current.intensity = (60 + 80 * kick) * show.master
    }
  })

  return (
    <group position={[x, 0, 0]}>
      <TrussClamp />
      {/* base (upside down, hanging from the clamp) */}
      <mesh material={body} position={[0, -0.12, 0]}>
        <boxGeometry args={[0.36, 0.14, 0.26]} />
      </mesh>
      <mesh material={trim} position={[0, -0.05, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.2]} />
      </mesh>
      <group ref={yoke} position={[0, -0.19, 0]}>
        {/* yoke arms */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={body} position={[s * 0.15, -0.12, 0]}>
            <boxGeometry args={[0.04, 0.26, 0.14]} />
          </mesh>
        ))}
        <mesh material={body} position={[0, -0.005, 0]}>
          <boxGeometry args={[0.34, 0.03, 0.14]} />
        </mesh>
        <group ref={head} position={[0, -0.2, 0]}>
          {/* head barrel, lens on local -Z */}
          <mesh material={body} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.11, 0.12, 0.3, 24]} />
          </mesh>
          <mesh material={trim} position={[0, 0, -0.152]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.1, 0.1, 0.01, 24]} />
          </mesh>
          <mesh position={[0, 0, -0.159]} rotation-y={Math.PI}>
            <circleGeometry args={[0.07, 24]} />
            <meshStandardMaterial ref={lens} color="#000" emissive="#ff2414" emissiveIntensity={10} toneMapped={false} />
          </mesh>
          <mesh geometry={beamGeometry} material={beam} position={[0, 0, -0.16]} renderOrder={2} />
          {withLight && (
            <>
              <spotLight ref={light} angle={0.06} penumbra={0.5} distance={30} decay={1.2} position={[0, 0, -0.17]} />
              <object3D ref={target} position={[0, 0, -10]} />
            </>
          )}
        </group>
      </group>
    </group>
  )
}

/** A row of sharpies along the header truss's bottom chords. */
export function Sharpies({ count = 8, span = 8.4, y = 4.88, z = -0.6, lights = true }) {
  const xs = Array.from({ length: count }, (_, i) => -span / 2 + (span * i) / (count - 1))
  return (
    <group position={[0, y, z]}>
      {xs.map((x, i) => (
        <Sharpy
          key={i}
          index={i}
          count={count}
          x={x}
          // real lights are expensive — every other head throws one for floor hits
          withLight={lights && i % 2 === 0}
        />
      ))}
    </group>
  )
}
