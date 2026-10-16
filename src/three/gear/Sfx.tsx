import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, MeshStandardMaterial, NormalBlending, ShaderMaterial } from 'three'
import { barInLook } from '../beat'
import { show } from '../show'

// Special effects: a haze machine in its flight case and smoke machines on the deck's front edge.
// Haze follows the desk's haze fader; smoke fires while the desk's button is held, or by itself at
// the start of every new look when the desk's smoke is on auto.

const black = new MeshStandardMaterial({ color: '#141414', metalness: 0.3, roughness: 0.6 })
const alu = new MeshStandardMaterial({ color: '#b9bcc0', metalness: 0.9, roughness: 0.3 })
const silver = new MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.7, roughness: 0.35 })
const tank = new MeshStandardMaterial({ color: '#e8e8e4', metalness: 0, roughness: 0.4, transparent: true, opacity: 0.85 })
const display = new MeshStandardMaterial({ color: '#0a1a33', emissive: '#3a8cff', emissiveIntensity: 1.6 })
const redLamp = new MeshStandardMaterial({ color: '#400', emissive: '#ff2a1a', emissiveIntensity: 2 })

/** Is the smoke firing right now? */
const smokeFiring = () =>
  show.smokeHold || performance.now() / 1000 < show.smokeUntil || (show.smokeAuto && barInLook(show.time) < 0.5)

/* ─────────────── soft particles ─────────────── */

type Emitter = {
  geo: BufferGeometry
  mat: ShaderMaterial
  step: (dt: number, rate: number) => void
}

/**
 * A pool of soft round particles. Each is born at the nozzle with a velocity, slows down, rises,
 * grows and fades over its life.
 */
