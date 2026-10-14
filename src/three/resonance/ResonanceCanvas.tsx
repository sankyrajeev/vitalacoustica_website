import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Color, Group, LineBasicMaterial, MeshPhysicalMaterial, ShaderMaterial, SpotLight, type WebGLProgramParametersWithUniforms } from 'three'
import { initialParams, targetParams, type SceneParams } from './director'
import { buildResonance } from './geometry'

const BRASS = '#b8a47b'
const IVORY = '#f0ede5'

type Props = {
  theme: 'dark' | 'light'
  mobile: boolean
  reducedMotion: boolean
  /** element whose opacity follows the scene (the fixed backdrop) */
  host: RefObject<HTMLDivElement | null>
  onReady: () => void
}

const live = initialParams() // smoothed values actually on screen
const goal = initialParams()

/** Reads section positions every animation frame and only asks R3F to render when something is visible or moving. */
function Director({ mobile, host }: Pick<Props, 'mobile' | 'host'>) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'))
      targetParams(sections, window.innerHeight, mobile, goal)
      if (host.current) host.current.style.opacity = String(live.opacity)
      // keep rendering while visible or still easing; pause entirely under full-screen overlays
      const covered = document.documentElement.classList.contains('is-locked')
      if (!covered && (live.opacity > 0.01 || goal.opacity > 0.01)) invalidate()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mobile, host, invalidate])
  return null
}

