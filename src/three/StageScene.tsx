import { Environment, Lightformer, OrbitControls, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useRef } from 'react'
import { Euler, MathUtils, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { rigGear, type RigId } from '../content/gear'
import { AMBER, RED } from './beat'
import { controlAxes, droneInput, telemetry } from './drone'
import { HexRetro, NeonSwags, WarcraftRetro, Wing } from './gear/Effects'
import { Sharpies } from './gear/Sharpies'
import { BoothMonitors, PAStack } from './gear/Speakers'
import { GoalPostTruss } from './gear/Truss'
import { EXPLORE_HOME, HOTSPOTS } from './hotspots'
import { markerEls } from './markers'
import { DECK, VENUE } from './layout'
import { PALETTES, PaletteContext, type SceneTheme, usePalette } from './palette'
import { tickShow } from './show'
import { Venue } from './Venue'

export type SceneMode = 'drone' | 'explore'

type SceneProps = {
  small: boolean
  reducedMotion: boolean
  theme: SceneTheme
  mode: SceneMode
  focus: RigId | null
  haze: number
}

/** Advances the shared show clock once per frame, before any fixture reads it. */
function ShowClock({ timeScale }: { timeScale: number }) {
  useFrame((_, dt) => tickShow(dt, timeScale), -1)
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

const goalPos = new Vector3()
const goalTarget = new Vector3()

/** Orbit around the stage; when a piece of gear is picked, glide the camera to it. */
function ExploreCamera({ focus }: { focus: RigId | null }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const flying = useRef(true)

  useEffect(() => {
    const spot = focus ? HOTSPOTS[focus] : null
    goalPos.set(...(spot ? spot.camera : EXPLORE_HOME.camera))
    goalTarget.set(...(spot ? spot.at : EXPLORE_HOME.target))
    flying.current = true
  }, [focus])

  useFrame(({ camera }, dt) => {
    const c = controls.current
    if (!c || !flying.current) return
    const k = 1 - Math.exp(-dt * 3)
    camera.position.lerp(goalPos, k)
    c.target.lerp(goalTarget, k)
    c.update()
    if (camera.position.distanceTo(goalPos) < 0.02 && c.target.distanceTo(goalTarget) < 0.02) flying.current = false
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={1.2}
      maxDistance={20}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.04}
      // the user grabbing the view cancels any fly-to in progress
      onStart={() => (flying.current = false)}
    />
  )
}

const projected = new Vector3()

/** Moves the DOM gear markers to their fixtures' on-screen positions. */
function MarkerProjector() {
  useFrame(({ camera, size }) => {
    for (const g of rigGear) {
      const el = markerEls.get(g.id)
      if (!el) continue
      projected.set(...HOTSPOTS[g.id].at).project(camera)
      const visible = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1
      el.style.visibility = visible ? 'visible' : 'hidden'
      if (visible) el.style.transform = `translate(${((projected.x + 1) / 2) * size.width}px, ${((1 - projected.y) / 2) * size.height}px)`
    }
  })
  return null
}

function Stage({ small }: { small: boolean }) {
  const p = usePalette()
  const deckTop = DECK.height
  return (
    <group>
      <GoalPostTruss span={10} height={5.2} z={-0.6} />
      <Sharpies count={small ? 6 : 8} lights={!small && p.theme === 'dark'} />
      <Wing side={-1} deckTop={deckTop} />
      <Wing side={1} deckTop={deckTop} />
      {/* hex retros on the goal-post towers */}
      <HexRetro index={0} position={[-5, 1.8, -0.36]} />
      <HexRetro index={1} position={[-5, 3.3, -0.36]} />
      <HexRetro index={2} position={[5, 1.8, -0.36]} />
      <HexRetro index={3} position={[5, 3.3, -0.36]} />
      {/* LED neon flex hung in swags behind the booth, as it's rigged at shows */}
      <NeonSwags deckTop={deckTop} />
      {/* Warcraft retro lights on the deck's front corners, tilted up at the crowd */}
      <WarcraftRetro index={0} position={[-3.9, deckTop + 0.3, 0.55]} />
      <WarcraftRetro index={2} position={[3.9, deckTop + 0.3, 0.55]} />
      <BoothMonitors deckTop={deckTop} />
      <PAStack x={-6.3} z={0.9} toe={0.2} />
      <PAStack x={6.3} z={0.9} toe={-0.2} />
    </group>
  )
}

/** Haze particles; density follows the desk's haze fader. */
function Haze({ small, theme, haze }: { small: boolean; theme: SceneTheme; haze: number }) {
  return (
    <Sparkles
      count={small ? 70 : 160}
      scale={[22, 7, 24]}
      position={[0, 3.5, 8]}
      size={2.4}
      speed={0.2}
      opacity={(theme === 'dark' ? 0.6 : 0.25) * haze}
      color={AMBER}
    />
  )
}

function Scene({ small, reducedMotion, theme, mode, focus, haze }: SceneProps) {
  const p = PALETTES[theme]
  return (
    <PaletteContext.Provider value={p}>
      <ShowClock timeScale={reducedMotion ? 0.25 : 1} />
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

      <Venue small={small} />
      <Stage small={small} />
      <Haze small={small} theme={theme} haze={haze} />

      {mode === 'drone' && <DroneCamera />}
      {mode === 'explore' && (
        <>
          <ExploreCamera focus={focus} />
          <MarkerProjector />
        </>
      )}

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
      camera={{ position: [0, 3.2, 14], fov: 42, near: 0.05, far: 120 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      frameloop={active ? 'always' : 'never'}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  )
}
