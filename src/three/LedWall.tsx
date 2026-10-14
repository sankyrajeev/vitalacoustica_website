import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, ShaderMaterial } from 'three'
import { AMBER, BEAT_SECONDS, RED } from './beat'

// An LED video wall behind the stage. Individual pixels are drawn in the shader,
// with a slow red/amber wave that pulses on the kick.
export function LedWall({ width = 11, height = 4.2, timeScale = 1 }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBeat: { value: BEAT_SECONDS },
          uRed: { value: new Color(RED) },
          uAmber: { value: new Color(AMBER) },
          uGrid: { value: [width * 14, height * 14] },
        },
        toneMapped: false,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uBeat;
          uniform vec3 uRed;
          uniform vec3 uAmber;
          uniform vec2 uGrid;
          varying vec2 vUv;
          void main() {
            vec2 cell = floor(vUv * uGrid) / uGrid;
            vec2 local = fract(vUv * uGrid);
            // round LED pixel
            float led = 1.0 - smoothstep(0.28, 0.5, length(local - 0.5));
            float kick = exp(-mod(uTime, uBeat) / uBeat * 5.0);
            // horizontal bars sweeping up, plus a centre ripple on the kick
            float bars = 0.5 + 0.5 * sin(cell.y * 18.0 - uTime * 2.0 + sin(cell.x * 3.0 + uTime * 0.4) * 2.0);
            float ripple = 0.5 + 0.5 * sin(length((cell - vec2(0.5, 0.45)) * vec2(2.6, 1.0)) * 22.0 - uTime * 5.0);
            float level = mix(bars, ripple, 0.45) * (0.25 + 0.75 * kick);
            level = pow(level, 2.0);
            vec3 col = mix(uRed, uAmber, smoothstep(0.2, 0.9, cell.y + 0.15 * sin(uTime * 0.5)));
            // darker edges so the wall sits back in the scene
            float vignette = smoothstep(0.0, 0.25, cell.x) * (1.0 - smoothstep(0.75, 1.0, cell.x)) * smoothstep(0.0, 0.2, cell.y);
            gl_FragColor = vec4(col * led * level * vignette * 1.6, 1.0);
          }
        `,
      }),
    [width, height],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime * timeScale
  })
  return (
    <group position={[0, height / 2 + 0.05, -3.2]}>
      <mesh material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {/* frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[width + 0.2, height + 0.2, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.9} />
      </mesh>
    </group>
  )
}