function useRibbonMaterial(theme: Props['theme']) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uWave: { value: 0 } }), [])
  const material = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color: theme === 'dark' ? '#3a3632' : '#4a4640',
      metalness: 1,
      roughness: theme === 'dark' ? 0.3 : 0.26,
      anisotropy: 0.75,
      clearcoat: 0.2,
      clearcoatRoughness: 0.45,
      envMapIntensity: theme === 'dark' ? 1.15 : 1.35,
    })
    m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute vec2 aCoord;
           uniform float uTime;
           uniform float uWave;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           // sound: a slow travelling wave along the ribbon, strongest at the centre line
           // fade out near the seam where the loop closes on itself
           float env = (1.0 - 0.6 * aCoord.y * aCoord.y) * smoothstep(0.0, 0.08, aCoord.x) * (1.0 - smoothstep(0.92, 1.0, aCoord.x));
           float wave = sin(aCoord.x * 6.2831 * 7.0 - uTime * 1.6) * 0.5 + sin(aCoord.x * 6.2831 * 13.0 - uTime * 2.3) * 0.25;
           transformed += objectNormal * wave * env * uWave * 0.075;`,
        )
    }
    return m
  }, [theme, uniforms])
  return { material, uniforms }
}

function Resonance({ theme, mobile, reducedMotion }: Pick<Props, 'theme' | 'mobile' | 'reducedMotion'>) {
  const group = useRef<Group>(null)
  const ghost = useRef<Group>(null)
  const spot = useRef<SpotLight>(null)
  const { surface, lines } = useMemo(() => buildResonance(mobile ? 360 : 720), [mobile])
  const { material, uniforms } = useRibbonMaterial(theme)
  const lineMat = useMemo(() => new LineBasicMaterial({ color: BRASS, transparent: true, opacity: 0, depthWrite: false }), [])
  const ghostMat = useMemo(() => new LineBasicMaterial({ color: BRASS, transparent: true, opacity: 0, depthWrite: false }), [])
  const grid = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uAlpha: { value: 0 }, uColor: { value: new Color(BRASS) } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
        `,
        fragmentShader: /* glsl */ `
          uniform float uAlpha; uniform vec3 uColor; varying vec3 vWorld;
          float line(float x, float w) { float d = abs(fract(x - 0.5) - 0.5) / fwidth(x); return 1.0 - min(d / w, 1.0); }
          void main() {
            vec2 p = vWorld.xz;
            float minor = max(line(p.x * 2.0, 0.6), line(p.y * 2.0, 0.6)) * 0.35;
            float major = max(line(p.x / 2.0, 0.9), line(p.y / 2.0, 0.9));
            float fade = 1.0 - smoothstep(2.0, 9.0, length(p));
            gl_FragColor = vec4(uColor, max(minor, major) * fade * uAlpha * 0.5);
          }
        `,
      }),
    [],
  )
  const { camera } = useThree()
  const clock = useRef(0)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    // ease every parameter towards the scroll target; slow and even, never snappy
    const k = 1 - Math.exp(-dt * 2.2)
    for (const key of Object.keys(goal) as (keyof SceneParams)[]) live[key] += (goal[key] - live[key]) * k
    const motion = reducedMotion ? 0 : 1 - live.calm * 0.7
    clock.current += dt * motion

    const t = clock.current
    const g = group.current
    if (g) {
      g.position.set(live.x, live.y + Math.sin(t * 0.35) * 0.06, 0)
      g.rotation.set(live.tilt + Math.sin(t * 0.21) * 0.06, live.turn + t * 0.07, Math.sin(t * 0.17) * 0.05)
      g.scale.setScalar(live.scale)
    }
    if (ghost.current) {
      ghost.current.rotation.y = -t * 0.05
      ghost.current.rotation.x = 0.4 + Math.sin(t * 0.1) * 0.1
    }
    camera.position.set(0, 0.15, live.dist)
    camera.lookAt(0, 0, 0)

    uniforms.uTime.value = reducedMotion ? 0 : t * 2.2
    uniforms.uWave.value = live.wave
    lineMat.opacity = live.mesh * 0.5
    ghostMat.opacity = live.mesh * 0.16
    grid.uniforms.uAlpha.value = live.grid
    if (spot.current) {
      // light: a narrow warm source orbiting the form, drawing a highlight across the metal
      const a = t * (0.35 + live.sweep * 0.5)
      spot.current.position.set(Math.cos(a) * 4.5, 2.2 + Math.sin(a * 0.7) * 1.2, Math.sin(a) * 4.5)
      spot.current.intensity = 6 + live.sweep * 70
    }
  })

  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* the light edition reflects a pale gallery room, so the metal reads as graphite */}
        {theme === 'light' && <color attach="background" args={['#bdb7aa']} />}
        <Lightformer form="rect" intensity={theme === 'dark' ? 2.2 : 2.8} color={IVORY} position={[0, 5, -1]} scale={[10, 0.5, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={5} color={BRASS} position={[5, 0.8, 1.5]} scale={[0.35, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={2.5} color={BRASS} position={[-2, -3, 3]} scale={[6, 0.25, 1]} rotation-x={-Math.PI / 3} />
        <Lightformer form="rect" intensity={0.9} color={IVORY} position={[-5, 0.4, 2]} scale={[2.5, 4, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={theme === 'dark' ? 0.25 : 1.2} color={IVORY} position={[0, 1, 6]} scale={[8, 3, 1]} />
      </Environment>
      <directionalLight position={[-3, 5, 4]} intensity={0.6} color={IVORY} />
      <spotLight ref={spot} angle={0.32} penumbra={0.9} distance={14} decay={1.1} color={BRASS} />

      <group ref={group}>
        <mesh geometry={surface} material={material} />
        <lineSegments geometry={lines} material={lineMat} />
        <group ref={ghost} scale={1.32}>
          <lineSegments geometry={lines} material={ghostMat} />
        </group>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, -1.9, 0]} material={grid}>
        <planeGeometry args={[24, 24]} />
      </mesh>
    </>
  )
}

export default function ResonanceCanvas({ theme, mobile, reducedMotion, host, onReady }: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 0.15, 9], fov: 32, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={() => requestAnimationFrame(onReady)}
      key={theme}
      aria-hidden
    >
      <Director mobile={mobile} host={host} />
      <Resonance theme={theme} mobile={mobile} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