function makeEmitter(o: {
  count: number
  life: [number, number]
  speed: [number, number]
  spread: number
  rise: number
  drag: number
  size: [number, number]
  dir: [number, number, number]
  color: string
  opacity: number
  additive?: boolean
}): Emitter {
  const n = o.count
  const pos = new Float32Array(n * 3)
  const vel = new Float32Array(n * 3)
  const age = new Float32Array(n).fill(1e9)
  const life = new Float32Array(n).fill(1)
  const alpha = new Float32Array(n)
  const size = new Float32Array(n)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1))
  geo.setAttribute('aSize', new BufferAttribute(size, 1))
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: o.additive ? AdditiveBlending : NormalBlending,
    uniforms: { uColor: { value: new Color(o.color) }, uOpacity: { value: o.opacity }, uPx: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aSize;
      uniform float uPx;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * a * vAlpha * uOpacity);
      }
    `,
  })
  let debt = 0
  let next = 0
  const rnd = (a: number, b: number) => a + Math.random() * (b - a)
  function step(dt: number, rate: number) {
    debt += rate * dt
    while (debt >= 1) {
      debt -= 1
      // reuse the oldest slot
      const i = next
      next = (next + 1) % n
      age[i] = 0
      life[i] = rnd(o.life[0], o.life[1])
      const sp = rnd(o.speed[0], o.speed[1])
      pos[i * 3] = rnd(-0.02, 0.02)
      pos[i * 3 + 1] = rnd(-0.02, 0.02)
      pos[i * 3 + 2] = 0
      vel[i * 3] = o.dir[0] * sp + rnd(-o.spread, o.spread)
      vel[i * 3 + 1] = o.dir[1] * sp + rnd(-o.spread, o.spread) * 0.5
      vel[i * 3 + 2] = o.dir[2] * sp + rnd(-o.spread, o.spread) * 0.3
    }
    const k = Math.exp(-o.drag * dt)
    for (let i = 0; i < n; i++) {
      age[i] += dt
      const u = age[i] / life[i]
      if (u >= 1) {
        alpha[i] = 0
        continue
      }
      vel[i * 3] *= k
      vel[i * 3 + 1] = vel[i * 3 + 1] * k + o.rise * dt
      vel[i * 3 + 2] *= k
      pos[i * 3] += vel[i * 3] * dt
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      alpha[i] = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u)
      size[i] = o.size[0] + (o.size[1] - o.size[0]) * Math.sqrt(u)
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aAlpha.needsUpdate = true
    geo.attributes.aSize.needsUpdate = true
  }
  return { geo, mat, step }
}

/** Keeps a particle material's point size in step with the canvas. */
function usePointScale(mat: ShaderMaterial) {
  const { size, camera, gl } = useThree()
  useFrame(() => {
    const fov = 'fov' in camera ? (camera.fov as number) : 42
    mat.uniforms.uPx.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(((fov / 2) * Math.PI) / 180))
  })
}

/* ─────────────── Haze machine, in its flight case ─────────────── */

export function Hazer(props: ThreeElements['group']) {
  const fans = useRef<Group[]>([])
  const haze = useMemo(
    () =>
      makeEmitter({
        count: 220,
        life: [5, 8],
        speed: [0.5, 0.9],
        spread: 0.25,
        rise: 0.05,
        drag: 0.35,
        size: [0.25, 2.6],
        dir: [0, 0.55, 0.85],
        color: '#d8d2c6',
        opacity: 0.09,
      }),
    [],
  )
  usePointScale(haze.mat)
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    haze.step(d, 30 * show.haze)
    for (const f of fans.current) if (f) f.rotation.z -= d * (4 + 26 * show.haze)
  })
  const W = 0.6
  const H = 0.42
  const D = 0.5
  return (
    <group {...props}>
      {/* the case, on castors */}
      <mesh material={black} position={[0, 0.06 + H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`}>
            <mesh material={alu} position={[(sx * W) / 2, 0.06 + H / 2, (sz * D) / 2]}>
              <boxGeometry args={[0.03, H + 0.01, 0.03]} />
            </mesh>
            <mesh material={black} position={[sx * (W / 2 - 0.05), 0.03, sz * (D / 2 - 0.05)]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.03, 0.03, 0.025, 12]} />
            </mesh>
          </group>
        )),
      )}
      {[0.06, 0.06 + H].map((y) => (
        <mesh key={y} material={alu} position={[0, y, 0]}>
          <boxGeometry args={[W + 0.02, 0.025, D + 0.02]} />
        </mesh>
      ))}
      {/* the control panel: display, buttons and a red switch */}
      <mesh material={black} position={[0.08, 0.06 + H + 0.03, 0.12]} rotation-x={-0.35}>
        <boxGeometry args={[0.36, 0.05, 0.2]} />
      </mesh>
      <mesh material={display} position={[0.12, 0.06 + H + 0.065, 0.12]} rotation-x={-0.35 - Math.PI / 2}>
        <planeGeometry args={[0.13, 0.07]} />
      </mesh>
      <mesh material={redLamp} position={[-0.05, 0.06 + H + 0.06, 0.13]}>
        <boxGeometry args={[0.03, 0.015, 0.02]} />
      </mesh>
      {/* a cooling fan grille on the side */}
      <mesh material={alu} position={[W / 2 + 0.002, 0.06 + H * 0.45, 0.05]} rotation-y={Math.PI / 2}>
        <ringGeometry args={[0.06, 0.075, 24]} />
      </mesh>
      {/* the lid, hinged open at the back, with three fans blowing the haze out */}
      <group position={[0, 0.06 + H, -D / 2]} rotation-x={-0.55}>
        <mesh material={black} position={[0, 0.2, -0.02]}>
          <boxGeometry args={[W, 0.4, 0.05]} />
        </mesh>
        <mesh material={alu} position={[0, 0.4, -0.02]}>
          <boxGeometry args={[W + 0.02, 0.025, 0.06]} />
        </mesh>
        {[-0.18, 0, 0.18].map((x, i) => (
          <group key={x} position={[x, 0.22, 0.01]}>
            <mesh material={alu}>
              <ringGeometry args={[0.065, 0.078, 24]} />
            </mesh>
            <group ref={(g) => void (g && (fans.current[i] = g))}>
              {[0, 1, 2, 3, 4].map((b) => (
                <mesh key={b} material={silver} rotation-z={(b / 5) * Math.PI * 2} position={[0, 0, 0.005]}>
                  <boxGeometry args={[0.012, 0.11, 0.004]} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
        {/* the haze leaves from the fans */}
        <points geometry={haze.geo} material={haze.mat} position={[0, 0.22, 0.05]} rotation-x={0.55} frustumCulled={false} />
      </group>
    </group>
  )
}

/* ─────────────── Smoke machine, with its wired remote ─────────────── */

export function SmokeMachine(props: ThreeElements['group']) {
  const smoke = useMemo(
    () =>
      makeEmitter({
        count: 320,
        life: [2.8, 4.6],
        speed: [2.2, 3.4],
        spread: 0.35,
        rise: 0.18,
        drag: 1.1,
        size: [0.15, 2.4],
        dir: [0, 0.12, 1],
        color: '#e6e2da',
        opacity: 0.22,
      }),
    [],
  )
  usePointScale(smoke.mat)
  const lamp = useRef<MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    const firing = smokeFiring()
    smoke.step(Math.min(dt, 0.05), firing ? 70 : 0)
    if (lamp.current) lamp.current.emissiveIntensity = firing ? 3 : 0.4
  })
  return (
    <group {...props}>
      {/* body: silver sides, a black top */}
      <mesh material={silver} position={[0, 0.1, 0]}>
        <boxGeometry args={[0.3, 0.17, 0.48]} />
      </mesh>
      <mesh material={black} position={[0, 0.19, 0]}>
        <boxGeometry args={[0.31, 0.025, 0.49]} />
      </mesh>
      {/* the fluid tank and its cap */}
      <mesh material={tank} position={[-0.07, 0.25, -0.13]}>
        <boxGeometry args={[0.13, 0.09, 0.17]} />
      </mesh>
      <mesh material={black} position={[-0.07, 0.31, -0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
      </mesh>
      {/* carry handle */}
      <mesh material={black} position={[0.06, 0.25, 0.02]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.07, 0.012, 8, 20, Math.PI]} />
      </mesh>
      {/* the nozzle, pointing at the crowd */}
      <mesh material={black} position={[0, 0.1, 0.25]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.03, 0.04, 16]} />
      </mesh>
      {/* the wired remote, on the deck beside it */}
      <mesh material={black} position={[0.28, 0.015, 0.12]}>
        <boxGeometry args={[0.07, 0.03, 0.1]} />
      </mesh>
      <mesh position={[0.28, 0.035, 0.14]}>
        <boxGeometry args={[0.02, 0.008, 0.02]} />
        <meshStandardMaterial ref={lamp} color="#400" emissive="#ff2a1a" emissiveIntensity={0.4} />
      </mesh>
      <mesh material={black} position={[0.22, 0.01, -0.07]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
      </mesh>
      <points geometry={smoke.geo} material={smoke.mat} position={[0, 0.1, 0.28]} frustumCulled={false} />
    </group>
  )
}
