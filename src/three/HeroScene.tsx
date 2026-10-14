import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useRef } from 'react'
import { Euler, MathUtils, Vector3 } from 'three'
import { AMBER, RED } from './beat'
import { controlAxes, droneInput, telemetry } from './drone'
import { LedMatrix, LedRope, PixelBars, RetroFan, RetroWashes } from './gear/Effects'
import { Sharpies } from './gear/Sharpies'
import { PAStack } from './gear/Speakers'
import { GoalPostTruss } from './gear/Truss'
import { PALETTES, PaletteContext, type SceneTheme, usePalette } from './palette'
import { DECK, VENUE } from './layout'
import { Venue } from './Venue'

type SceneProps = { small: boolean; reducedMotion: boolean; theme: SceneTheme; drone: boolean }

const LOOK = new Vector3()

/** Audience-eye view: slow push-in on load, then gentle parallax with the pointer. */
function HeroCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size, pointer } = useThree()
  const start = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    const aspect = size.width / size.height
    const portrait = aspect < 1
    const baseZ = portrait ? Math.min(17.5, 14 + (1 - aspect) * 7) : 12
    const intro = reducedMotion ? 1 : Math.min(1, (clock.elapsedTime - start.current) / 3.5)
    const ease = 1 - Math.pow(1 - intro, 3)
    const tx = reducedMotion ? 0 : pointer.x * 1.1
    // eye height of someone on the FOH riser, so the crowd sits low in frame
    const ty = 3.5 + (reducedMotion ? 0 : pointer.y * 0.35)
    const tz = baseZ + (1 - ease) * 8
    // during the intro z is driven directly; afterwards everything eases (also back from drone mode)
    const k = 0.04
    camera.position.x += (tx - camera.position.x) * k
    camera.position.y += (ty - camera.position.y) * k
    camera.position.z = intro < 1 ? tz : camera.position.z + (tz - camera.position.z) * k
    // aim low so the rig sits in the upper part of the frame, above the headline
    LOOK.set(0, portrait ? -0.6 : 0.1, 0)
    camera.lookAt(LOOK)
  })
  return null
}

const euler = new Euler(0, 0, 0, 'YXZ')
const velocity = new Vector3()
const desired = new Vector3()

/** Free-flight drone: inertia, banking into turns, clamped inside the warehouse. */
function DroneCamera() {
  const { camera } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)

  useEffect(() => {
    // pick up the current view direction so entering drone mode is seamless
    euler.setFromQuaternion(camera.quaternion, 'YXZ')
    yaw.current = euler.y
    pitch.current = euler.x
    velocity.set(0, 0, 0)
  }, [camera])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    yaw.current -= droneInput.look.dx * 0.0032
    pitch.current = MathUtils.clamp(pitch.current - droneInput.look.dy * 0.0032, -1.35, 0.9)
    droneInput.look.dx = droneInput.look.dy = 0

    const { forward, strafe, lift, fast } = controlAxes()
    const speed = fast ? 9 : 4.5
    const sy = Math.sin(yaw.current)
    const cy = Math.cos(yaw.current)
    desired.set(-sy * forward + cy * strafe, lift * 0.7, -cy * forward - sy * strafe).multiplyScalar(speed)
    velocity.lerp(desired, 1 - Math.exp(-dt * 2.8))

    const p = camera.position.addScaledVector(velocity, dt)
    p.x = MathUtils.clamp(p.x, -VENUE.halfWidth + 0.6, VENUE.halfWidth - 0.6)
    p.z = MathUtils.clamp(p.z, VENUE.front + 0.6, VENUE.back - 0.6)
    p.y = MathUtils.clamp(p.y, 0.5, VENUE.height - 0.5)
    // don't fly through the stage deck
    if (Math.abs(p.x) < DECK.halfWidth && p.z < DECK.front && p.z > DECK.back) p.y = Math.max(p.y, DECK.height + 0.5)

    // bank and pitch with the motion, like a real airframe
    const localStrafe = velocity.x * cy - velocity.z * sy
    const localForward = -velocity.x * sy - velocity.z * cy
    euler.set(pitch.current - localForward * 0.012, yaw.current, -localStrafe * 0.035)
    camera.quaternion.setFromEuler(euler)

    telemetry.altitude = p.y
    telemetry.speed = velocity.length()
    telemetry.heading = ((-yaw.current * 180) / Math.PI + 3600) % 360
    telemetry.x = p.x
    telemetry.z = p.z
  })
  return null
}

