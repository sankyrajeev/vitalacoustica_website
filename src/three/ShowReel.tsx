import { useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, ShaderMaterial, SRGBColorSpace, type Texture, Vector2 } from 'three'
import type { ShowPhoto } from '../content/shows'
import { AMBER, kickAt, RED } from './beat'
import { REEL_GAP as GAP, REEL_HEIGHT as HEIGHT, reelStops, reelWidth } from './reelLayout'

// The show reel: photos hang in a dark room, rendered as an LED dot-matrix.
// Your cursor is a follow spot — wherever it points, the real photo shows through.


export type ReelControl = { offset: number; target: number; velocity: number }

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uMouse;
  uniform float uSpot, uFull, uKick, uAspect, uFocus, uTime;
  uniform vec3 uRed, uAmber;
  varying vec2 vUv;
  void main() {
    vec2 grid = vec2(120.0, 120.0 / uAspect);
    vec2 cellUv = (floor(vUv * grid) + 0.5) / grid;
    vec3 cell = texture2D(uTex, cellUv).rgb;
    float lum = dot(cell, vec3(0.299, 0.587, 0.114));
    vec3 tint = mix(uRed, uAmber, smoothstep(0.15, 0.7, lum));
    vec3 ledCol = mix(cell, tint * lum, 0.55) * (1.5 + 0.6 * uKick);
    float dotMask = 1.0 - smoothstep(0.28, 0.5, length(fract(vUv * grid) - 0.5));
    vec3 led = ledCol * dotMask;

    vec3 photo = texture2D(uTex, vUv).rgb;
    float d = length((vUv - uMouse) * vec2(uAspect, 1.0));
    float r = 0.22 + 0.02 * uKick;
    float spot = (1.0 - smoothstep(r * 0.65, r, d)) * uSpot;
    float rim = smoothstep(r * 0.6, r * 0.95, d) * (1.0 - smoothstep(r * 0.95, r * 1.15, d)) * uSpot;
    float m = max(spot, uFull);

    vec3 col = mix(led, photo * 1.08, m) + uAmber * rim * 0.35;
    // panels away from centre sit back in the dark
    col *= mix(0.35, 1.0, uFocus);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

type PanelProps = {
  photo: ShowPhoto
  texture: Texture
  x: number
  width: number
  index: number
  control: ReelControl
  touch: boolean
  onOpen: (i: number) => void
  dragged: () => boolean
}

function Panel({ photo, texture, x, width, index, control, touch, onOpen, dragged }: PanelProps) {
  const group = useRef<Group>(null)
  const hover = useRef(false)
  const mouse = useRef(new Vector2(0.5, 0.5))
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTex: { value: texture },
          uMouse: { value: new Vector2(0.5, 0.5) },
          uSpot: { value: 0 },
          uFull: { value: 0 },
          uKick: { value: 0 },
          uAspect: { value: photo.width / photo.height },
          uFocus: { value: 1 },
          uTime: { value: 0 },
          uRed: { value: new Color(RED) },
          uAmber: { value: new Color(AMBER) },
        },
      }),
    [texture, photo],
  )

  useFrame(({ clock }, dt) => {
    const u = material.uniforms
    const pos = x - control.offset
    const focus = Math.max(0, 1 - Math.abs(pos) / (width + GAP))
    const k = 1 - Math.exp(-dt * 8)
    u.uFocus.value += (Math.max(0.15, focus) - u.uFocus.value) * k
    u.uSpot.value += ((hover.current ? 1 : 0) - u.uSpot.value) * k
    // on touch screens there's no hover, so the centred photo lights up fully
    u.uFull.value += ((touch && focus > 0.6 ? 1 : 0) - u.uFull.value) * (1 - Math.exp(-dt * 3))
    ;(u.uMouse.value as Vector2).lerp(mouse.current, 1 - Math.exp(-dt * 14))
    u.uKick.value = kickAt(clock.elapsedTime, 5)
    u.uTime.value = clock.elapsedTime
    if (group.current) {
      // gentle curve: panels away from centre swing back and turn towards the viewer
      group.current.position.set(pos, 0, -Math.abs(pos) * 0.18)
      group.current.rotation.y = -pos * 0.08
    }
  })

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.uv) mouse.current.copy(e.uv)
    hover.current = true
  }

  return (
    <group ref={group}>
      <mesh
        material={material}
        onPointerMove={onMove}
        onPointerOver={(e) => {
          onMove(e)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hover.current = false
          document.body.style.cursor = ''
        }}
        onClick={() => !dragged() && onOpen(index)}
      >
        <planeGeometry args={[width, HEIGHT]} />
      </mesh>
    </group>
  )
}

function Reel({ photos, control, touch, onOpen, dragged }: Omit<Props, 'active'>) {
  const textures = useTexture(photos.map((p) => `${import.meta.env.BASE_URL}shows/${p.src}-1600.webp`))
  textures.forEach((t) => (t.colorSpace = SRGBColorSpace))
  const layout = useMemo(() => {
    const stops = reelStops(photos)
    return photos.map((p, i) => ({ at: stops[i], width: reelWidth(p) }))
  }, [photos])

  const { camera, size } = useThree()
  useEffect(() => {
    // fit the centred photo with some breathing room on any screen
    const aspect = size.width / size.height
    camera.position.z = aspect < 1 ? 6.6 / aspect : 4.6
  }, [camera, size])

  useFrame((_, dt) => {
    // ease towards the target and settle with a little inertia
    const k = 1 - Math.exp(-dt * 6)
    control.offset += (control.target - control.offset) * k
  })

  return (
    <>
      {photos.map((p, i) => (
        <Panel
          key={p.id}
          photo={p}
          texture={textures[i]}
          x={layout[i].at}
          width={layout[i].width}
          index={i}
          control={control}
          touch={touch}
          onOpen={onOpen}
          dragged={dragged}
        />
      ))}
    </>
  )
}

type Props = {
  photos: ShowPhoto[]
  control: ReelControl
  touch: boolean
  active: boolean
  onOpen: (i: number) => void
  dragged: () => boolean
}

export default function ShowReel({ active, ...props }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.6], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={active ? 'always' : 'never'}
    >
      <Reel {...props} />
    </Canvas>
  )
}
