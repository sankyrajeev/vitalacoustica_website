import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  Shape,
  Vector3,
} from 'three'
import { VA_MARK_POLYGONS, VA_MARK_SIZE } from '../../brand/vaMark'
import { AMBER, BEAT_SECONDS, beatsAt, kickAt, lookAt, RED } from '../beat'
import { show } from '../show'

// Lighting effects modelled on the house rig as it appears in show photos:
// tilted 2'×2' LED matrix panels, trefoil "3-blade fan" fixtures, 7-cell hex
// retro lights, Warcraft retro lights, LED wall washer bars, red pixel bars and LED neon flex.

const housing = new MeshStandardMaterial({ color: '#141414', metalness: 0.6, roughness: 0.45 })
// brushed aluminium, as on the wall washer bars
const aluminium = new MeshStandardMaterial({ color: '#8d8f91', metalness: 0.85, roughness: 0.38 })
const stand = new MeshStandardMaterial({ color: '#222', metalness: 0.9, roughness: 0.35 })
const red = new Color(RED)
const amber = new Color(AMBER)
const WARM = new Color('#ffb066')

type V3 = [number, number, number]

/* ─────────────── LED matrix panel (2' × 2', hung as a diamond) ─────────────── */

let logoTex: CanvasTexture | null = null
function logoTexture() {
  if (logoTex) return logoTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, 256, 256)
  const s = 190 / VA_MARK_SIZE.width
  // the panel hangs rotated 45°, so counter-rotate the logo to read level
  g.translate(128, 128)
  g.rotate(Math.PI / 4)
  g.translate(-(VA_MARK_SIZE.width * s) / 2, -(VA_MARK_SIZE.height * s) / 2)
  g.scale(s, s)
  g.fillStyle = '#fff'
  for (const poly of VA_MARK_POLYGONS) {
    g.beginPath()
    poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
  }
  logoTex = new CanvasTexture(c)
  return logoTex
}

const PANEL = 0.61