function Stage({ small, timeScale }: { small: boolean; timeScale: number }) {
  const p = usePalette()
  const deckTop = DECK.height
  return (
    <group>
      <GoalPostTruss span={10} height={5.2} z={-0.6} />
      <Sharpies count={small ? 6 : 8} timeScale={timeScale} lights={!small && p.theme === 'dark'} />
      <LedMatrix timeScale={timeScale} position={[0, deckTop + 2.55, -2.2]} />
      <RetroFan timeScale={timeScale} position={[-2.45, deckTop + 1.6, -2.1]} />
      <RetroFan timeScale={timeScale} direction={-1} position={[2.45, deckTop + 1.6, -2.1]} />
      <PixelBars
        timeScale={timeScale}
        positions={[
          [-3.6, deckTop, -2.2],
          [-4.2, deckTop, -1.6],
          [3.6, deckTop, -2.2],
          [4.2, deckTop, -1.6],
        ]}
      />
      <RetroWashes
        timeScale={timeScale}
        positions={[
          [-5, 1.6, -0.36],
          [-5, 2.7, -0.36],
          [-5, 3.8, -0.36],
          [5, 1.6, -0.36],
          [5, 2.7, -0.36],
          [5, 3.8, -0.36],
        ]}
      />
      {/* LED rope along the deck edge and the booth front */}
      <LedRope
        timeScale={timeScale}
        points={[
          [-DECK.halfWidth, deckTop + 0.01, DECK.front + 0.01],
          [0, deckTop + 0.01, DECK.front + 0.01],
          [DECK.halfWidth, deckTop + 0.01, DECK.front + 0.01],
        ]}
      />
      <LedRope
        timeScale={timeScale}
        points={[
          [-1.1, deckTop + 0.98, 0.18],
          [0, deckTop + 0.98, 0.18],
          [1.1, deckTop + 0.98, 0.18],
        ]}
      />
      <PAStack x={-6.3} z={0.9} toe={0.2} />
      <PAStack x={6.3} z={0.9} toe={-0.2} />
    </group>
  )
}

function Scene({ small, reducedMotion, theme, drone }: SceneProps) {
  const p = PALETTES[theme]
  const timeScale = reducedMotion ? 0.25 : 1
  return (
    <PaletteContext.Provider value={p}>
      <color attach="background" args={[p.background]} />
      <fog attach="fog" args={[p.background, p.fogNear, p.fogFar]} />
      <ambientLight intensity={p.ambient} />
      <hemisphereLight args={['#ffffff', '#3a3631', p.hemi]} />
      {theme === 'light' && <directionalLight position={[-6, 12, 10]} intensity={1.4} color="#fff6ea" />}
      {theme === 'dark' && (
        <>
          {/* stage backlight spilling over the crowd so heads read as silhouettes */}
          <spotLight position={[0, 6, -4]} angle={0.9} penumbra={1} intensity={90} distance={40} decay={1.3} color={AMBER} />
          <pointLight position={[-7, 2.5, 3]} intensity={14} distance={12} color={RED} />
          <pointLight position={[7, 2.5, 3]} intensity={14} distance={12} color={AMBER} />
        </>
      )}

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} color={RED} position={[-6, 3, 4]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={4} color={AMBER} position={[6, 3, 4]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer
          form="rect"
          intensity={theme === 'light' ? 3 : 1.2}
          color="#ffffff"
          position={[0, 8, 6]}
          scale={[12, 2, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer form="rect" intensity={theme === 'light' ? 2 : 0.6} color="#ffffff" position={[0, 3, 14]} scale={[10, 4, 1]} />
      </Environment>

      <Venue small={small} timeScale={timeScale} />
      <Stage small={small} timeScale={timeScale} />

      <Sparkles
        count={small ? 70 : 160}
        scale={[22, 7, 24]}
        position={[0, 3.5, 8]}
        size={2.4}
        speed={0.2}
        opacity={theme === 'dark' ? 0.35 : 0.15}
        color={AMBER}
      />

      {drone ? <DroneCamera /> : <HeroCamera reducedMotion={reducedMotion} />}

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={p.bloomIntensity} luminanceThreshold={p.bloomThreshold} luminanceSmoothing={0.3} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Noise opacity={theme === 'dark' ? 0.035 : 0.02} />
        <Vignette offset={0.25} darkness={theme === 'dark' ? 0.85 : 0.35} />
      </EffectComposer>
    </PaletteContext.Provider>
  )
}

export default function HeroScene({ active, ...props }: SceneProps & { active: boolean }) {
  return (
    <Canvas
      dpr={props.small ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 2.2, 22], fov: 42, near: 0.05, far: 120 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      frameloop={active ? 'always' : 'never'}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  )
}
