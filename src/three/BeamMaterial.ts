import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three'

// Soft volumetric light cone: bright at the lens, fading with distance,
// feathered at the silhouette so it reads like a beam cutting through haze.
export function createBeamMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: 0.6 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        // vUv.y = 1 at the lens, 0 at the far end of the cone
        float along = pow(vUv.y, 2.2);
        float facing = abs(dot(normalize(vNormal), normalize(-vViewPos)));
        float edge = pow(facing, 2.5);
        // slow drifting haze texture
        float haze = 0.85 + 0.15 * sin(vUv.y * 18.0 - uTime * 1.3 + vUv.x * 6.2831);
        float a = along * edge * haze * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  })
}