export function MatrixPanel({ phase = 0, ...props }: { phase?: number } & ThreeElements['group']) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uKick: { value: 0 },
          uLook: { value: 0 },
          uMaster: { value: 1 },
          uLogo: { value: logoTexture() },
          uRed: { value: red },
          uAmber: { value: amber },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime, uKick, uLook, uMaster;
          uniform sampler2D uLogo;
          uniform vec3 uRed, uAmber;
          varying vec2 vUv;
          // as on the real panel: a 7 × 7 grid of big warm-white dots over a fine RGB pixel field
          const float GRID = 28.0;
          const float DOTS = 7.0;
          void main() {
            vec2 cell = (floor(vUv * GRID) + 0.5) / GRID;
            vec2 dotCell = floor(vUv * DOTS);
            float bigDot = 1.0 - smoothstep(0.26, 0.33, length(fract(vUv * DOTS) - 0.5));
            float pix = (1.0 - smoothstep(0.16, 0.26, length(fract(vUv * GRID) - 0.5))) * (1.0 - bigDot);
            float logo = texture2D(uLogo, cell).r;
            float look = mod(uLook, 4.0);
            vec2 c = cell - 0.5;
            float lvl;
            vec3 col;
            float dotLvl;
            if (look < 1.0) {
              lvl = logo * (0.35 + 0.65 * uKick);
              col = mix(uRed, uAmber, 0.5 + 0.5 * sin(cell.y * 6.0 - uTime * 2.0));
              // dots chase down the panel row by row
              dotLvl = step(abs(dotCell.y - mod(floor(uTime * 4.0), DOTS)), 0.5) * 0.9 + 0.08;
            } else if (look < 2.0) {
              lvl = pow(0.5 + 0.5 * sin(length(c) * 30.0 - uTime * 6.0), 3.0) * (0.3 + 0.7 * uKick);
              col = uAmber;
              dotLvl = pow(0.5 + 0.5 * sin(length(dotCell - 3.0) * 1.4 - uTime * 6.0), 4.0);
            } else if (look < 3.0) {
              // full red wash punching on the kick, like the photos
              lvl = 0.25 + 0.75 * uKick;
              col = uRed;
              dotLvl = uKick;
            } else {
              float n = fract(sin(dot(floor(vUv * GRID), vec2(12.9898, 78.233)) + floor(uTime * 8.0)) * 43758.5453);
              lvl = max(step(0.88, n), logo * 0.5 * uKick);
              col = mix(uAmber, uRed, n);
              float m = fract(sin(dot(dotCell, vec2(39.3468, 11.135)) + floor(uTime * 6.0)) * 43758.5453);
              dotLvl = step(0.8, m);
            }
            vec3 warm = vec3(1.0, 0.62, 0.28);
            vec3 outCol = col * pix * lvl * 2.4 + warm * bigDot * (0.035 + dotLvl * 2.2);
            gl_FragColor = vec4(outCol * uMaster, 1.0);
          }
        `,
      }),
    [],
  )
  useFrame(() => {
    const t = show.time + phase
    material.uniforms.uTime.value = t
    material.uniforms.uKick.value = kickAt(t, 4)
    material.uniforms.uLook.value = lookAt(show.time)
    material.uniforms.uMaster.value = show.master
  })
  return (
    <group {...props}>
      <group rotation-z={Math.PI / 4}>
        <mesh material={material}>
          <planeGeometry args={[PANEL, PANEL]} />
        </mesh>
        <mesh material={housing} position={[0, 0, -0.04]}>
          <boxGeometry args={[PANEL + 0.03, PANEL + 0.03, 0.07]} />
        </mesh>
      </group>
    </group>
  )
}

/* ─────────────── Trefoil "3-blade fan" ─────────────── */

const petalGeometry = (() => {
  const s = new Shape()
  s.moveTo(0, 0.07)
  s.lineTo(0.1, 0.21)
  s.lineTo(0, 0.38)
  s.lineTo(-0.1, 0.21)
  s.closePath()
  return new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false })
})()
const petalCoreGeometry = (() => {
  const s = new Shape()
  s.moveTo(0, 0.11)
  s.lineTo(0.065, 0.21)
  s.lineTo(0, 0.33)
  s.lineTo(-0.065, 0.21)
  s.closePath()
  return new ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false })
})()

/** Three kite-shaped LED petals around a white-hot centre lens; the head spins. */
export function TrefoilFan({ direction = 1, phase = 0, ...props }: { direction?: number; phase?: number } & ThreeElements['group']) {
  const rotor = useRef<Group>(null)
  const petal = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const core = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const lens = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const last = useRef(show.time)
  useFrame(() => {
    const t = show.time + phase
    const dt = show.time - last.current
    last.current = show.time
    const kick = kickAt(t, 5)
    if (rotor.current) rotor.current.rotation.z += dt * direction * (0.4 + (lookAt(show.time) % 2) * 1.6)
    const m = show.master
    petal.color.copy(red).multiplyScalar((0.5 + 1.4 * kick) * m)
    core.color.copy(red).lerp(WARM, 0.35).multiplyScalar((1 + 2.4 * kick) * m)
    lens.color.copy(WARM).multiplyScalar((1.6 + 2 * kick) * m)
  })
  return (
    <group {...props}>
      <mesh material={housing} rotation-x={Math.PI / 2} position={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.09, 0.1, 0.12, 20]} />
      </mesh>
      <group ref={rotor}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation-z={(i * Math.PI * 2) / 3}>
            <mesh geometry={petalGeometry} material={housing} position={[0, 0, -0.03]} />
            <mesh geometry={petalCoreGeometry} material={i === 0 ? core : petal} position={[0, 0, 0.012]} />
          </group>
        ))}
        <mesh material={lens} position={[0, 0, 0.015]}>
          <circleGeometry args={[0.055, 24]} />
        </mesh>
      </group>
    </group>
  )
}

/* ─────────────── 7-cell hex retro light ─────────────── */

// As in the product photo: seven separate hexagonal cells behind honeycomb lenses,
// clustered inside a round tubular frame.
const HEX_R = 0.072
const HEX_CELLS: [number, number][] = [[0, 0], ...Array.from({ length: 6 }, (_, i): [number, number] => [Math.cos((i * Math.PI) / 3 + Math.PI / 6) * 0.158, Math.sin((i * Math.PI) / 3 + Math.PI / 6) * 0.158])]

let honeycombTex: CanvasTexture | null = null
/** White honeycomb lens pattern; the cell colour multiplies it. */
function honeycombTexture() {
  if (honeycombTex) return honeycombTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#1a1a1a'
  g.lineWidth = 3
  const r = 11
  for (let row = -1; row < 8; row++)
    for (let col = -1; col < 8; col++) {
      const cx = col * r * 1.75 + (row % 2) * r * 0.875
      const cy = row * r * 1.5
      g.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + Math.PI / 6
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (k) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      g.closePath()
      g.stroke()
    }
  honeycombTex = new CanvasTexture(c)
  return honeycombTex
}

/** Seven honeycomb hex cells in a round frame; one punches per beat, the ring chases. */
export function HexRetro({ index = 0, ...props }: { index?: number } & ThreeElements['group']) {
  const cells = useMemo(() => HEX_CELLS.map(() => new MeshBasicMaterial({ toneMapped: false, map: honeycombTexture() })), [])
  useFrame(() => {
    const t = show.time
    const beat = Math.floor(beatsAt(t))
    const decay = Math.exp(-((t % BEAT_SECONDS) / BEAT_SECONDS) * 3)
    const lit = (beat + index) % 4 === 0 ? decay : 0
    const tint = lookAt(t) % 2 ? WARM : red
    cells.forEach((m, i) => {
      // centre cell glows like a filament; ring chases round on the off-beats
      const chase = i > 0 && (Math.floor(beatsAt(t) * 2) % 6) + 1 === i ? 0.8 : 0
      m.color.copy(tint).multiplyScalar((0.35 + lit * 3 + chase + (i === 0 ? 0.4 : 0)) * show.master)
    })
  })
  return (
    <group {...props}>
      {/* round tubular frame with side mounts */}
      <mesh material={stand}>
        <torusGeometry args={[0.27, 0.011, 8, 48]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={stand} position={[s * 0.29, 0, -0.02]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
        </mesh>
      ))}
      {/* central hub the cells hang from */}
      <mesh material={housing} position={[0, 0, -0.05]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.12, 0.12, 0.05, 6]} />
      </mesh>
      {HEX_CELLS.map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh material={housing} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[HEX_R, HEX_R, 0.07, 6]} />
          </mesh>
          <mesh material={cells[i]} position={[0, 0, 0.036]} rotation-z={Math.PI / 2}>
            <circleGeometry args={[HEX_R * 0.84, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─────────────── Warcraft retro light ─────────────── */

const GOLD = new Color('#d08a1c')
const gold = new MeshStandardMaterial({ color: '#c79a3a', metalness: 0.9, roughness: 0.35, side: DoubleSide })
const can = new MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.5, roughness: 0.5, side: DoubleSide })

/**
 * As in the product photo: a deep round can with a gold reflector, a warm centre source,
 * a three-spoke front frame and a ring of LEDs around the rim, on a yoke.
 */
export function WarcraftRetro({ index = 0, ...props }: { index?: number } & ThreeElements['group']) {
  const glow = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const ring = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const inner = useMemo(() => new MeshStandardMaterial({ color: '#b07a1e', metalness: 0.6, roughness: 0.45, side: DoubleSide }), [])
  const R = 0.22
  const DEPTH = 0.26
  useFrame(() => {
    const t = show.time
    const kick = kickAt(t, 3)
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.4 + index)
    glow.color.copy(WARM).multiplyScalar((1.2 + 2.6 * kick) * show.master)
    // the reflector picks up the centre source
    inner.emissive.copy(GOLD).multiplyScalar((0.25 + 0.6 * kick) * show.master)
    ring.color.copy(amber).lerp(WARM, breathe).multiplyScalar((0.6 + breathe) * show.master)
  })
  return (
    <group {...props}>
      {/* yoke: a U bracket round the can, pivoting on its sides */}
      <mesh material={stand} position={[0, -R - 0.06, -DEPTH / 2]}>
        <boxGeometry args={[R * 2 + 0.1, 0.025, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={stand} position={[s * (R + 0.05), -0.04, -DEPTH / 2]}>
          <boxGeometry args={[0.025, R * 2 * 0.9, 0.05]} />
        </mesh>
      ))}
      <group rotation-x={-0.35}>
        {/* the can and its gold reflector */}
        <mesh material={can} position={[0, 0, -DEPTH / 2]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[R, R * 0.92, DEPTH, 40, 1, true]} />
        </mesh>
        <mesh material={inner} position={[0, 0, -DEPTH / 2]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[R * 0.97, R * 0.5, DEPTH * 0.96, 40, 1, true]} />
        </mesh>
        <mesh material={gold} position={[0, 0, -DEPTH + 0.01]}>
          <circleGeometry args={[R * 0.5, 32]} />
        </mesh>
        {/* warm centre source */}
        <mesh material={glow} position={[0, 0, -DEPTH + 0.04]}>
          <sphereGeometry args={[0.05, 20, 12]} />
        </mesh>
        {/* three-spoke front frame */}
        {[0, 1, 2].map((i) => (
          <group key={i} rotation-z={(i * Math.PI * 2) / 3 + Math.PI / 2}>
            <mesh material={can} position={[R / 2, 0, 0]}>
              <boxGeometry args={[R, 0.016, 0.01]} />
            </mesh>
          </group>
        ))}
        {/* rim and LED ring */}
        <mesh material={can}>
          <torusGeometry args={[R, 0.016, 8, 48]} />
        </mesh>
        <mesh material={ring} position={[0, 0, 0.012]}>
          <ringGeometry args={[R - 0.012, R + 0.004, 48]} />
        </mesh>
      </group>
    </group>
  )
}

/* ─────────────── LED bars (wall washers & pixel bars) ─────────────── */

type BarProps = { from: V3; to: V3; kind: 'dots' | 'pixels'; phase?: number }

/**
 * A straight LED bar between two points (in the XY plane), chasing on the beat.
 * 'dots' is the wall washer: 18 round LEDs in a grey aluminium body on brackets.
 * 'pixels' is the pixel bar: a slim black bar of small square RGB cells.
 */
export function LedBar({ from, to, kind, phase = 0 }: BarProps) {
  const cellsRef = useRef<InstancedMesh>(null)
  const count = kind === 'dots' ? 18 : 40
  const color = useMemo(() => new Color(), [])
  const { mid, length, angle } = useMemo(() => {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    return {
      mid: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2] as V3,
      length: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
    }
  }, [from, to])

  useLayoutEffect(() => {
    const o = new Object3D()
    for (let i = 0; i < count; i++) {
      o.position.set(-length / 2 + ((i + 0.5) * length) / count, 0, 0.034)
      o.updateMatrix()
      cellsRef.current!.setMatrixAt(i, o.matrix)
      cellsRef.current!.setColorAt(i, color.setRGB(0, 0, 0))
    }
    cellsRef.current!.instanceMatrix.needsUpdate = true
  }, [count, length, color])

  useFrame(() => {
    const t = show.time + phase
    const beats = beatsAt(t)
    const kick = kickAt(t, 4)
    for (let i = 0; i < count; i++) {
      let lvl: number
      if (kind === 'dots') {
        // warm dots fill outward on the bar, reset each bar
        const fill = (beats % 4) / 4
        lvl = 0.25 + (i / count < fill ? 1.6 : 0) + kick * 0.4
        color.copy(WARM).lerp(amber, 0.5)
      } else {
        const p = (i / count - beats * 0.5) % 1
        const head = Math.pow(Math.max(0, 1 - Math.abs(((p + 1) % 1) - 0.5) * 3), 2)
        lvl = 0.5 + head * 2.2 + kick * 0.5
        color.copy(red)
      }
      color.multiplyScalar(lvl * show.master)
      cellsRef.current!.setColorAt(i, color)
    }
    cellsRef.current!.instanceColor!.needsUpdate = true
  })

  return (
    <group position={mid} rotation-z={angle}>
      {kind === 'dots' ? (
        <>
          <mesh material={aluminium}>
            <boxGeometry args={[length + 0.04, 0.07, 0.06]} />
          </mesh>
          {/* mounting brackets at each end */}
          {[-1, 1].map((e) => (
            <mesh key={e} material={aluminium} position={[(e * length) / 2.6, -0.05, -0.02]}>
              <boxGeometry args={[0.03, 0.05, 0.05]} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh material={housing}>
          <boxGeometry args={[length + 0.03, 0.03, 0.04]} />
        </mesh>
      )}
      <instancedMesh ref={cellsRef} args={[undefined, undefined, count]}>
        {kind === 'dots' ? (
          <circleGeometry args={[Math.min(0.022, (length / count) * 0.36), 16]} />
        ) : (
          <planeGeometry args={[Math.min(0.02, (length / count) * 0.7), Math.min(0.02, (length / count) * 0.7)]} />
        )}
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/* ─────────────── LED rope ─────────────── */

/** Flexible LED rope / neon run along a path; pulses between red and amber. */
export function LedRope({ points, warm = false }: { points: V3[]; warm?: boolean }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'catmullrom', 0.05), [points])
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  useFrame(() => {
    const t = show.time
    material.color
      .copy(red)
      .lerp(amber, warm ? 0.5 + 0.5 * Math.sin(t * 0.8) : 0.1)
      .multiplyScalar((1.4 + 1.4 * kickAt(t, 6)) * show.master)
  })
  return (
    <mesh material={material}>
      <tubeGeometry args={[curve, 64, 0.014, 6, false]} />
    </mesh>
  )
}

/* ─────────────── Wing: one side of the booth, as rigged at The Park ─────────────── */

/** A ground-support post carrying a matrix panel, trefoil, hex retro, dot bar and pixel bars. */
export function Wing({ side, deckTop, z = -1.7 }: { side: 1 | -1; deckTop: number; z?: number }) {
  const s = side
  const f = z + 0.22 // front face of the post
  const y = (h: number) => deckTop + h
  const phase = s > 0 ? BEAT_SECONDS / 2 : 0
  return (
    <group>
      {/* post */}
      <mesh material={stand} position={[s * 3.0, y(1.4), z]}>
        <boxGeometry args={[0.2, 2.8, 0.2]} />
      </mesh>
      <mesh material={stand} position={[s * 3.0, y(0.02), z]}>
        <boxGeometry args={[0.6, 0.04, 0.6]} />
      </mesh>
      <mesh material={stand} position={[s * 2.95, y(2.55), z + 0.1]}>
        <boxGeometry args={[1.3, 0.05, 0.05]} />
      </mesh>
      <MatrixPanel phase={phase} position={[s * 3.4, y(2.5), f]} rotation-y={-s * 0.3} />
      <TrefoilFan phase={phase} direction={s} position={[s * 2.4, y(2.3), f]} />
      <HexRetro index={s > 0 ? 2 : 0} position={[s * 3.6, y(1.45), f]} />
      <LedBar kind="dots" phase={phase} from={[s * 3.25, y(1.6), f]} to={[s * 2.2, y(2.0), f]} />
      <LedBar kind="pixels" phase={phase} from={[s * 2.45, y(1.35), f]} to={[s * 3.55, y(0.35), f]} />
      <LedBar kind="pixels" phase={phase} from={[s * 3.55, y(0.3), f]} to={[s * 2.4, y(0.3), f]} />
    </group>
  )
}
