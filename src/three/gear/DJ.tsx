import { useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three'

// The DJ booth set, modelled to the published dimensions (W × H × D):
//   Pioneer DJ CDJ-3000X  — 344.6 × 130.1 × 490.4 mm, 10.1" touchscreen
//   Pioneer DJ DJM-V10-LF — 437.6 × 107.9 × 467 mm, six channels, long faders
// The DJ stands on the −Z side of the booth, so controls face −Z.

const body = new MeshStandardMaterial({ color: '#151515', metalness: 0.45, roughness: 0.45 })
const panel = new MeshStandardMaterial({ color: '#0c0c0c', metalness: 0.3, roughness: 0.6 })
const knob = new MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.6, roughness: 0.35 })
const cap = new MeshStandardMaterial({ color: '#d6d6d6', metalness: 0.5, roughness: 0.3 })

/** A CDJ screen: a track waveform in the player's orange and blue. */
function useWaveformTexture(seed: number) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 144
    const g = c.getContext('2d')!
    g.fillStyle = '#05070b'
    g.fillRect(0, 0, 256, 144)
    for (let x = 0; x < 256; x += 2) {
      const h = (Math.abs(Math.sin(x * 0.11 + seed) * Math.cos(x * 0.031 + seed * 2)) * 0.8 + 0.2) * 34
      g.fillStyle = x < 120 ? '#f2a33a' : '#3d7bff'
      g.fillRect(x, 58 - h / 2, 1.6, h)
    }
    g.fillStyle = '#ff3b3b'
    g.fillRect(120, 30, 1.5, 56)
    g.fillStyle = '#e8e8e8'
    g.font = 'bold 22px sans-serif'
    g.fillText('124.0', 170, 128)
    g.fillStyle = '#3d7bff'
    g.fillRect(12, 104, 120, 4)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [seed])
}

export function CDJ3000X({ seed = 0 }: { seed?: number }) {
  const screen = useWaveformTexture(seed)
  const W = 0.345
  const D = 0.49
  return (
    <group>
      {/* deck, then the raised screen housing at the far end */}
      <mesh material={body} position={[0, 0.035, 0]}>
        <boxGeometry args={[W, 0.07, D]} />
      </mesh>
      <mesh material={body} position={[0, 0.095, 0.15]}>
        <boxGeometry args={[W, 0.07, 0.19]} />
      </mesh>
      {/* rotated in its own plane so the screen reads upright from the DJ's side */}
      <mesh position={[0, 0.131, 0.15]} rotation={[-Math.PI / 2 - 0.12, 0, Math.PI]}>
        <planeGeometry args={[0.223, 0.126]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* jog wheel */}
      <mesh material={panel} position={[0.012, 0.076, -0.07]}>
        <cylinderGeometry args={[0.1, 0.1, 0.012, 40]} />
      </mesh>
      <mesh material={knob} position={[0.012, 0.083, -0.07]}>
        <cylinderGeometry args={[0.075, 0.075, 0.004, 40]} />
      </mesh>
      <mesh position={[0.012, 0.086, -0.07]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.022, 0.03, 32]} />
        <meshBasicMaterial color="#e2483b" toneMapped={false} />
      </mesh>
      {/* cue and play/pause */}
      {[
        [-0.13, -0.15, '#f0a020'],
        [-0.13, -0.205, '#2fd36a'],
      ].map(([x, z, color]) => (
        <mesh key={color as string} position={[x as number, 0.072, z as number]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.014, 0.019, 24]} />
          <meshBasicMaterial color={color as string} toneMapped={false} />
        </mesh>
      ))}
      {/* tempo fader */}
      <mesh material={panel} position={[0.145, 0.071, -0.1]}>
        <boxGeometry args={[0.02, 0.003, 0.13]} />
      </mesh>
      <mesh material={cap} position={[0.145, 0.078, -0.1]}>
        <boxGeometry args={[0.025, 0.012, 0.012]} />
      </mesh>
    </group>
  )
}

export function DJMV10() {
  const W = 0.438
  const D = 0.467
  const channels = Array.from({ length: 6 }, (_, i) => -0.13 + i * 0.044)
  return (
    <group>
      <mesh material={body} position={[0, 0.054, 0]}>
        <boxGeometry args={[W, 0.108, D]} />
      </mesh>
      {channels.map((x, i) => (
        <group key={x} position={[x, 0.109, 0]}>
          {/* trim, compressor and four EQ bands, then filter */}
          {[0.19, 0.14, 0.1, 0.06, 0.02, -0.03].map((z) => (
            <mesh key={z} material={knob} position={[0, 0.006, z]}>
              <cylinderGeometry args={[0.009, 0.009, 0.012, 16]} />
            </mesh>
          ))}
          {/* level meter */}
          <mesh position={[-0.018, 0.001, 0.08]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.004, 0.12]} />
            <meshBasicMaterial color={i % 2 ? '#f0a020' : '#ffd060'} toneMapped={false} />
          </mesh>
          {/* long-throw fader */}
          <mesh material={panel} position={[0, 0.001, -0.15]}>
            <boxGeometry args={[0.006, 0.002, 0.09]} />
          </mesh>
          <mesh material={cap} position={[0, 0.008, -0.15 + ((i * 17) % 5) * 0.012]}>
            <boxGeometry args={[0.022, 0.012, 0.01]} />
          </mesh>
        </group>
      ))}
      {/* master isolator and FX section on the right */}
      {[0.16, 0.1, 0.04].map((z) => (
        <mesh key={z} material={knob} position={[0.155, 0.115, z]}>
          <cylinderGeometry args={[0.016, 0.016, 0.014, 20]} />
        </mesh>
      ))}
      <mesh position={[0.17, 0.11, -0.06]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.07, 0.05]} />
        <meshBasicMaterial color="#2a3c55" toneMapped={false} />
      </mesh>
      <mesh position={[0.17, 0.112, -0.17]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.012, 0.018, 24]} />
        <meshBasicMaterial color="#e2483b" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Two CDJ-3000X either side of a DJM-V10-LF, as set on the booth top. */
export function DJSet() {
  return (
    <group>
      <group position={[-0.41, 0, 0]}>
        <CDJ3000X seed={1} />
      </group>
      <DJMV10 />
      <group position={[0.41, 0, 0]}>
        <CDJ3000X seed={4} />
      </group>
    </group>
  )
}
