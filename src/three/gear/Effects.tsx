import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  Vector3,
} from 'three'
import { VA_MARK_POLYGONS, VA_MARK_SIZE } from '../../brand/vaMark'
import { AMBER, BEAT_SECONDS, beatsAt, kickAt, lookAt, RED } from '../beat'

const housing = new MeshStandardMaterial({ color: '#141414', metalness: 0.6, roughness: 0.45 })
const stand = new MeshStandardMaterial({ color: '#222', metalness: 0.9, roughness: 0.35 })
const red = new Color(RED)
const amber = new Color(AMBER)

/* ─────────────── LED matrix screen: 2 × 2 panels ─────────────── */

function logoTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, 256, 256)
  const s = 200 / VA_MARK_SIZE.width
  g.translate(128 - (VA_MARK_SIZE.width * s) / 2, 128 - (VA_MARK_SIZE.height * s) / 2)
  g.scale(s, s)
  g.fillStyle = '#fff'
  for (const poly of VA_MARK_POLYGONS) {
    g.beginPath()
    poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
  }
  return new CanvasTexture(c)
}

/** 2 m × 2 m screen built from four 1 m matrix panels; shows the VA mark and red/amber looks. */
export function LedMatrix({ timeScale = 1, ...props }: { timeScale?: number } & ThreeElements['group']) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uKick: { value: 0 },
          uLook: { value: 0 },
          uLogo: { value: logoTexture() },
          uRed: { value: red },
          uAmber: { value: amber },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime, uKick, uLook;
          uniform sampler2D uLogo;
          uniform vec3 uRed, uAmber;
          varying vec2 vUv;
          const float GRID = 48.0; // pixels across the whole 2x2 screen
          void main() {
            vec2 cell = (floor(vUv * GRID) + 0.5) / GRID;
            vec2 local = fract(vUv * GRID);
            float led = 1.0 - smoothstep(0.32, 0.46, length(local - 0.5));
            // seams between the four panels
            vec2 seam = abs(vUv - 0.5);
            float panel = step(0.006, seam.x) * step(0.006, seam.y);
            float logo = texture2D(uLogo, cell).r;
            float look = mod(uLook, 4.0);
            vec3 col;
            float lvl;
            vec2 c = cell - 0.5;
            if (look < 1.0) {
              // logo, red→amber sweep, breathing on the kick
              lvl = logo * (0.45 + 0.55 * uKick);
              col = mix(uRed, uAmber, 0.5 + 0.5 * sin(cell.y * 6.0 - uTime * 2.0));
            } else if (look < 2.0) {
              // amber rings out from the centre
              lvl = pow(0.5 + 0.5 * sin(length(c) * 40.0 - uTime * 6.0), 3.0) * (0.3 + 0.7 * uKick);
              col = uAmber;
            } else if (look < 3.0) {
              // logo cut out of red scan bars
              float bars = step(0.5, fract(cell.y * 8.0 - uTime * 1.5));
              lvl = max(logo, bars * 0.35 * (1.0 - logo)) * (0.4 + 0.6 * uKick);
              col = mix(uRed, uAmber, logo);
            } else {
              // sparkle field with the logo outline glowing
              float n = fract(sin(dot(floor(vUv * GRID), vec2(12.9898, 78.233)) + floor(uTime * 8.0)) * 43758.5453);
              lvl = max(step(0.92, n) * 0.8, logo * 0.6 * uKick);
              col = mix(uAmber, uRed, n);
            }
            gl_FragColor = vec4(col * led * panel * lvl * 2.2, 1.0);
          }
        `,
      }),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * timeScale
    material.uniforms.uTime.value = t
    material.uniforms.uKick.value = kickAt(t, 4)
    material.uniforms.uLook.value = lookAt(t)
  })
  return (
    <group {...props}>
      <mesh material={material}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <mesh material={housing} position={[0, 0, -0.06]}>
        <boxGeometry args={[2.06, 2.06, 0.1]} />
      </mesh>
      {/* ground-support legs down to the deck */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} material={stand} position={[x, -1.25, -0.1]}>
          <boxGeometry args={[0.05, 0.5, 0.05]} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────── LED pixel bars ─────────────── */

const PIXELS = 16

/** Vertical 1 m pixel bars, 16 cells each, chasing red/amber. */
export function PixelBars({ positions, timeScale = 1 }: { positions: [number, number, number][]; timeScale?: number }) {
  const cells = useRef<InstancedMesh>(null)
  const count = positions.length * PIXELS
  const color = useMemo(() => new Color(), [])
  useLayoutEffect(() => {
    const o = new Object3D()
    positions.forEach((p, b) => {
      for (let i = 0; i < PIXELS; i++) {
        o.position.set(p[0], p[1] + 0.05 + (i + 0.5) * (0.92 / PIXELS), p[2] + 0.032)
        o.updateMatrix()
        cells.current!.setMatrixAt(b * PIXELS + i, o.matrix)
        cells.current!.setColorAt(b * PIXELS + i, color.setRGB(0, 0, 0))
      }
    })
    cells.current!.instanceMatrix.needsUpdate = true
  }, [positions, color])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * timeScale
    const beats = beatsAt(t)
    const kick = kickAt(t, 4)
    positions.forEach((_, b) => {
      for (let i = 0; i < PIXELS; i++) {
        // a chase running up the bars, offset per bar
        const phase = (i / PIXELS - beats * 0.5 + b * 0.25) % 1
        const head = Math.pow(Math.max(0, 1 - Math.abs(((phase + 1) % 1) - 0.5) * 4), 2)
        const lvl = 0.06 + head * 2.4 + kick * 0.35
        color.copy(b % 2 ? amber : red).multiplyScalar(lvl)
        cells.current!.setColorAt(b * PIXELS + i, color)
      }
    })
    cells.current!.instanceColor!.needsUpdate = true
  })

  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={housing} position={[0, 0.5, 0]}>
            <boxGeometry args={[0.06, 1, 0.06]} />
          </mesh>
          <mesh material={stand} position={[0, 0.01, 0]}>
            <boxGeometry args={[0.2, 0.02, 0.14]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={cells} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.044, 0.052, 0.006]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/* ─────────────── LED rope ─────────────── */

/** Flexible LED rope run along a path; pulses between red and amber. */
export function LedRope({ points, timeScale = 1 }: { points: [number, number, number][]; timeScale?: number }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'catmullrom', 0.05), [points])
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * timeScale
    material.color.copy(red).lerp(amber, 0.5 + 0.5 * Math.sin(t * 0.8)).multiplyScalar(1.4 + 1.6 * kickAt(t, 6))
  })
  return (
    <mesh material={material}>
      <tubeGeometry args={[curve, 120, 0.012, 6, false]} />
    </mesh>
  )
}

/* ─────────────── Retro 3-blade fan ─────────────── */

/** Retro fan effect: 3 rotating blades lined with amber LEDs inside a round housing. */
export function RetroFan({ timeScale = 1, direction = 1, ...props }: { timeScale?: number; direction?: number } & ThreeElements['group']) {
  const rotor = useRef<Group>(null)
  const strip = useMemo(() => new MeshBasicMaterial({ color: amber.clone(), toneMapped: false }), [])
  const hub = useMemo(() => new MeshBasicMaterial({ color: red.clone(), toneMapped: false }), [])
  const angle = useRef(0)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * timeScale
    const kick = kickAt(t, 5)
    angle.current += dt * timeScale * direction * (1.2 + (lookAt(t) % 2) * 2.2)
    if (rotor.current) rotor.current.rotation.z = angle.current
    strip.color.copy(amber).multiplyScalar(0.8 + 2.4 * kick)
    hub.color.copy(red).multiplyScalar(1 + 2 * kick)
  })
  return (
    <group {...props}>
      <mesh material={housing}>
        <torusGeometry args={[0.46, 0.035, 10, 48]} />
      </mesh>
      <mesh material={housing} position={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.46, 0.46, 0.04, 40]} />
      </mesh>
      <group ref={rotor} position={[0, 0, 0.02]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation-z={(i * Math.PI * 2) / 3}>
            <mesh material={housing} position={[0, 0.22, 0]} rotation-z={0.25}>
              <boxGeometry args={[0.13, 0.36, 0.02]} />
            </mesh>
            <mesh material={strip} position={[0, 0.22, 0.012]} rotation-z={0.25}>
              <boxGeometry args={[0.03, 0.32, 0.006]} />
            </mesh>
          </group>
        ))}
        <mesh material={hub} position={[0, 0, 0.02]}>
          <circleGeometry args={[0.06, 20]} />
        </mesh>
      </group>
      {/* floor stand */}
      <mesh material={stand} position={[0, -0.9, -0.06]}>
        <cylinderGeometry args={[0.02, 0.02, 1.3, 8]} />
      </mesh>
      <mesh material={stand} position={[0, -1.54, -0.06]}>
        <cylinderGeometry args={[0.22, 0.24, 0.03, 20]} />
      </mesh>
    </group>
  )
}

/* ─────────────── Retro wash lights ─────────────── */

const WARM = new Color('#ffb066')

/** Retro wash: a big warm "tungsten" centre with a red pixel ring, chasing on the beat. */
export function RetroWashes({ positions, timeScale = 1 }: { positions: [number, number, number][]; timeScale?: number }) {
  const mats = useMemo(
    () => positions.map(() => ({ core: new MeshBasicMaterial({ toneMapped: false }), ring: new MeshBasicMaterial({ toneMapped: false }) })),
    [positions],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * timeScale
    const beat = Math.floor(beatsAt(t))
    const decay = Math.exp(-((t % BEAT_SECONDS) / BEAT_SECONDS) * 3)
    mats.forEach((m, i) => {
      // one lamp punches per beat, the rest glow low like warm filaments
      const hit = beat % mats.length === i ? decay : 0
      m.core.color.copy(WARM).multiplyScalar(0.35 + hit * 3.2)
      m.ring.color.copy(red).multiplyScalar(0.6 + 1.6 * kickAt(t, 5))
    })
  })
  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={housing} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.17, 0.15, 0.14, 28]} />
          </mesh>
          <mesh material={mats[i].core} position={[0, 0, 0.072]}>
            <circleGeometry args={[0.11, 28]} />
          </mesh>
          <mesh material={mats[i].ring} position={[0, 0, 0.073]}>
            <ringGeometry args={[0.125, 0.155, 32]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
