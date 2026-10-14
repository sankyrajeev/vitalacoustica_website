import { Environment, Lightformer, MeshReflectorMaterial, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useRef } from 'react'
import { Vector3 } from 'three'
import { AMBER, RED } from './beat'
import { LedWall } from './LedWall'
import { MovingHeads } from './MovingHeads'
import { Booth, LineArray, Truss } from './StageRig'
import { VAMark3D } from './VAMark3D'

type Quality = { small: boolean; reducedMotion: boolean }

const LOOK_AT = new Vector3()

/** Slow dolly-in on load, then follow the pointer with a little parallax. */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size, pointer } = useThree()
  const start = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    const aspect = size.width / size.height
    // pull back on narrow (portrait) screens so the whole rig stays in frame
    const baseZ = aspect < 1.2 ? 13 + (1.2 - aspect) * 11 : 13
    // aim low so the rig sits in the upper part of the frame, above the headline
    LOOK_AT.set(0, aspect < 1 ? -0.4 : 0.9, 0)
    const intro = reducedMotion ? 1 : Math.min(1, (clock.elapsedTime - start.current) / 3.2)
    const ease = 1 - Math.pow(1 - intro, 3)
    const z = baseZ + (1 - ease) * 7
    const px = reducedMotion ? 0 : pointer.x * 0.9
    const py = reducedMotion ? 0 : pointer.y * 0.35
    camera.position.x += (px - camera.position.x) * 0.04
    camera.position.y += (1.7 + py - camera.position.y) * 0.04
    camera.position.z = z
    camera.lookAt(LOOK_AT)
  })
  return null
}

function Stage({ small, reducedMotion }: Quality) {
  const timeScale = reducedMotion ? 0.25 : 1
  return (
    <>
      <color attach="background" args={['#030303']} />
      <fog attach="fog" args={['#030303', 12, 32]} />
      <ambientLight intensity={0.08} />
      {/* soft key so the rig reads against the dark */}
      <directionalLight position={[4, 8, 6]} intensity={0.35} color="#ffd7b0" />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={5} color={RED} position={[-5, 3, 2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={5} color={AMBER} position={[5, 3, 2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 4]} scale={[8, 1, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="ring" intensity={3} color={AMBER} position={[0, 2, -6]} scale={3} />
        {/* soft white key in front so the chrome face reads as silver */}
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 3, 10]} scale={[10, 4, 1]} />
      </Environment>

      <LedWall timeScale={timeScale} />
      <Truss />
      <MovingHeads count={small ? 6 : 8} span={small ? 8 : 10} timeScale={timeScale} lights={!small} />
      <LineArray x={-4.7} />
      <LineArray x={4.7} />
      <Booth />
      <VAMark3D timeScale={timeScale} />

      <Sparkles count={small ? 60 : 140} scale={[14, 5, 8]} position={[0, 2.5, 0]} size={2.2} speed={0.25} opacity={0.45} color={AMBER} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[60, 40]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={small ? 256 : 768}
          mixBlur={1}
          mixStrength={22}
          roughness={1}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#070707"
          metalness={0.6}
        />
      </mesh>

      <CameraRig reducedMotion={reducedMotion} />

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.22} luminanceSmoothing={0.3} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Noise opacity={0.035} />
        <Vignette offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  )
}

export default function HeroScene({ active, small, reducedMotion }: Quality & { active: boolean }) {
  return (
    <Canvas
      dpr={small ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 1.7, 17], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      frameloop={active ? 'always' : 'never'}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Stage small={small} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  )
}
